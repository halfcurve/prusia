/* Prusia — sheets.js
 * Hojas que se imprimen: carta de calibración y gráfica de la curva medida.
 */
(function (P) {
  'use strict';
  /* ---------- carta de calibración ---------- */
  /* Un A4 con la tira de pasos y una comparativa de tintas.
     opt.steps: 21 (a ojo), 51 o 101 (escaneada, como las tablas de EDN). */
  function drawCalSheet(canvas, opt) {
    const dpi = (opt && opt.dpi) || 300;
    const N = (opt && opt.steps) || 21;
    const mm = (v) => (v / 25.4) * dpi;
    const W = Math.round(mm(210)), H = Math.round(mm(297));
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);

    const ink = (opt && opt.inkRGB) || [64, 128, 0];
    const inkPx = (u) => {
      const c = [0, 1, 2].map((k) => Math.round(255 + (ink[k] - 255) * u));
      return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    };

    const M = mm(16);
    const inkText = '#1a1a1a';

    // cabecera
    g.fillStyle = inkText;
    g.font = `600 ${mm(5)}px -apple-system, Helvetica, sans-serif`;
    g.fillText('Carta de calibración', M, mm(26));
    g.font = `400 ${mm(3)}px -apple-system, Helvetica, sans-serif`;
    g.fillStyle = '#5a5a5a';
    g.fillText('Imprime esta hoja al 100 %, sin ajustar a la página, sobre el film que uses siempre.', M, mm(33));

    // campos
    const fields = ['Fecha', 'Film', 'Papel', 'Química', 'Tiempo de exposición'];
    g.strokeStyle = '#c9c9c9';
    g.lineWidth = Math.max(1, mm(0.2));
    let fx = M;
    const fy = mm(42);
    g.font = `400 ${mm(2.6)}px -apple-system, Helvetica, sans-serif`;
    for (let i = 0; i < fields.length; i++) {
      const w = mm(i === fields.length - 1 ? 40 : 26);
      g.fillStyle = '#767676';
      g.fillText(fields[i], fx, fy);
      g.beginPath();
      g.moveTo(fx, fy + mm(2));
      g.lineTo(fx + w, fy + mm(2));
      g.stroke();
      fx += w + mm(6);
    }

    // tira de pasos
    const stripY = mm(62);
    const stripH = mm(26);
    const stripW = W - M * 2;
    const stepW = stripW / N;
    for (let i = 0; i < N; i++) {
      g.fillStyle = inkPx(i / (N - 1));
      g.fillRect(M + i * stepW, stripY, Math.ceil(stepW) + 0.5, stripH);
    }
    g.strokeStyle = '#1f1f1f';
    g.lineWidth = Math.max(1, mm(0.25));
    g.strokeRect(M, stripY, stripW, stripH);
    g.font = `500 ${mm(2.3)}px ui-monospace, Menlo, monospace`;
    g.fillStyle = '#333';
    g.textAlign = 'center';
    const every = N > 51 ? 10 : 1;
    for (let i = 0; i < N; i += every) {
      g.fillText(String(i), M + (i + 0.5) * stepW, stripY + stripH + mm(4.5));
    }
    g.textAlign = 'left';

    // marcas de recorte de la tira (para alinear en la foto)
    g.fillStyle = '#111';
    const tick = mm(2);
    [
      [M, stripY], [M + stripW, stripY], [M, stripY + stripH], [M + stripW, stripY + stripH]
    ].forEach(([x, y]) => {
      g.fillRect(x - tick / 2, y - tick, Math.max(1, mm(0.3)), tick);
      g.fillRect(x - tick / 2, y + stripH, Math.max(1, mm(0.3)), tick);
    });

    // comparativa de tintas
    const cmpY = stripY + stripH + mm(20);
    g.fillStyle = inkText;
    g.font = `600 ${mm(3.4)}px -apple-system, Helvetica, sans-serif`;
    g.fillText('¿Qué tinta bloquea más?', M, cmpY);
    g.font = `400 ${mm(2.7)}px -apple-system, Helvetica, sans-serif`;
    g.fillStyle = '#5a5a5a';
    g.fillText('Expón esta zona igual que la tira. La fila que salga más clara en sus pasos densos es la que más UV bloquea.', M, cmpY + mm(5));

    const rows = (opt && opt.inkCandidates) || [
      { name: 'A  oliva', rgb: [64, 128, 0] },
      { name: 'B  amarillo', rgb: [255, 216, 0] },
      { name: 'C  compuesto', rgb: [22, 22, 22] },
      { name: 'D  magenta', rgb: [200, 0, 120] }
    ];
    const rowH = mm(11), gap = mm(4);
    let ry = cmpY + mm(11);
    for (let r = 0; r < rows.length; r++) {
      g.font = `500 ${mm(3.1)}px ui-monospace, Menlo, monospace`;
      g.fillStyle = '#333';
      g.fillText(rows[r].name, M, ry + rowH - mm(3));
      const x0 = M + mm(34);
      const w = (W - M - x0) / 8;
      for (let i = 0; i < 8; i++) {
        const u = i / 7;
        const c = [0, 1, 2].map((k) => Math.round(255 + (rows[r].rgb[k] - 255) * u));
        g.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        g.fillRect(x0 + i * w, ry, Math.ceil(w) + 0.5, rowH);
      }
      g.strokeStyle = '#1f1f1f';
      g.lineWidth = Math.max(1, mm(0.2));
      g.strokeRect(x0, ry, w * 8, rowH);
      ry += rowH + gap;
    }

    // pie
    g.fillStyle = '#767676';
    g.font = `400 ${mm(2.6)}px -apple-system, Helvetica, sans-serif`;
    g.fillText('Prusia · carta de calibración para negativos de cianotipia', M, H - mm(16));
    g.textAlign = 'right';
    g.fillText('escala 1:1 · ' + dpi + ' ppp', W - M, H - mm(16));
    g.textAlign = 'left';
  }

  /* ---------- gráfica de la curva medida ---------- */
  function drawCurve(canvas, xs, ys, opt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // el ancho sale del contenedor: un canvas con width=10 de atributo mide 10 px
    const host = canvas.parentElement;
    const w = Math.max(260, (host ? host.clientWidth : 440) - 20);
    const h = 150;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);

    const pad = { l: 28, r: 8, t: 10, b: 18 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const X = (v) => pad.l + v * iw;
    const Y = (v) => pad.t + (1 - v) * ih;

    g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(pad.l, pad.t + (ih * i) / 4);
      g.lineTo(pad.l + iw, pad.t + (ih * i) / 4);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.moveTo(pad.l, pad.t);
    g.lineTo(pad.l, pad.t + ih);
    g.lineTo(pad.l + iw, pad.t + ih);
    g.stroke();

    g.fillStyle = 'rgba(255,255,255,0.34)';
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText('1', 8, pad.t + 4);
    g.fillText('0', 8, pad.t + ih + 4);
    g.fillText('film limpio', pad.l, h - 4);
    g.textAlign = 'right';
    g.fillText('tinta plena', pad.l + iw, h - 4);
    g.textAlign = 'left';

    if (!xs || !xs.length) return;
    const sp = P.tone.mono(xs, ys);
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = i / 120;
      const y = sp.at(x);
      if (i === 0) g.moveTo(X(x), Y(y));
      else g.lineTo(X(x), Y(y));
    }
    g.strokeStyle = '#4e8cc9';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(78,140,201,0.10)';
    g.lineTo(X(1), Y(0));
    g.lineTo(X(0), Y(0));
    g.closePath();
    g.fill();

    g.fillStyle = '#dfe8f1';
    for (let i = 0; i < xs.length; i++) {
      g.beginPath();
      g.arc(X(xs[i]), Y(ys[i]), 2.1, 0, Math.PI * 2);
      g.fill();
    }
    if (opt && opt.residual) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.font = '10px -apple-system, sans-serif';
      g.fillText(opt.residual, pad.l + 4, pad.t + 12);
    }
  }

  P.sheets = { drawCalSheet: drawCalSheet, drawCurve: drawCurve };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
