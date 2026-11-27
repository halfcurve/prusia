/* Prusia — tone.js
 * Curvas tonales y respuesta del proceso.
 *
 * Todo el sistema se apoya en una sola idea: una curva monótona y su inversa.
 *   · La curva de tono lleva la imagen (L*) a "fracción de azul" t ∈ [0,1].
 *   · La respuesta del proceso Q(x) lleva exposición normalizada x ∈ [0,1] a t.
 *   · El negativo es la inversa: t → densidad de tinta.
 * Si el negativo y el proceso no coinciden, el preview lo muestra.
 */
(function (P) {
  'use strict';
  const S = P.sci;
  const clamp01 = S.clamp01;

  /* ---------- interpolación monótona (Fritsch–Carlson) ---------- */
  function mono(xs, ys) {
    const n = xs.length;
    if (n === 1) {
      return { at: () => ys[0], x0: xs[0], x1: xs[0] };
    }
    const dx = [], dy = [], slope = [];
    for (let i = 0; i < n - 1; i++) {
      dx[i] = xs[i + 1] - xs[i];
      dy[i] = ys[i + 1] - ys[i];
      slope[i] = dy[i] / dx[i];
    }
    const m = new Array(n);
    m[0] = slope[0];
    m[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (slope[i - 1] * slope[i] <= 0) m[i] = 0;
      else m[i] = (slope[i - 1] + slope[i]) / 2;
    }
    // limitador de monotonía
    for (let i = 0; i < n - 1; i++) {
      if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / slope[i], b = m[i + 1] / slope[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        m[i] = tau * a * slope[i];
        m[i + 1] = tau * b * slope[i];
      }
    }
    function at(x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (xs[mid] <= x) lo = mid; else hi = mid;
      }
      const h = xs[lo + 1] - xs[lo];
      const t = (x - xs[lo]) / h;
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo] +
        (-2 * t3 + 3 * t2) * ys[lo + 1] + (t3 - t2) * h * m[lo + 1];
    }
    return { at: at, x0: xs[0], x1: xs[n - 1] };
  }

  /* Inversa numérica de una curva monótona (bisección, vectorizada a una LUT) */
  function invertMonotone(f, y0, y1, out, steps, lo, hi) {
    const n = steps || 2048;
    const res = out || new Float32Array(n);
    if (lo == null) lo = 0;
    if (hi == null) hi = 1;
    for (let i = 0; i < n; i++) {
      const target = y0 + (y1 - y0) * (i / (n - 1));
      let a = lo, b = hi;
      for (let it = 0; it < 30; it++) {
        const mid = (a + b) / 2;
        if (f(mid) < target) a = mid; else b = mid;
      }
      res[i] = (a + b) / 2;
    }
    return res;
  }

  /* ---------- L* ↔ Y ---------- */
  function yToL(y) {
    y = clamp01(y);
    return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
  }
  function lToY(l) {
    l = Math.max(0, Math.min(100, l));
    return l > 8 ? Math.pow((l + 16) / 116, 3) : l / 903.3;
  }

  /* ---------- curva de tono (imagen → fracción de azul) ---------- */
  /* black/white: recorte en L*; gamma: medios; contraste: S alrededor de 50 % */
  function toneCurve(o) {
    const black = o.black == null ? 0 : o.black;
    const white = o.white == null ? 100 : o.white;
    const gamma = o.gamma == null ? 1 : o.gamma;
    const contrast = o.contrast == null ? 0 : o.contrast;
    const span = Math.max(1e-4, white - black);
    const k = Math.pow(2, contrast * 1.6); // contraste 0..1 → S suave..duro
    return function (l) {
      let p = (l - black) / span;
      p = clamp01(p);
      if (gamma !== 1) p = Math.pow(p, gamma);
      if (k !== 1) {
        // sigmoide simétrica que respeta 0 y 1
        const q = Math.pow(Math.max(p, 1e-6), k);
        p = q / (q + Math.pow(Math.max(1 - p, 1e-6), k));
      }
      return 1 - p; // 0 = papel blanco, 1 = azul máximo
    };
  }

  /* ---------- respuesta del proceso Q(x) ---------- */
  /* x = exposición normalizada (0 = la que deja el papel blanco,
     1 = la que ennegrece del todo). shape controla hombro y pie. */
  function responseCurve(o) {
    const k = o.k == null ? 1.35 : o.k;      // "contraste" del proceso
    const toe = o.toe == null ? 0.02 : o.toe; // tramo plano en blancos
    const shoulder = o.shoulder == null ? 0.02 : o.shoulder;
    return function (x) {
      let p = (x - toe) / Math.max(1e-4, 1 - toe - shoulder);
      p = clamp01(p);
      const q = Math.pow(Math.max(p, 1e-6), k);
      return q / (q + Math.pow(Math.max(1 - p, 1e-6), k));
    };
  }

  /* Curva de respuesta a partir de muestras medidas (calibración):
     xs = exposición normalizada creciente, ys = respuesta medida 0..1 */
  function responseFromSamples(xs, ys) {
    const sp = mono(xs, ys);
    return function (x) { return clamp01(sp.at(x)); };
  }

  /* ---------- químicas (presets) ---------- */
  /* rangeProc: rango de densidad del negativo (log D) que necesita el proceso.
     Es LA cifra que define el contraste: cuanto menor, más contrastado. */
  /* range = rango de densidad del negativo que pide la química (log D).
     Cifras medidas: clásica 1,0-1,2 · nueva (Ware) 1,8-2,4 · simple 1,8-2,7
     (Ware, CyanoWork / CyanoWork II). k = contraste de la curva. */
  const CHEM = {
    clasica: {
      name: 'Clásica (Herschel)', short: 'Clásica',
      range: 1.15, k: 1.25, toe: 0.06, shoulder: 0.12, printDmax: 1.32,
      note: 'Citrato férrico amónico 20 % + ferricianuro potásico 8 %, 1:1. Pierde casi la mitad de la escala tonal en el lavado.'
    },
    jacquard: {
      name: 'Kit Jacquard (A+B)', short: 'Jacquard',
      range: 1.05, k: 1.28, toe: 0.06, shoulder: 0.13, printDmax: 1.12,
      note: 'Las dos partes del kit: A 40 g/400 ml + B 100 g/400 ml, 1:1 → 5 % ferricianuro y 12,5 % citrato, un 62 % de la clásica. La mezcla aguanta 2-4 h: se hace justo antes.'
    },
    ware: {
      name: 'Nueva cianotipia (Ware)', short: 'Ware',
      range: 2.05, k: 1.05, toe: 0.05, shoulder: 0.08, printDmax: 1.50,
      note: 'Oxalato férrico amónico: escala larga y azul más profundo, pero pide un negativo casi tan denso como el platino.'
    },
    simple: {
      name: 'Cianotipo simple (Ware)', short: 'Simple',
      range: 2.30, k: 0.95, toe: 0.06, shoulder: 0.06, printDmax: 1.42,
      note: 'Una sola disolución de oxalato férrico amónico. Escala muy larga.'
    }
  };

  /* minutos de exposición al sol por química, con un negativo bien denso */
  const EXPOSURE_MIN = { clasica: [3, 8], jacquard: [10, 20], ware: [2, 6], simple: [2, 5] };

  const SOURCE = {
    film: { name: 'Film de inyección (transparencia)', dr: 2.6, note: 'El soporte que mejor bloquea UV con tintas de colorante.' },
    papel: { name: 'Papel normal', dr: 1.9, note: 'Sirve, pero filtra menos UV: negativos más planos.' },
    vellum: { name: 'Papel vegetal / tracing', dr: 2.1, note: 'Barato y traslúcido, con algo de difusión.' }
  };

  P.tone = {
    mono: mono, invertMonotone: invertMonotone,
    yToL: yToL, lToY: lToY,
    toneCurve: toneCurve, responseCurve: responseCurve, responseFromSamples: responseFromSamples,
    CHEM: CHEM, SOURCE: SOURCE, EXPOSURE_MIN: EXPOSURE_MIN
  };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
