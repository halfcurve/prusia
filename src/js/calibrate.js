/* Prusia — calibrate.js
 * Medición de la tira de pasos y extracción de la curva de respuesta.
 *
 * Algoritmo: muestreo con mediana en el canal rojo (donde absorbe el azul de
 * Prusia) → densidad → regresión isotónica (PAVA) para imponer monotonía →
 * spline de Fritsch–Carlson (sin sobreoscilación) → perfil.
 */
(function (P) {
  'use strict';
  const S = P.sci;

  /* ---------- proyección cuadrado unidad → cuadrilátero ---------- */
  function unitToQuad(q) {
    const p0 = q[0], p1 = q[1], p2 = q[2], p3 = q[3];
    const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0];
    const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1];
    const sx = p0[0] - p1[0] + p2[0] - p3[0];
    const sy = p0[1] - p1[1] + p2[1] - p3[1];
    const den = dx1 * dy2 - dx2 * dy1;
    let g = 0, h = 0;
    if (Math.abs(den) > 1e-9) {
      g = (sx * dy2 - dx2 * sy) / den;
      h = (dx1 * sy - sx * dy1) / den;
    }
    const a = p1[0] - p0[0] + g * p1[0];
    const b = p3[0] - p0[0] + h * p3[0];
    const d = p1[1] - p0[1] + g * p1[1];
    const e = p3[1] - p0[1] + h * p3[1];
    return function (u, v) {
      const w = g * u + h * v + 1 || 1e-6;
      return [(a * u + b * v + p0[0]) / w, (d * u + e * v + p0[1]) / w];
    };
  }

  /* ---------- muestreo de la tira ---------- */
  /* data: ImageData de la foto · quad: 4 esquinas [x,y] del rectángulo de la
     tira · n: número de pasos. Devuelve valores de reflectancia en canal rojo. */
  function sampleStrip(data, quad, n) {
    n = n || 21;
    const W = data.width, H = data.height, px = data.data;
    const map = unitToQuad(quad);
    const out = [];
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const vals = [];
      let rs = 0, gs = 0, bs = 0, cnt = 0;
      for (let sv = 0; sv < 5; sv++) {
        const v = 0.22 + (sv / 4) * 0.56;   // centro del parche, sin bordes
        for (let su = 0; su < 5; su++) {
          const u = u0 + (0.22 + (su / 4) * 0.56) * (u1 - u0);
          const p = map(u, v);
          const x = Math.max(0, Math.min(W - 1, Math.round(p[0])));
          const y = Math.max(0, Math.min(H - 1, Math.round(p[1])));
          const k = (y * W + x) << 2;
          vals.push(px[k]);
          rs += px[k]; gs += px[k + 1]; bs += px[k + 2]; cnt++;
        }
      }
      vals.sort((a, b) => a - b);
      const med = vals[vals.length >> 1];
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const varr = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vals.length;
      out.push({
        i: i, u: i / (n - 1),
        R: S.srgbDecode(med / 255),
        rgb: [rs / cnt, gs / cnt, bs / cnt],
        spread: Math.sqrt(varr)
      });
    }
    return out;
  }

  /* ---------- PAVA: regresión isotónica (monótona creciente) ---------- */
  function pava(values) {
    const n = values.length;
    const blocks = [];
    for (let i = 0; i < n; i++) {
      blocks.push({ s: values[i], c: 1 });
      while (blocks.length > 1) {
        const b1 = blocks[blocks.length - 2], b2 = blocks[blocks.length - 1];
        if (b1.s / b1.c <= b2.s / b2.c) break;
        blocks.pop();
        b1.s += b2.s;
        b1.c += b2.c;
      }
    }
    const out = [];
    for (let b = 0; b < blocks.length; b++) {
      const v = blocks[b].s / blocks[b].c;
      for (let j = 0; j < blocks[b].c; j++) out.push(v);
    }
    return out;
  }

  /* ---------- análisis ---------- */
  /* samples: salida de sampleStrip. Devuelve la curva medida y diagnósticos. */
  function analyze(samples) {
    const n = samples.length;
    const Rs = samples.map((s) => s.R);
    const rWhite = Math.max(...Rs);       // paso más claro = papel
    const rDark = Math.min(...Rs);        // paso más oscuro = azul pleno
    const eps = 1e-4;
    // densidad de reflexión relativa
    const D = Rs.map((r) => -Math.log10(Math.max(r, eps) / Math.max(rWhite, eps)));
    const dMax = Math.max(...D);
    const dMin = Math.min(...D);
    const span = Math.max(1e-4, dMax - dMin);

    // respuesta: x = exposición normalizada (0 = tinta plena, 1 = film limpio),
    // y = fracción de azul. Se ordena de x=0 a x=1 para que ambas crezcan.
    let xs = samples.map((s) => 1 - s.u).reverse();
    let ysRaw = D.map((d) => (d - dMin) / span).reverse();
    // si la tira se ha medido del revés (foto girada o esquinas cruzadas),
    // la serie sale decreciente: se da la vuelta en vez de fallar.
    if (ysRaw[0] > ysRaw[ysRaw.length - 1] + 0.15) {
      xs = xs.slice().reverse();
      ysRaw = ysRaw.slice().reverse();
    }
    // imponer monotonía creciente con PAVA
    const ys = pava(ysRaw);

    // ruido por parche (antes de fijar umbrales: con tiras finas manda él)
    const noise = samples.reduce((a, s) => a + s.spread, 0) / n;

    // mesetas: diferencias nulas sobre un tramo largo = sobreexposición.
    // Los extremos saturados (tinta plena, film limpio) son normales y no
    // cuentan. El umbral escala con los pasos: con 101, dos parches seguidos
    // distan cinco veces menos que con 21.
    const edge = Math.max(2, Math.round(n * 0.06));
    const inner = [];
    for (let i = edge; i < n - edge; i++) inner.push(ysRaw[i] - ysRaw[i - 1]);
    inner.sort((a, b) => a - b);
    const best = inner.length ? inner[inner.length - 1] : 0;
    // un paso es meseta si avanza menos del 2 % de lo que avanza el paso más
    // vivo de la tira: el umbral vale igual para 21 pasos que para 101.
    const plateauEps = Math.max(1e-4, best * 0.02);
    let plateau = 0, run = 0;
    for (let i = edge; i < n - edge; i++) {
      if (ysRaw[i] - ysRaw[i - 1] < plateauEps) { run++; if (run > plateau) plateau = run; } else run = 0;
    }
    // una inversión menor que el propio ruido no es una inversión
    const invThresh = Math.max(0.012, noise / 255);
    const inversions = ysRaw.reduce((acc, v, i) => acc + (i > 0 && v < ysRaw[i - 1] - invThresh ? 1 : 0), 0);

    // contraste: pendiente media de la zona central
    const mid = ys[Math.round(n / 2)] - ys[Math.round(n / 4)];
    const warnings = [];
    if (ys[0] > 0.08) warnings.push({ level: 'warn', text: 'El paso más denso no llega a papel blanco: falta exposición o densidad de tinta.' });
    if (ys[n - 1] < 0.9) warnings.push({ level: 'warn', text: 'El paso transparente no llega a azul pleno: sube el tiempo de exposición.' });
    // si lo que separa un parche del siguiente es menos que el ruido de la
    // propia foto, la tira es ilegible por fina, no por sobreexpuesta
    const unreadable = best < Math.max(0.004, noise / 255 * 0.8);
    if (unreadable) {
      warnings.push({ level: 'warn', text: n > 21
        ? 'No distingo un paso del siguiente: ni la mejor foto da para ' + n + ' parches. Escanéala o baja a 21 pasos.'
        : 'No distingo un paso del siguiente: repite la foto con luz plana y la tira llenando el encuadre.' });
    } else if (plateau >= Math.max(4, Math.round((n - 2 * edge) * 0.5))) {
      warnings.push({ level: 'bad', text: 'La tira está plana en ' + plateau + ' pasos: la copia está sobreexpuesta. Baja el tiempo y repite.' });
    }
    if (inversions > 1) warnings.push({ level: 'bad', text: 'La densidad no baja de forma monótona: la foto tiene reflejos o el film está manchado.' });
    if (noise > 9) warnings.push({ level: 'warn', text: 'Los parches están sucios (ruido ' + noise.toFixed(0) + '): repite la foto con luz plana.' });
    if (rDark > 250) warnings.push({ level: 'bad', text: 'La copia sale casi blanca: algo falló en la exposición.' });

    return {
      xs: xs, ys: ys, ysRaw: ysRaw,
      dMax: dMax, dMin: dMin,
      noise: noise, plateau: plateau, inversions: inversions,
      contrast: mid,
      warnings: warnings,
      range: dMax - dMin
    };
  }

  /* Perfil aplicable por el motor */
  function makeProfile(analysis, meta) {
    // recortamos a los tramos útiles (evita extrapolar fuera de lo medido)
    const xs = [], ys = [];
    for (let i = 0; i < analysis.xs.length; i++) {
      xs.push(analysis.xs[i]);
      ys.push(Math.min(1, Math.max(0, analysis.ys[i])));
    }
    // asegurar extremos
    if (xs[0] > 0) { xs.unshift(0); ys.unshift(ys[0]); }
    if (xs[xs.length - 1] < 1) { xs.push(1); ys.push(ys[ys.length - 1]); }
    return {
      id: 'p' + Date.now().toString(36),
      name: (meta && meta.name) || 'Perfil sin nombre',
      date: new Date().toISOString(),
      xs: xs, ys: ys,
      dmaxSupport: meta && meta.dmaxSupport,
      chem: meta && meta.chem,
      ink: meta && meta.ink,
      support: meta && meta.support,
      exposure: meta && meta.exposure,
      warn: analysis.warnings.length
    };
  }

  P.calib = {
    unitToQuad: unitToQuad, sampleStrip: sampleStrip, analyze: analyze,
    makeProfile: makeProfile, pava: pava
  };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
