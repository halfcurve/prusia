/* Prusia — sci.js
 * Colorimetría y modelo de pigmento.
 *
 * El corazón del simulador: un pigmento se describe por sus bandas de absorción
 * (Beer–Lambert), la luz lo atraviesa, y el resultado se ve sobre el papel. Todo
 * se colapsa en una LUT 1D (concentración → sRGB) para que el preview sea
 * interactivo: por píxel solo hay una lectura de tabla.
 */
(function (P) {
  'use strict';

  /* ---------- espectro ---------- */
  const L_MIN = 380, L_MAX = 730, L_STEP = 5;
  const LAM = [];
  for (let l = L_MIN; l <= L_MAX; l += L_STEP) LAM.push(l);
  const NL = LAM.length;

  function lobe(x, mu, s1, s2) {
    const s = x < mu ? s1 : s2;
    const t = (x - mu) / s;
    return Math.exp(-0.5 * t * t);
  }

  /* CIE 1931 2° — aproximación multilóbulo de Wyman, Sloan & Shirley (2013).
     Error < 1 % frente a las tablas oficiales; suficiente para previsualizar. */
  const CX = [], CY = [], CZ = [];
  let XW = 0, YW = 0, ZW = 0;
  for (let i = 0; i < NL; i++) {
    const l = LAM[i];
    const x = 1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2);
    const y = 0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1);
    const z = 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8);
    CX.push(x); CY.push(y); CZ.push(z);
    XW += x; YW += y; ZW += z;
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function srgbEncode(v) {
    v = clamp01(v);
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  }
  function srgbDecode(v) {
    v = clamp01(v);
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  /* XYZ (normalizado al blanco del iluminante) → sRGB lineal, matriz D65.
     El blanco del iluminante E no es el de la matriz, así que se normaliza
     por el resultado del propio blanco: así c=0 sale (1,1,1) exacto. */
  const WHITE_LIN = [
    3.2406 - 1.5372 - 0.4986,
    -0.9689 + 1.8758 + 0.0415,
    0.0557 - 0.2040 + 1.0570
  ];
  function xyzToLinearSrgb(x, y, z, out) {
    out[0] = (3.2406 * x - 1.5372 * y - 0.4986 * z) / WHITE_LIN[0];
    out[1] = (-0.9689 * x + 1.8758 * y + 0.0415 * z) / WHITE_LIN[1];
    out[2] = (0.0557 * x - 0.2040 * y + 1.0570 * z) / WHITE_LIN[2];
    return out;
  }

  /* ---------- Lab con blanco = papel (L*100, a*0, b*0) ---------- */
  const D65X = 0.95047, D65Z = 1.08883;
  function linToLab(r, g, b, out) {
    const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / D65X;
    const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b);
    const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / D65Z;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    out[0] = 116 * fy - 16;
    out[1] = 500 * (fx - fy);
    out[2] = 200 * (fy - fz);
    return out;
  }
  function labToLin(L, a, bb, out) {
    const fy = (L + 16) / 116;
    const fx = fy + a / 500;
    const fz = fy - bb / 200;
    const g = (t) => (t > 6 / 29 ? t * t * t : 3 * (6 / 29) * (6 / 29) * (t - 4 / 29));
    const X = g(fx) * D65X, Y = g(fy), Z = g(fz) * D65Z;
    out[0] = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
    out[1] = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
    out[2] = 0.0557 * X - 0.2040 * Y - 1.0570 * Z;
    out[2] = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
    return out;
  }
  const _lab = [0, 0, 0], _lin = [0, 0, 0];
  const inGamut = (c) => c[0] >= -1e-4 && c[0] <= 1 + 1e-4 && c[1] >= -1e-4 && c[1] <= 1 + 1e-4 && c[2] >= -1e-4 && c[2] <= 1 + 1e-4;

  /* Si el color se sale de sRGB, baja el croma conservando L*: es lo que hace
     un buen perfil de pantalla y evita que un azul muy saturado se "aclare"
     al recortar canales. */
  function gamutMap(lin, out) {
    if (inGamut(lin)) {
      out[0] = clamp01(lin[0]); out[1] = clamp01(lin[1]); out[2] = clamp01(lin[2]);
      return out;
    }
    linToLab(lin[0], lin[1], lin[2], _lab);
    const L = clamp(_lab[0], 0, 100), a = _lab[1], b = _lab[2];
    let lo = 0, hi = 1;
    for (let it = 0; it < 14; it++) {
      const mid = (lo + hi) / 2;
      labToLin(L, a * mid, b * mid, _lin);
      if (inGamut(_lin)) lo = mid; else hi = mid;
    }
    labToLin(L, a * lo, b * lo, out);
    out[0] = clamp01(out[0]); out[1] = clamp01(out[1]); out[2] = clamp01(out[2]);
    return out;
  }

  /* Densidad óptica (log10) de una transmitancia espectral */
  function spectralDensity(T) {
    let Y = 0;
    for (let i = 0; i < NL; i++) Y += T[i] * CY[i];
    return -Math.log10(Math.max(Y / YW, 1e-6));
  }

  /* ---------- bandas de absorción ---------- */
  // Cada banda: { mu (nm), w (nm, desviación), a (peso relativo) }
  const BANDS = {
    /* Azul de Prusia (Fe4[Fe(CN)6]3): absorbe con fuerza el rojo (~700 nm) y
       también el violeta (~430 nm); deja pasar el azul-verde. Por eso las
       densidades medias salen cian-turquesa y las altas caen a azul marino. */
    prusia: [
      { mu: 672, w: 45, a: 1.0 },
      { mu: 580, w: 80, a: 0.64 },
      { mu: 432, w: 65, a: 0.30 }
    ],
    /* Absorciones de virados (aproximaciones de color, no espectros medidos) */
    tanino: [
      { mu: 620, w: 130, a: 0.62 },
      { mu: 452, w: 96, a: 0.46 },
      { mu: 700, w: 70, a: 0.14 }
    ],
    te: [
      { mu: 456, w: 92, a: 0.72 },
      { mu: 660, w: 110, a: 0.30 }
    ],
    cafe: [
      { mu: 448, w: 84, a: 0.66 },
      { mu: 690, w: 120, a: 0.26 },
      { mu: 560, w: 70, a: 0.10 }
    ],
    pirogalol: [
      { mu: 470, w: 150, a: 0.30 },
      { mu: 640, w: 150, a: 0.30 },
      { mu: 700, w: 90, a: 0.16 }
    ],
    /* Desplazamiento hacia verde-oliva de un virado con hierro (verde
       de Prusia / bruñido): el pigmento pierde rojo y gana verde. */
    verdoso: [
      { mu: 640, w: 80, a: 0.86 },
      { mu: 470, w: 60, a: 0.10 }
    ]
  };

  function bandsShape(bands, l) {
    let k = 0;
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      const t = (l - b.mu) / b.w;
      k += b.a * Math.exp(-0.5 * t * t);
    }
    return k;
  }

  function shapeArray(bands) {
    const k = new Float64Array(NL);
    for (let i = 0; i < NL; i++) k[i] = bandsShape(bands, LAM[i]);
    return k;
  }

  /* Cadena completa: concentración → color percibido. */
  const _tmpLin = [0, 0, 0];
  function renderConcentration(shapes, scales, concs, c, outLin) {
    let X = 0, Y = 0, Z = 0;
    for (let i = 0; i < NL; i++) {
      let a = 0;
      for (let p = 0; p < shapes.length; p++) a += scales[p] * shapes[p][i] * concs[p];
      const t = Math.exp(-a * c);
      X += t * CX[i]; Y += t * CY[i]; Z += t * CZ[i];
    }
    xyzToLinearSrgb(X / XW, Y / YW, Z / ZW, outLin);
    gamutMap(outLin, outLin);
    return outLin;
  }
  function displayY(lin) {
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  /* Escala la forma de absorción para que a concentración 1 la densidad
     percibida sea exactamente `dmax` (log10). Bisección sobre la cadena real,
     porque la adaptación al blanco y el recorte de gama mueven la luminancia. */
  function scaleForDmax(shape, dmax) {
    const shapes = [shape], concs = [1], scales = [1];
    const evalD = (s) => {
      scales[0] = s;
      renderConcentration(shapes, scales, concs, 1, _tmpLin);
      return -Math.log10(Math.max(displayY(_tmpLin), 1e-7));
    };
    let lo = 0, hi = 1;
    while (evalD(hi) < dmax && hi < 1e4) hi *= 2;
    for (let it = 0; it < 44; it++) {
      const mid = (lo + hi) / 2;
      if (evalD(mid) < dmax) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ---------- LUT de pigmento ---------- */
  /* Devuelve { rgb: Uint8ClampedArray(N*3), dens: Float32Array(N) }.
     rgb[c] es el color que se ve sobre papel blanco a concentración c∈[0,1];
     dens[c] su densidad de reflexión en log10 (luminancia percibida). */
  function buildLut(pigments, dmax, steps) {
    steps = steps || 1024;
    const shapes = [], scales = [], concs = [];
    for (let p = 0; p < pigments.length; p++) {
      const g = pigments[p];
      const shape = shapeArray(g.bands);
      shapes.push(shape);
      concs.push(g.conc);
      scales.push(scaleForDmax(shape, g.dmax || dmax));
    }
    const rgb = new Uint8ClampedArray(steps * 3);
    const dens = new Float32Array(steps);
    const lin = [0, 0, 0];
    for (let s = 0; s < steps; s++) {
      const c = s / (steps - 1);
      renderConcentration(shapes, scales, concs, c, lin);
      const Y = displayY(lin);
      dens[s] = -Math.log10(Math.max(Y, 1e-7));
      rgb[s * 3] = Math.round(255 * srgbEncode(lin[0]));
      rgb[s * 3 + 1] = Math.round(255 * srgbEncode(lin[1]));
      rgb[s * 3 + 2] = Math.round(255 * srgbEncode(lin[2]));
    }
    return { rgb: rgb, dens: dens, steps: steps };
  }

  /* Muestreo de una LUT con interpolación lineal */
  function sampleLut(lut, c, out) {
    const n = lut.steps - 1;
    let x = c * n;
    if (x < 0) x = 0; else if (x > n) x = n;
    const i = x | 0;
    const f = x - i;
    const a = i * 3, b = (i < n ? i + 1 : n) * 3;
    const r = lut.rgb;
    out[0] = r[a] + (r[b] - r[a]) * f;
    out[1] = r[a + 1] + (r[b + 1] - r[a + 1]) * f;
    out[2] = r[a + 2] + (r[b + 2] - r[a + 2]) * f;
    return out;
  }

  function hexOf(rgb) {
    const h = (v) => ('0' + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2);
    return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
  }

  /* ---------- papel ---------- */
  const PAPER = {
    blanco:   { name: 'Papel blanco', r: 250, g: 249, b: 246 },
    marfil:   { name: 'Marfil', r: 246, g: 241, b: 229 },
    crema:    { name: 'Crema cálida', r: 240, g: 230, b: 210 },
    algodon:  { name: 'Algodón sin ácido', r: 249, g: 246, b: 238 },
    gris:     { name: 'Gris perla', r: 228, g: 228, b: 226 }
  };

  /* ---------- virados ---------- */
  /* Se aplican en Lab sobre la rampa ya construida: rotación de tono, cambio
     de croma y de luminosidad, con las direcciones del informe
     (research/cyanotype-science.md §5). `h` = ángulo de tono objetivo en Lab. */
  const TONER = {
    ninguno:   { name: 'Sin virado', h: null },
    tanino:    { name: 'Ácido tánico (marrón púrpura)', h: 42, chroma: 0.55, light: -0.10, reach: 1 },
    te:        { name: 'Té negro (sepia)', h: 54, chroma: 0.42, light: -0.04, reach: 1 },
    cafe:      { name: 'Café (marrón frío)', h: 26, chroma: 0.22, light: -0.03, reach: 1 },
    pirogalol: { name: 'Pirogalol (marrón rojizo)', h: 30, chroma: 0.30, light: -0.05, reach: 1 },
    niquel:    { name: 'Sulfato de níquel (verde azulado)', h: 212, chroma: -0.25, light: 0.02, reach: 1 },
    dorado:    { name: 'Fosfato trisódico (dorado)', h: 90, chroma: 0.35, light: 0.30, reach: 1 },
    blanqueo:  { name: 'Carbonato (blanqueado)', h: 92, chroma: -0.35, light: 0.42, reach: 1 }
  };

  function applyToner(rgb, dens, steps, tonerId, amount) {
    const t = TONER[tonerId] || TONER.ninguno;
    if (!t.h || amount <= 0) return { rgb: rgb, dens: dens, steps: steps };
    const out = new Uint8ClampedArray(steps * 3);
    const lin = [0, 0, 0], lab = [0, 0, 0];
    const k = Math.max(0, Math.min(1, amount));
    for (let s = 0; s < steps; s++) {
      const r = rgb[s * 3] / 255, g = rgb[s * 3 + 1] / 255, b = rgb[s * 3 + 2] / 255;
      lin[0] = srgbDecode(r); lin[1] = srgbDecode(g); lin[2] = srgbDecode(b);
      linToLab(lin[0], lin[1], lin[2], lab);
      const L = lab[0], a = lab[1], bb = lab[2];
      const C = Math.hypot(a, bb);
      // cuánto pesa el virado en este nivel: manda el pigmento presente
      // el virado sólo alcanza al pigmento: en el blanco del papel no hay nada
      // que virar, así que el peso cae a cero por debajo de ~0,2 de densidad.
      const w = k * Math.min(1, C / 8) * Math.min(1, Math.pow(Math.max(0, dens[s]) / 0.6, 1.2));
      if (w > 1e-4) {
        // mezcla lineal en a*b* (no rotación de tono: pasar por el neutro es
        // lo que hace un virado químico, y evita verdes/magentas de paso)
        const Ct = Math.max(0, C * (1 + t.chroma));
        const hr = (t.h * Math.PI) / 180;
        const at = Ct * Math.cos(hr), bt = Ct * Math.sin(hr);
        const a1 = a + (at - a) * w;
        const b1 = bb + (bt - bb) * w;
        const L1 = Math.max(0, Math.min(100, L * (1 + t.light * w)));
        labToLin(L1, a1, b1, lin);
        gamutMap(lin, lin);
      }
      out[s * 3] = Math.round(255 * srgbEncode(lin[0]));
      out[s * 3 + 1] = Math.round(255 * srgbEncode(lin[1]));
      out[s * 3 + 2] = Math.round(255 * srgbEncode(lin[2]));
    }
    return { rgb: out, dens: dens, steps: steps };
  }

  /* Re-mapea la rampa por oxidación: recién lavado el azul es más débil.
     o = 1 estabilizado (24 h), o = 0 recién salido del agua. */
  function applyOxidation(lut, o) {
    if (o >= 0.999) return lut;
    const n = lut.steps;
    const out = new Uint8ClampedArray(n * 3);
    const dens = new Float32Array(n);
    const gamma = 1 + 0.5 * (1 - o); // los blancos se mueven más
    for (let s = 0; s < n; s++) {
      const c = s / (n - 1);
      const src = Math.pow(c, gamma) * (n - 1);
      const i = src | 0, f = src - i;
      const j = Math.min(n - 1, i + 1);
      for (let k = 0; k < 3; k++) {
        out[s * 3 + k] = lut.rgb[i * 3 + k] + (lut.rgb[j * 3 + k] - lut.rgb[i * 3 + k]) * f;
      }
      dens[s] = lut.dens[i] + (lut.dens[j] - lut.dens[i]) * f;
    }
    return { rgb: out, dens: dens, steps: n };
  }

  /* Rampa completa del proceso: azul + oxidación + virado */
  function buildPrint(opts) {
    const dmax = opts.dmax == null ? 1.32 : opts.dmax;
    const steps = opts.steps || 1024;
    const base = buildLut([{ bands: BANDS.prusia, conc: 1, dmax: dmax }], dmax, steps);
    const ox = applyOxidation(base, opts.oxidation == null ? 1 : opts.oxidation);
    return applyToner(ox.rgb, ox.dens, ox.steps, opts.toner, opts.tonerAmount == null ? 1 : opts.tonerAmount);
  }

  P.sci = {
    LAM: LAM, NL: NL, CX: CX, CY: CY, CZ: CZ, XW: XW, YW: YW, ZW: ZW,
    clamp01: clamp01, clamp: clamp, lerp: lerp,
    srgbEncode: srgbEncode, srgbDecode: srgbDecode,
    buildLut: buildLut, sampleLut: sampleLut, buildPrintLut: buildPrint,
    applyToner: applyToner, applyOxidation: applyOxidation, buildPrint: buildPrint,
    shapeArray: shapeArray, spectralDensity: spectralDensity,
    BANDS: BANDS, PAPER: PAPER, TONER: TONER, hexOf: hexOf,
    linToLab: linToLab, labToLin: labToLin, gamutMap: gamutMap, inGamut: inGamut
  };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
