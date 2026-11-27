/* Prusia — engine.js
 * La cadena completa: imagen → negativo → cianotipia.
 *
 * Todo el cálculo pesado se colapsa en LUTs 1D, así el preview es instantáneo
 * aunque haya física espectral detrás:
 *
 *   Y (luminancia)  →  L*  →  t (fracción de azul)      curva de tono
 *                   →  x (exposición normalizada)       inversa del proceso
 *                   →  n (densidad de tinta necesaria)
 *                   →  u (fracción de tinta imprimible)  límite del soporte
 *                   →  c (azul revelado)                respuesta del proceso
 *                   →  RGB                              rampa espectral
 */
(function (P) {
  'use strict';
  const S = P.sci, T = P.tone;
  const clamp01 = S.clamp01;

  /* ---------- soportes y tintas del negativo ---------- */
  /* dmax = densidad UV que se puede alcanzar de verdad, en log10.
     Cifras de partida del informe del ET-2865 (dye, sin negro claro):
     gris ~1,05 · color ~1,8 · techo ~2,0. */
  const SUPPORT = {
    film: { name: 'Film de inyección (OHP)', max: 1.85, note: 'Pictorico / Fixxons. Lo que mejor bloquea UV con tintas de colorante.' },
    papel: { name: 'Papel normal', max: 1.30, note: 'Sirve para pruebas: filtra menos UV y el negativo sale plano.' },
    vellum: { name: 'Papel vegetal', max: 1.55, note: 'Traslúcido y barato, con algo de difusión.' }
  };

  /* Colour de bloqueo. El oliva (amarillo dominante) es el que mejor bloquea
     en tintas de colorante: el amarillo absorbe 400-480 nm, justo la cola
     útil del cianotipo. */
  const INK = {
    oliva:     { name: 'Oliva UV', rgb: [64, 128, 0], gain: 1.0, mode: 'Color', note: 'Amarillo dominante (Y100 M50 C75). Con tintas Epson el amarillo es el que más UV absorbe después del negro de foto.' },
    amarillo:  { name: 'Amarillo', rgb: [255, 216, 0], gain: 0.95, mode: 'Color', note: 'Amarillo puro: absorbe 400-480 nm, la cola que el cianotipo todavía ve, y con menos tinta encima.' },
    compuesto: { name: 'Compuesto neutro', rgb: [22, 22, 22], gain: 0.85, mode: 'Color', note: 'Los cuatro canales a la vez. Cómodo y sin sorpresas de color, algo menos denso en UV que el amarillo.' },
    negro:     { name: 'Negro puro (K)', rgb: [0, 0, 0], gain: 0.55, mode: 'Escala de grises', note: 'Solo la tinta K. En tintas de colorante (esta impresora) está optimizada para el visible y se queda corta en UV: negativo plano.' },
    magenta:   { name: 'Magenta', rgb: [200, 0, 120], gain: 0.5, mode: 'Color', note: 'Absorbe el verde y deja pasar el azul, o sea el UV: en teoría la peor. EDN mide lo contrario con otros juegos (57 tonos con un negativo rojizo frente a 23 en negro). No hay regla: hay pruebas.' }
  };

  /* ---------- construcción de la cadena ---------- */
  function build(st) {
    const chem = T.CHEM[st.chem] || T.CHEM.clasica;
    const proc = {
      range: Math.max(0.3, st.rangeProc == null ? chem.range : st.rangeProc),
      k: chem.k, toe: chem.toe, shoulder: chem.shoulder, dmax: chem.printDmax
    };

    // respuesta del proceso: preset o medida
    let Q, invQ;
    const steps = 2048;
    if (st.calib && st.calib.xs && st.calib.ys) {
      Q = T.responseFromSamples(st.calib.xs, st.calib.ys);
      invQ = new Float32Array(steps);
      for (let i = 0; i < steps; i++) {
        const target = i / (steps - 1);
        let a = 0, b = 1;
        for (let it = 0; it < 34; it++) {
          const mid = (a + b) / 2;
          if (Q(mid) < target) a = mid; else b = mid;
        }
        invQ[i] = (a + b) / 2;
      }
    } else {
      Q = T.responseCurve({ k: proc.k, toe: proc.toe, shoulder: proc.shoulder });
      invQ = T.invertMonotone(Q, 0, 1, null, steps);
    }

    const support = SUPPORT[st.support] || SUPPORT.film;
    const ink = INK[st.ink] || INK.oliva;
    const dmaxSupport = Math.max(0.2, (st.dmaxSupport || support.max)) * ink.gain;

    const tone = T.toneCurve({
      black: st.black, white: st.white, gamma: st.gamma, contrast: st.contrast
    });

    const printLut = S.buildPrint({
      dmax: st.printDmax == null ? proc.dmax : st.printDmax,
      toner: st.toner, tonerAmount: st.tonerAmount,
      oxidation: st.oxidation,
      steps: 512
    });

    const dr = Math.max(0.2, st.dr == null ? proc.range : st.dr);
    const E = (st.exposure == null ? 0 : st.exposure) * 0.30103; // pasos → log D

    /* núcleo 1D: fracción de azul objetivo → concentración revelada */
    function cFromT(t) {
      const x = invQ[Math.min(steps - 1, Math.max(0, Math.round(t * (steps - 1))))];
      const nReq = dr * (1 - x);
      const u = Math.min(1, Math.max(0, nReq / dmaxSupport));
      const nAch = u * dmaxSupport;
      return clamp01(1 - (nAch - E) / proc.range);
    }

    /* mapa Y → RGB de la cianotipia. Índice = sqrt(Y) para no perder detalle
       en las sombras, que es donde el cianotipo tiene el pie. */
    const NY = 4096;
    const paper = S.PAPER[st.paper] || S.PAPER.blanco;
    const pt = { r: paper.r / 255, g: paper.g / 255, b: paper.b / 255 };
    const mapY = new Uint8ClampedArray(NY * 3);
    const rgb = [0, 0, 0];
    const cAt = new Float32Array(NY);
    for (let i = 0; i < NY; i++) {
      const y = Math.pow(i / (NY - 1), 2);
      const l = T.yToL(y);
      const c = Q(cFromT(tone(l)));
      cAt[i] = c;
      S.sampleLut(printLut, c, rgb);
      mapY[i * 3] = rgb[0] * pt.r;
      mapY[i * 3 + 1] = rgb[1] * pt.g;
      mapY[i * 3 + 2] = rgb[2] * pt.b;
    }

    /* mapa gris 0-255 → píxel del negativo (lo que se manda a la impresora) */
    const negMap = new Uint8ClampedArray(256 * 3);
    let uMax = 0;
    for (let g = 0; g < 256; g++) {
      const y = S.srgbDecode(g / 255);
      const l = T.yToL(y);
      const x = invQ[Math.min(steps - 1, Math.max(0, Math.round(tone(l) * (steps - 1))))];
      const nReq = dr * (1 - x);
      const u = Math.min(1, Math.max(0, nReq / dmaxSupport));
      if (u > uMax) uMax = u;
      // en el negativo, más densidad = más tinta
      for (let k = 0; k < 3; k++) {
        negMap[g * 3 + k] = 255 + (ink.rgb[k] - 255) * u;
      }
    }

    /* diagnósticos: los extremos que la cadena puede alcanzar de verdad.
       La imagen en negro pide densidad 0 en el negativo; la imagen en blanco
       pide la máxima que se use, que es el menor entre el rango pedido y el
       tope del film. */
    const nMax = Math.min(dr, dmaxSupport);
    const cMax = Q(clamp01(1 + E / proc.range));
    const cMin = Q(clamp01(1 - (nMax - E) / proc.range));
    const densAt = (c) => printLut.dens[Math.min(printLut.steps - 1, Math.max(0, Math.round(c * (printLut.steps - 1))))];

    const diag = {
      dr: dr,
      drNeeded: proc.range,
      dmaxSupport: dmaxSupport,
      capacityShort: dr > dmaxSupport + 1e-6,
      inkUsed: uMax,
      cMax: cMax,
      cMin: cMin,
      densMax: densAt(cMax),
      densMin: densAt(cMin),
      veiled: cMin > 0.10,          // los blancos no llegan a papel
      weak: cMax < 0.90,            // el negro de la imagen no llega a azul pleno
      blocked: cMax >= 0.995 && cMin > 0.10,
      span: Math.max(0, cMax - cMin),
      paperTint: paper
    };

    return {
      proc: proc, Q: Q, invQ: invQ, printLut: printLut, tone: tone,
      mapY: mapY, negMap: negMap, ink: ink, support: support,
      dmaxSupport: dmaxSupport, dr: dr, exposure: E, diag: diag,
      cAt: cAt
    };
  }

  P.engine = { build: build, SUPPORT: SUPPORT, INK: INK };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
