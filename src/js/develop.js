/* Prusia — develop.js
 * El revelado digital: enfoque, desenfoque de lente y efectos.
 *
 * Todo lo de aquí ocurre ANTES de la conversión a negativo. Es decir: esto
 * decide qué foto entra en la cadena; engine.js decide qué tinta la imprime.
 * Por eso el enfoque se mide en luz lineal (escalar la luma y repartir el
 * factor entre los canales) y no en sRGB: en sRGB, aclarar un borde cambia
 * el color, y en un negativo cualquier cambio de color es un cambio de
 * densidad UV.
 *
 * Los radios NO se guardan en píxeles sino en fracción del ancho de imagen.
 * Así el preview a 900 px y la exportación a 2976 px dan lo mismo sin que
 * nadie tenga que reescalar nada a mano.
 *
 * Sin dependencias: convolución separable por sumas acumuladas (3 pasadas de
 * caja = gaussiana de sobra para un preview), todo en Float32.
 */
(function (P) {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smoothstep = (a, b, x) => {
    const t = clamp01((x - a) / (b - a || 1e-6));
    return t * t * (3 - 2 * t);
  };

  /* ------------------------------------------------------------ parámetros */
  /* Un único objeto plano: es lo que se guarda, se compara y se mezcla. */
  function defaults() {
    return {
      // Enfoque
      sharp: 0,        // 0..100 nitidez (radio pequeño)
      radius: 0.0016,  // radio del halo de nitidez, fracción del ancho
      threshold: 6,    // 0..40 umbral de ruido (0-255)
      structure: 0,    // 0..100 contraste local de detalle medio
      clarity: 0,      // 0..100 contraste local de detalle grande
      // Desenfoque de lente (profundidad de campo)
      lens: 0,         // 0..100
      lensTrans: 0.45, // 0..1 suavidad del borde del foco
      lensY: 0.5,      // centro del foco (0..1 del alto)
      lensSize: 0.42,  // radio del foco, fracción del alto
      lensBokeh: 0,    // 0..100 estallido de las luces desenfocadas
      // Efectos
      grain: 0,        // 0..100
      grainSize: 1,    // 0.4..3
      vignette: 0,     // -100..100 (negativo = esquinas más claras)
      vignetteMid: 50, // 0..100 tamaño del círculo limpio
      glow: 0,         // 0..100
      glowWarm: 0,     // -100..100
      tonal: 0,        // -100..100 contraste por bandas (global)
      shadows: 0,      // -100..100
      mids: 0,         // -100..100
      highs: 0,        // -100..100
      textura: 0,      // 0..100 irregularidad de la emulsión
      texturaTipo: 'pincel'
    };
  }

  const KEYS = Object.keys(defaults());
  const NEUTRAL = defaults();

  /** ¿hay algo que hacer? si no, la cadena no toca un solo píxel. */
  function isNeutral(p) {
    if (!p) return true;
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i];
      if (k === 'radius' || k === 'lensTrans' || k === 'lensY' || k === 'lensSize' ||
        k === 'grainSize' || k === 'vignetteMid' || k === 'texturaTipo') continue;
      if (Math.abs((p[k] == null ? 0 : p[k]) - (NEUTRAL[k] == null ? 0 : NEUTRAL[k])) > 1e-6) return false;
    }
    return true;
  }

  /** lo que de verdad hace falta calcular, en orden de coste creciente */
  function needs(p) {
    if (!p) return {};
    const a = (v) => (v || 0);
    return {
      focus: a(p.sharp) > 0 || a(p.structure) > 0 || a(p.clarity) > 0,
      lens: a(p.lens) > 0,
      grain: a(p.grain) > 0,
      vignette: a(p.vignette) !== 0,
      glow: a(p.glow) > 0,
      tonal: a(p.tonal) !== 0 || a(p.shadows) !== 0 || a(p.mids) !== 0 || a(p.highs) !== 0,
      textura: a(p.textura) > 0
    };
  }

  /* -------------------------------------------------------- planos de trabajo */
  /* Un solo buffer por tamaño: la luma y sus desenfoques se pisan entre sí
     porque cada operación termina leyendo lo que la anterior escribió. */
  let W = 0, H = 0;
  let lum = null, tmp = null, tmp2 = null, mask = null;

  function alloc(w, h) {
    if (w === W && h === H && lum) return;
    W = w; H = h;
    const n = w * h;
    lum = new Float32Array(n);
    tmp = new Float32Array(n);
    tmp2 = new Float32Array(n);
    mask = new Float32Array(n);
  }

  /* --------------------------------------------------------- caja separable */
  /* Una pasada de caja con sumas acumuladas: O(n), independiente del radio. */
  function boxH(src, dst, w, h, r) {
    if (r < 1) { dst.set(src); return; }
    const inv = 1 / (r * 2 + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      // arranque: borde replicado
      for (let i = -r; i <= r; i++) acc += src[row + (i < 0 ? 0 : i > w - 1 ? w - 1 : i)];
      for (let x = 0; x < w; x++) {
        dst[row + x] = acc * inv;
        const out = x - r < 0 ? 0 : x - r;
        const inn = x + r + 1 > w - 1 ? w - 1 : x + r + 1;
        acc += src[row + inn] - src[row + out];
      }
    }
  }
  function boxV(src, dst, w, h, r) {
    if (r < 1) { dst.set(src); return; }
    const inv = 1 / (r * 2 + 1);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[(i < 0 ? 0 : i > h - 1 ? h - 1 : i) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = acc * inv;
        const out = y - r < 0 ? 0 : y - r;
        const inn = y + r + 1 > h - 1 ? h - 1 : y + r + 1;
        acc += src[inn * w + x] - src[out * w + x];
      }
    }
  }
  /* Tres cajas ≈ gaussiana; el radio de caja necesario sale de la desviación
     que se quiere (ver Getreuer 2012, «A survey of Gaussian convolution
     algorithms»): r ≈ sqrt(12σ²/3 + 1)/2. */
  function blur(src, dst, w, h, sigma) {
    if (!sigma || sigma < 0.35) { dst.set(src); return; }
    const r = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
    boxH(src, tmp2, w, h, r);
    boxV(tmp2, dst, w, h, r);
  }

  /* ------------------------------------------------------------- luma / luz */
  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    LIN[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  const toSrgb = (v) => {
    v = clamp01(v);
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  /* --------------------------------------------------------------- enfoque */
  function applyFocus(d, w, h, p) {
    const n = w * h;
    const amp = (p.sharp || 0) / 100;
    const str = (p.structure || 0) / 100;
    const cla = (p.clarity || 0) / 100;
    if (!amp && !str && !cla) return;

    // luma lineal normalizada a 1 (el desenfoque tiene que ver con la luz)
    for (let i = 0; i < n; i++) {
      const q = i << 2;
      lum[i] = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
    }

    const thr = (p.threshold || 0) / 255;
    /* Acumula un alta frecuencia sobre lum. `radiusFrac` en fracción del ancho;
       `lo`/`hi` recortan la banda de luminancia en la que actúa (claridad).
       `knee` es relativo al nivel local: el tope de realce es una fracción de
       la luz que ya hay ahí, así un borde entre dos grises admite el mismo
       relieve que uno entre blanco y negro sin reventar a ninguno de los dos. */
    function hf(radiusFrac, amount, kneeRel, lo, hi) {
      const sigma = Math.max(0.4, radiusFrac * w);
      blur(lum, tmp, w, h, sigma);
      for (let i = 0; i < n; i++) {
        const base = lum[i];
        let dlt = base - tmp[i];
        const a = dlt < 0 ? -dlt : dlt;
        // umbral: por debajo del ruido no se toca nada (no amplifica grano)
        if (thr > 0) {
          if (a <= thr) continue;
          dlt = dlt > 0 ? a - thr : -(a - thr);
        }
        if (lo != null) {
          // peso por banda: fuera de [lo,hi] el efecto cae a cero
          const wgt = smoothstep(lo, lo + 0.12, base) * (1 - smoothstep(hi - 0.12, hi, base));
          if (wgt <= 0.001) continue;
          dlt *= wgt;
        }
        // rodilla suave: el realce no puede pasar de una fracción del nivel local
        const k = Math.max(0.004, kneeRel * (tmp[i] + 0.006));
        const ax = dlt < 0 ? -dlt : dlt;
        if (ax > k) dlt = (dlt > 0 ? 1 : -1) * (k + k * Math.tanh((ax - k) / k));
        lum[i] = base + dlt * amount;
      }
    }

    /* Orden deliberado: claridad (radio grande) → estructura → nitidez.
       Al revés, la nitidez se comería los halos que crea la claridad. */
    if (cla) hf(0.055, cla * 0.9, 0.85, 0.02, 0.92);
    if (str) hf(0.011, str * 1.35, 0.7, 0.01, 0.96);
    if (amp) hf(p.radius || 0.0016, amp * 1.8, 0.6, null, null);

    // vuelta a RGB por factor, sin tocar el color
    for (let i = 0; i < n; i++) {
      const q = i << 2;
      const base = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
      if (base < 1e-5) continue;
      const f = lum[i] / base;
      if (!isFinite(f) || f <= 0) continue;
      d[q] = toSrgb(LIN[d[q]] * f) * 255;
      d[q + 1] = toSrgb(LIN[d[q + 1]] * f) * 255;
      d[q + 2] = toSrgb(LIN[d[q + 2]] * f) * 255;
    }
  }

  /* ------------------------------------------------- desenfoque de lente */
  /* Un foco elíptico desplazable: dentro, la imagen tal cual; fuera, desenfoque
     con un borde suave. Las luces del fondo se «abren» un poco antes de
     desenfocarse (bokeh), que es lo que distingue un desenfoque de lente de
     un simple desenfoque gaussiano. */
  function applyLens(d, w, h, p) {
    const amount = (p.lens || 0) / 100;
    if (amount <= 0) return;
    const n = w * h;
    const sigma = Math.pow(amount, 1.35) * 0.028 * w;

    for (let i = 0; i < n; i++) {
      const q = i << 2;
      lum[i] = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
    }

    // bokeh: comprime las luces antes de desenfocar para que ganen cuerpo
    const bokeh = (p.lensBokeh || 0) / 100;
    if (bokeh > 0) {
      const g = 1 + bokeh * 1.6;
      for (let i = 0; i < n; i++) tmp[i] = Math.pow(lum[i], 1 / g);
    } else {
      tmp.set(lum);
    }
    blur(tmp, tmp2, w, h, sigma);
    if (bokeh > 0) {
      const g = 1 + bokeh * 1.6;
      for (let i = 0; i < n; i++) tmp2[i] = Math.pow(clamp01(tmp2[i]), g);
    }

    // máscara del foco: 0 = nítido dentro, 1 = desenfocado fuera
    const cy = (p.lensY == null ? 0.5 : p.lensY) * h;
    const rx = Math.max(0.06, (p.lensSize == null ? 0.42 : p.lensSize) * h * 1.55);
    const ry = Math.max(0.06, (p.lensSize == null ? 0.42 : p.lensSize) * h);
    const t = Math.max(0.04, (p.lensTrans == null ? 0.45 : p.lensTrans)) * 0.9;
    const cx = w * 0.5;
    for (let y = 0; y < h; y++) {
      const dy = (y - cy) / ry;
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / rx;
        const dist = Math.sqrt(dx * dx + dy * dy);
        mask[y * w + x] = smoothstep(1 - t, 1 + t, dist);
      }
    }

    for (let i = 0; i < n; i++) {
      const m = mask[i];
      if (m <= 0.0005) continue;
      const base = lum[i];
      const blurred = tmp2[i];
      const target = base + (blurred - base) * m;
      const q = i << 2;
      if (base < 1e-5) {
        d[q] = toSrgb(target) * 255;
        d[q + 1] = toSrgb(target) * 255;
        d[q + 2] = toSrgb(target) * 255;
        continue;
      }
      const f = target / base;
      d[q] = toSrgb(LIN[d[q]] * f) * 255;
      d[q + 1] = toSrgb(LIN[d[q + 1]] * f) * 255;
      d[q + 2] = toSrgb(LIN[d[q + 2]] * f) * 255;
    }
  }

  /* --------------------------------------------------------------- efectos */
  /* Ruido de valor reproducible: la misma foto da el mismo grano siempre.
     Semilla fija para que exportar no cambie la imagen respecto al preview. */
  function makeNoise(size, seed) {
    const n = size * size;
    const out = new Float32Array(n);
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n; i++) out[i] = rnd();
    return out;
  }
  const noiseCache = {};
  function noiseFor(cell, seed) {
    const key = cell + ':' + seed;
    if (noiseCache[key]) return noiseCache[key];
    const size = 128;
    const base = makeNoise(size, seed);
    const out = new Float32Array(size * size);
    // dos octavas de ruido de valor con paso `cell`
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0, wsum = 0;
        for (let o = 0; o < 2; o++) {
          const step = Math.max(1, Math.round(cell * (o ? 1 : 2.6)));
          const xf = x / step, yf = y / step;
          const x0 = Math.floor(xf), y0 = Math.floor(yf);
          const fx = xf - x0, fy = yf - y0;
          const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const at = (px, py) => base[((py % size + size) % size) * size + ((px % size + size) % size)];
          const v0 = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
          const v1 = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
          const wgt = o ? 0.45 : 1;
          v += (v0 * (1 - sy) + v1 * sy) * wgt;
          wsum += wgt;
        }
        out[y * size + x] = v / wsum; // 0..1
      }
    }
    noiseCache[key] = { data: out, size: size };
    return noiseCache[key];
  }

  function applyGrain(d, w, h, p) {
    const amt = (p.grain || 0) / 100;
    if (amt <= 0) return;
    const cell = Math.max(1, Math.round(1.6 * (p.grainSize || 1)));
    const nz = noiseFor(cell, 0x5eed);
    const N = nz.size;
    const amp = amt * 0.055;
    for (let y = 0; y < h; y++) {
      const row = (y & (N - 1)) * N;
      for (let x = 0; x < w; x++) {
        const n = nz.data[row + (x & (N - 1))] - 0.5;
        // el grano muerde en medios y sombras, no en el blanco del papel
        const i = y * w + x;
        const q = i << 2;
        const y0 = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
        const weight = Math.sqrt(y0) * (1 - 0.45 * y0);
        const f = 1 + n * amp * 2 * weight;
        if (f === 1) continue;
        d[q] = toSrgb(LIN[d[q]] * f) * 255;
        d[q + 1] = toSrgb(LIN[d[q + 1]] * f) * 255;
        d[q + 2] = toSrgb(LIN[d[q + 2]] * f) * 255;
      }
    }
  }

  function applyVignette(d, w, h, p) {
    const amt = (p.vignette || 0) / 100;
    if (amt === 0) return;
    const mid = (p.vignetteMid == null ? 50 : p.vignetteMid) / 100;
    const cx = w / 2, cy = h / 2;
    const rmax = Math.sqrt(cx * cx + cy * cy);
    const inner = 0.25 + mid * 0.95;
    for (let y = 0; y < h; y++) {
      const dy = (y - cy) / rmax;
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / rmax;
        // elipse suavizada: en un negativo 4:3 el círculo puro recorta de más
        const dist = Math.sqrt(dx * dx * 0.82 + dy * dy * 1.12) * 1.35;
        const t = smoothstep(inner, 1.15, dist);
        if (t <= 0) continue;
        const f = 1 - t * amt * 0.92;
        if (f <= 0.02) continue;
        const i = y * w + x;
        const q = i << 2;
        d[q] = toSrgb(LIN[d[q]] * f) * 255;
        d[q + 1] = toSrgb(LIN[d[q + 1]] * f) * 255;
        d[q + 2] = toSrgb(LIN[d[q + 2]] * f) * 255;
      }
    }
  }

  function applyGlow(d, w, h, p) {
    const amt = (p.glow || 0) / 100;
    if (amt <= 0) return;
    const warm = (p.glowWarm || 0) / 100;
    const n = w * h;
    for (let i = 0; i < n; i++) {
      const q = i << 2;
      lum[i] = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
    }
    blur(lum, tmp, w, h, Math.max(0.8, 0.014 * w));
    for (let i = 0; i < n; i++) {
      const q = i << 2;
      const base = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
      if (base < 1e-5) continue;
      // «screen»: ilumina sin velar del todo, como una difusión óptica.
      // Se mezcla en luma y se aplica como FACTOR: f es un cociente, no un valor.
      const scr = 1 - (1 - clamp01(base)) * (1 - clamp01(tmp[i]) * 0.85);
      const f = 1 + ((scr - base) / base) * amt;
      if (!isFinite(f) || f <= 0) continue;
      let r = LIN[d[q]] * f, g = LIN[d[q + 1]] * f, b = LIN[d[q + 2]] * f;
      if (warm) {
        r *= 1 + warm * 0.18;
        b *= 1 - warm * 0.16;
      }
      d[q] = toSrgb(r) * 255;
      d[q + 1] = toSrgb(g) * 255;
      d[q + 2] = toSrgb(b) * 255;
    }
  }

  /* Contraste por bandas: es el viejo truco del positivado enmascarado, pero
     por separado en sombras, medios y luces. En cianotipo es exactamente lo
     que se hace con dos exposiciones. */
  function toneBand(v, amount) {
    if (!amount) return v;
    const s = Math.tanh(v * 2.4) / Math.tanh(2.4);
    return clamp01(v + (s - v) * amount);
  }

  function applyTonal(d, w, h, p) {
    const g = (p.tonal || 0) / 100;
    const vs = (p.shadows || 0) / 100;
    const vm = (p.mids || 0) / 100;
    const vh = (p.highs || 0) / 100;
    if (!g && !vs && !vm && !vh) return;
    // densidad de banda por luminancia lineal
    const band = (y0) => {
      const sh = 1 - smoothstep(0.02, 0.16, y0);
      const hi = smoothstep(0.34, 0.78, y0);
      const mid = Math.max(0, 1 - sh - hi);
      return sh * vs + mid * vm + hi * vh;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const q = i << 2;
        // el contraste tonal trabaja en sRGB (es donde el ojo ve el contraste)
        let r = d[q] / 255, gg = d[q + 1] / 255, b = d[q + 2] / 255;
        const y0 = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
        const k = band(y0) + g * 0.6;
        if (Math.abs(k) < 0.002) continue;
        const ysrgb = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        const ny = toneBand(ysrgb, k);
        const f = ysrgb > 1e-4 ? ny / ysrgb : 1;
        d[q] = clamp01(r * f) * 255;
        d[q + 1] = clamp01(gg * f) * 255;
        d[q + 2] = clamp01(b * f) * 255;
      }
    }
  }

  /* Emulsión irregular: una cianotipia nunca se revela igual en toda la hoja.
     Esto mete esa falta de uniformidad en la imagen, no en el papel, así que
     viaja con el negativo y se imprime de verdad. */
  function applyTextura(d, w, h, p) {
    const amt = (p.textura || 0) / 100;
    if (amt <= 0) return;
    const tipo = p.texturaTipo || 'pincel';
    const cell = tipo === 'fibra' ? 2 : tipo === 'mancha' ? 9 : 4;
    const nz = noiseFor(cell, tipo === 'fibra' ? 0x11c : tipo === 'mancha' ? 0x77 : 0x3ab);
    const N = nz.size;
    // el pincel va en horizontal: estira el ruido en X para que parezca pasada
    const stretch = tipo === 'pincel' ? 3 : 1;
    const scale = Math.max(0.35, 0.9 * (N / 128) * (tipo === 'mancha' ? 3 : 1));
    const amp = amt * 0.16;
    for (let y = 0; y < h; y++) {
      const sy = ((y / scale) | 0) & (N - 1);
      const row = sy * N;
      for (let x = 0; x < w; x++) {
        const sx = (((x / (scale * stretch)) | 0)) & (N - 1);
        const n = nz.data[row + sx] - 0.5;
        const i = y * w + x;
        const q = i << 2;
        const f = 1 + n * amp * 2;
        d[q] = toSrgb(LIN[d[q]] * f) * 255;
        d[q + 1] = toSrgb(LIN[d[q + 1]] * f) * 255;
        d[q + 2] = toSrgb(LIN[d[q + 2]] * f) * 255;
      }
    }
  }

  /* ------------------------------------------------------------- la cadena */
  /* Orden: enfoque → desenfoque de lente → textura → contraste tonal →
     viñeta → brillo → grano. El grano va al final para no comerse el detalle
     recién creado, y la viñeta antes del grano para no amplificar el ruido de
     las esquinas. */
  function apply(data, w, h, p) {
    if (!p || isNeutral(p)) return data;
    alloc(w, h);
    const q = needs(p);
    if (q.focus) applyFocus(data, w, h, p);
    if (q.lens) applyLens(data, w, h, p);
    if (q.textura) applyTextura(data, w, h, p);
    if (q.tonal) applyTonal(data, w, h, p);
    if (q.vignette) applyVignette(data, w, h, p);
    if (q.glow) applyGlow(data, w, h, p);
    if (q.grain) applyGrain(data, w, h, p);
    return data;
  }

  /** Procesa un canvas/bitmap entero y devuelve otro canvas. */
  function processCanvas(src, w, h, p) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    if (!p || isNeutral(p)) return c;
    const img = g.getImageData(0, 0, c.width, c.height);
    apply(img.data, c.width, c.height, p);
    g.putImageData(img, 0, 0);
    return c;
  }

  /* --------------------------------------------------------------- estilos */
  /* Un estilo no es un filtro: es un juego de números del revelado. La
     intensidad lo mezcla con el neutro, así nunca hay saltos. */
  function blend(base, over, strength) {
    const out = {};
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i];
      const a = base[k] == null ? 0 : base[k];
      const b = over[k] == null ? a : over[k];
      out[k] = typeof a === 'number' ? a + (b - a) * strength : (strength > 0.5 ? b : a);
    }
    return out;
  }

  P.develop = {
    DEFAULTS: NEUTRAL, defaults: defaults, isNeutral: isNeutral, needs: needs,
    apply: apply, processCanvas: processCanvas, blend: blend,
    toSrgb: toSrgb
  };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
