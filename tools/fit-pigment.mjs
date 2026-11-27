/* Ajuste de las bandas de absorción del azul de Prusia a colores objetivo.
 * Uso: node tools/fit-pigment.mjs
 * Ajusta contra la MISMA ruta de código que usa la app (buildLut → sRGB),
 * comparando en Lab. Imprime los parámetros para pegar en src/js/sci.js
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../src/js/sci.js');
const S = P.sci;

/* --- sRGB → Lab (D65), la referencia de lo que se ve en pantalla --- */
const D65 = [0.95047, 1.0, 1.08883];
function linToXyz(r, g, b) {
  return [
    0.4124 * r + 0.3576 * g + 0.1805 * b,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    0.0193 * r + 0.1192 * g + 0.9505 * b
  ];
}
function lab(x) {
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x[0] / D65[0]), fy = f(x[1] / D65[1]), fz = f(x[2] / D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const hex2lab = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((q) => S.srgbDecode(q / 255));
  return lab(linToXyz(v[0], v[1], v[2]));
};
const rgb2lab = (r, g, b) => hex2lab('#' + [r, g, b].map((q) => Math.round(q).toString(16).padStart(2, '0')).join(''));

/* --- objetivos: densidad (log D) → color de una cianotipia real --- */
// Anclas: cobertura → Lab. Fuente de la ancla 1.00: Koraks (i1Pro, cianotipo
// clásico sobre Schut Laurier) L*25,78 a*2,08 b*-26,66. El resto es la
// progresión de color del informe (research/cyanotype-science.md §3.3).
// densidad de reflexión (log10) derivada de L*, con L* de las anclas del informe
const lToD = (L) => -Math.log10(Math.pow((L + 16) / 116, 3));
const DMAX = lToD(26);
const TARGETS = [
  [88, -5, -8],
  [82, -7, -12],
  [62, -8, -22],
  [42, -4, -26],
  [26, 2, -27]
].map((l) => ({ d: lToD(l[0]), lab: l, hex: 'L' + l[0] }));

function bands(p) {
  return [
    { mu: p.mu1, w: p.w1, a: 1.0 },
    { mu: p.mu2, w: p.w2, a: p.a2 },
    { mu: p.mu3, w: p.w3, a: p.a3 }
  ];
}
function ramp(p, n = 96) {
  const lut = S.buildLut([{ bands: bands(p), conc: 1, dmax: DMAX }], DMAX, n);
  return lut;
}
function idxOfDensity(lut, d) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < lut.steps; i++) {
    const q = Math.abs(lut.dens[i] - d);
    if (q < bd) { bd = q; best = i; }
  }
  return best;
}
function cost(p) {
  const lut = ramp(p, 96);
  let e = 0;
  for (const t of TARGETS) {
    const i = idxOfDensity(lut, t.d);
    const l = rgb2lab(lut.rgb[i * 3], lut.rgb[i * 3 + 1], lut.rgb[i * 3 + 2]);
    const dl = l[0] - t.lab[0], da = l[1] - t.lab[1], db = l[2] - t.lab[2];
    e += dl * dl * 0.5 + da * da + db * db;
  }
  return e;
}

let best = { mu1: 720, w1: 70, mu2: 560, w2: 95, a2: 0.35, mu3: 412, w3: 46, a3: 0.8 };
let bestC = cost(best);
const keys = Object.keys(best);
const steps = { mu1: 40, w1: 25, mu2: 45, w2: 35, mu3: 25, w3: 22, a2: 0.16, a3: 0.22 };
const ranges = { mu1: [600, 780], w1: [30, 160], mu2: [500, 620], w2: [40, 180], mu3: [390, 470], w3: [24, 90], a2: [0.02, 1.2], a3: [0.05, 1.6] };

const seeds = [
  { mu1: 680, w1: 95, mu2: 560, w2: 60, a2: 0.51, mu3: 412, w3: 52, a3: 0.58 },
  { mu1: 700, w1: 110, mu2: 540, w2: 80, a2: 0.25, mu3: 430, w3: 45, a3: 0.9 },
  { mu1: 660, w1: 70, mu2: 580, w2: 45, a2: 0.8, mu3: 400, w3: 60, a3: 0.3 }
];
let bestGlobal = null, bestGlobalC = 1e18;
for (const seed of seeds) {
best = { ...seed };
bestC = cost(best);
for (let round = 0; round < 26; round++) {
  let improved = false;
  for (const k of keys) {
    for (const dir of [1, -1]) {
      let stp = steps[k] * Math.pow(0.7, round);
      const trial = { ...best };
      trial[k] = trial[k] + dir * stp;
      if (trial[k] < ranges[k][0] || trial[k] > ranges[k][1]) continue;
      const c = cost(trial);
      if (c < bestC - 1e-6) { best = trial; bestC = c; improved = true; }
    }
  }
  if (!improved) break;
}
if (bestC < bestGlobalC) { bestGlobal = { ...best }; bestGlobalC = bestC; }
}
best = bestGlobal; bestC = bestGlobalC;

const b = bands(best);
console.log('coste', bestC.toFixed(1));
console.log('bandas:', JSON.stringify(b));
const lut = ramp(best, 128);
console.log('\ndens  objetivo        ajustado');
for (const t of TARGETS) {
  const i = idxOfDensity(lut, t.d);
  const c = [lut.rgb[i * 3], lut.rgb[i * 3 + 1], lut.rgb[i * 3 + 2]];
  const l = rgb2lab(...c);
  console.log(
    t.d.toFixed(2),
    t.hex,
    'L*a*b', t.lab.map((v) => v.toFixed(0).padStart(4)).join(''),
    '  ',
    S.hexOf(c),
    'L*a*b', l.map((v) => v.toFixed(0).padStart(4)).join('')
  );
}
