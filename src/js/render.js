/* Prusia — render.js
 * Dibujo: preview (cianotipia, negativo, original, lado a lado), exportación a
 * tamaño físico y utilidades de canvas. El trabajo por píxel es un par de
 * lecturas de tabla; la física ya está cocida en las LUT del motor.
 */
(function (P) {
  'use strict';
  const S = P.sci;

  /* ---------- tablas auxiliares ---------- */
  const LIN = new Float32Array(256);       // sRGB byte → luz lineal
  const GRAY = new Uint8Array(4096);       // índice Y → gris sRGB
  for (let i = 0; i < 256; i++) LIN[i] = S.srgbDecode(i / 255);
  for (let i = 0; i < 4096; i++) {
    const y = Math.pow(i / 4095, 2);
    GRAY[i] = Math.round(255 * S.srgbEncode(y));
  }

  /* ---------- grano de papel (solo preview) ---------- */
  let noise = null;
  function noiseTile() {
    if (noise) return noise;
    const N = 256;
    noise = new Float32Array(N * N);
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    // ruido de valor suavizado (dos octavas) — grano, no estática
    const base = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) base[i] = rnd() - 0.5;
    const at = (x, y) => base[((y & 255) << 8) + (x & 255)];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let s = 0, w = 0;
        for (let o = 1; o <= 2; o++) {
          const step = 1 << (o + 2);
          const xf = x / step, yf = y / step;
          const x0 = Math.floor(xf), y0 = Math.floor(yf);
          const fx = xf - x0, fy = yf - y0;
          const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const v = (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) +
            (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
          s += v * (o === 1 ? 1 : 0.5);
          w += o === 1 ? 1 : 0.5;
        }
        noise[y * N + x] = s / w;
      }
    }
    return noise;
  }

  /* ---------- dibujo del origen a un tamaño dado ---------- */
  function makeSourceCanvas(img, w, h, fit, offsetX, offsetY, zoom) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return c;
    let dw = w, dh = h;
    if (fit === 'contain') {
      const s = Math.min(w / iw, h / ih);
      dw = iw * s; dh = ih * s;
    } else if (fit === 'cover') {
      const s = Math.max(w / iw, h / ih);
      dw = iw * s; dh = ih * s;
    } else if (fit === 'width') {
      const s = w / iw;
      dw = w; dh = ih * s;
    }
    if (zoom && zoom !== 1) { dw *= zoom; dh *= zoom; }
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (w - dw) / 2 + (offsetX || 0), (h - dh) / 2 + (offsetY || 0), dw, dh);
    return c;
  }

  /* ---------- preview ---------- */
  /* Dibuja el papel completo con su margen y, dentro, la imagen procesada.
     opt: { eng, img, mode, w, h, fit, zoom, texture, mix, margin, develop,
            devKey, quality, cache } */
  function drawPreview(canvas, opt) {
    const eng = opt.eng;
    if (!eng || !opt.img) return;
    const img = opt.img;
    const q = opt.quality == null ? 1 : Math.max(0.3, Math.min(1, opt.quality));
    const dpr = Math.min(2, (window.devicePixelRatio || 1)) * q;
    const cw = Math.max(40, Math.round(opt.w));
    const ch = Math.max(40, Math.round(opt.h));
    const W = Math.max(48, Math.round(cw * dpr));
    const H = Math.max(48, Math.round(ch * dpr));
    canvas.width = W; canvas.height = H;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    const g = canvas.getContext('2d', { willReadFrequently: true });

    const paper = eng.diag.paperTint;
    const mode = opt.mode;
    const m = opt.margin || 0;
    const padX = mode === 'neg' ? 0 : Math.round((m / (opt.paperW || 210)) * W);
    const padY = mode === 'neg' ? 0 : Math.round((m / (opt.paperH || 297)) * H);

    // fondo del papel
    g.fillStyle = mode === 'neg' ? '#ffffff' : 'rgb(' + Math.round(paper.r) + ',' + Math.round(paper.g) + ',' + Math.round(paper.b) + ')';
    g.fillRect(0, 0, W, H);

    const ix = padX, iy = padY, iw = Math.max(8, W - padX * 2), ih = Math.max(8, H - padY * 2);
    const src = makeSourceCanvas(img, iw, ih, opt.fit, 0, 0, opt.zoom);
    const sg = src.getContext('2d', { willReadFrequently: true });

    /* revelado (enfoque, desenfoque, efectos): se aplica sobre los píxeles ya
       colocados en el papel, así el radio se mide siempre en píxeles de salida.
       Se cachea por parámetros y tamaño: mover un mando de química no vuelve a
       revelar lo que no ha cambiado. */
    const cache = opt.cache;
    const cacheKey = opt.devKey
      ? opt.devKey + '|' + iw + 'x' + ih + '|' + opt.fit + '|' + (opt.zoom || 1) + '|' + q
      : null;
    let data;
    if (cache && cacheKey && cache.key === cacheKey && cache.data &&
      cache.data.width === iw && cache.data.height === ih) {
      data = cache.data;
      sg.putImageData(data, 0, 0);
    } else {
      data = sg.getImageData(0, 0, iw, ih);
      if (opt.develop && !P.develop.isNeutral(opt.develop)) {
        P.develop.apply(data.data, iw, ih, opt.develop);
        sg.putImageData(data, 0, 0);
      }
      if (cache && cacheKey) { cache.key = cacheKey; cache.data = data; }
    }
    const px = data.data;
    const out = new Uint32Array(px.buffer, 0, iw * ih);

    if (mode === 'orig') {
      g.drawImage(src, ix, iy);
      return;
    }

    const mapY = eng.mapY;
    const negMap = eng.negMap;
    const tex = opt.texture > 0 ? noiseTile() : null;
    const tAmp = (opt.texture || 0) * 13;
    const half = mode === 'side' ? (iw >> 1) : mode === 'neg' ? 0 : iw;
    const wgt = opt.mix || [0.2126, 0.7152, 0.0722];

    for (let y = 0; y < ih; y++) {
      const nrow = tex ? (y & 255) << 8 : 0;
      for (let x = 0; x < iw; x++) {
        const i = y * iw + x;
        const p = i << 2;
        const Y = wgt[0] * LIN[px[p]] + wgt[1] * LIN[px[p + 1]] + wgt[2] * LIN[px[p + 2]];
        const yi = (Math.sqrt(Y > 0 ? Y : 0) * 4095) | 0;
        let r, gg, b;
        if (x < half) {
          const k = yi * 3;
          r = mapY[k]; gg = mapY[k + 1]; b = mapY[k + 2];
          if (tAmp) {
            const nz = tex[nrow | (x & 255)] * tAmp;
            r += nz; gg += nz; b += nz;
          }
        } else {
          const gi = GRAY[yi] * 3;
          r = negMap[gi]; gg = negMap[gi + 1]; b = negMap[gi + 2];
        }
        out[i] = 0xff000000 | (b << 16) | (gg << 8) | r;
      }
    }
    sg.putImageData(data, 0, 0);
    g.drawImage(src, ix, iy);

    if (mode === 'side') {
      g.fillStyle = 'rgba(10,9,8,0.55)';
      g.fillRect(ix + half - 1, iy, 2, ih);
      const fs = Math.max(10, Math.round(H * 0.017));
      g.font = `600 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      g.textBaseline = 'top';
      const label = (txt, x) => {
        const tw = g.measureText(txt).width;
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(x, iy, tw + 16, fs + 10);
        g.fillStyle = 'rgba(255,255,255,0.88)';
        g.fillText(txt, x + 8, iy + 5);
      };
      label('CIANOTIPIA', ix + 8);
      label('NEGATIVO', ix + half + 8);
    }
  }

  /* ---------- exportación a tamaño físico ---------- */
  /* Devuelve { canvas, w, h } con el negativo a la resolución pedida.
     nasa: el tamaño final del papel en mm incluye márgenes. */
  function renderNegative(opt) {
    const eng = opt.eng, img = opt.img;
    const dpi = opt.dpi || 360;
    const paperW = opt.paperW, paperH = opt.paperH;   // mm
    const W = Math.max(8, Math.round((paperW / 25.4) * dpi));
    const H = Math.max(8, Math.round((paperH / 25.4) * dpi));
    const m = opt.margin || 0;                          // mm
    const mx = Math.round((m / 25.4) * dpi);
    const inW = W - mx * 2, inH = H - mx * 2;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);

    // área de imagen
    const src = makeSourceCanvas(img, Math.max(1, inW), Math.max(1, inH), opt.fit, 0, 0, opt.zoom || 1);
    const sg = src.getContext('2d', { willReadFrequently: true });
    const d = sg.getImageData(0, 0, src.width, src.height);
    if (opt.develop && !P.develop.isNeutral(opt.develop)) {
      P.develop.apply(d.data, src.width, src.height, opt.develop);
      sg.putImageData(d, 0, 0);
    }
    const px = d.data;
    const n = src.width * src.height;
    const out = new Uint32Array(px.buffer, 0, n);
    const negMap = eng.negMap;
    const wgt = opt.mix || [0.2126, 0.7152, 0.0722];
    for (let i = 0; i < n; i++) {
      const p = i << 2;
      const Y = wgt[0] * LIN[px[p]] + wgt[1] * LIN[px[p + 1]] + wgt[2] * LIN[px[p + 2]];
      const yi = (Math.sqrt(Y > 0 ? Y : 0) * 4095) | 0;
      const gi = GRAY[yi] * 3;
      out[i] = 0xff000000 | (negMap[gi + 2] << 16) | (negMap[gi + 1] << 8) | negMap[gi];
    }
    sg.putImageData(d, 0, 0);

    if (opt.mirror !== false) {
      g.save();
      g.translate(mx + src.width, mx);
      g.scale(-1, 1);
      g.drawImage(src, 0, 0);
      g.restore();
    } else {
      g.drawImage(src, mx, mx);
    }
    if (opt.marks) drawMarks(g, W, H, mx, dpi, opt);
    return { canvas: canvas, w: W, h: H };
  }

  /* marcas de registro y etiqueta del negativo */
  function drawMarks(g, W, H, margin, dpi, opt) {
    const mm = (v) => (v / 25.4) * dpi;
    const t = Math.max(1, Math.round(mm(0.25)));
    g.fillStyle = '#8b8b8b';
    const L = Math.round(mm(6));
    const o = Math.max(2, margin - t - Math.round(mm(2)));
    // esquinas de corte
    g.fillRect(o, o, L, t); g.fillRect(o, o, t, L);
    g.fillRect(W - o - L, o, L, t); g.fillRect(W - o - t, o, t, L);
    g.fillRect(o, H - o - t, L, t); g.fillRect(o, H - o - t * 2, t, L);
    g.fillRect(W - o - L, H - o - t, L, t); g.fillRect(W - o - t, H - o - t * 2, t, L);
    // etiqueta
    const fs = Math.round(mm(2.6));
    const pad = Math.round(mm(2));
    const txt = opt.label || '';
    g.font = `500 ${fs}px -apple-system, Helvetica, sans-serif`;
    const tw = g.measureText(txt).width;
    g.fillStyle = '#ffffff';
    g.fillRect(W - tw - pad * 2 - o, H - o - fs - pad, tw + pad * 2, fs + pad);
    g.fillStyle = '#4a4a4a';
    g.fillText(txt, W - tw - pad - o, H - o - pad - fs * 0.22);
  }

  /* ---------- hoja de escala (verifica 1:1) ---------- */
  function renderRuler(dpi) {
    const W = Math.round((210 / 25.4) * dpi), H = Math.round((297 / 25.4) * dpi);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const mm = (v) => (v / 25.4) * dpi;
    g.fillStyle = '#111';
    g.font = `500 ${mm(4.2)}px -apple-system, Helvetica, sans-serif`;
    g.fillText('Prueba de escala', mm(20), mm(35));
    g.font = `400 ${mm(3.2)}px -apple-system, Helvetica, sans-serif`;
    g.fillStyle = '#444';
    g.fillText('Mide la barra con una regla. Debe dar exactamente 100,0 mm.', mm(20), mm(44));
    g.fillText('Si no coincide, cambia el % de escala en el diálogo de impresión.', mm(20), mm(51));

    // barra de 100 mm
    const x0 = mm(20), y0 = mm(70);
    g.fillStyle = '#111';
    g.fillRect(x0, y0, mm(100), mm(0.6));
    for (let i = 0; i <= 100; i += 5) {
      const h = i % 10 === 0 ? mm(5) : mm(2.6);
      g.fillRect(x0 + mm(i), y0, Math.max(1, mm(0.35)), h);
      if (i % 10 === 0) {
        g.font = `500 ${mm(2.6)}px ui-monospace, Menlo, monospace`;
        g.fillText(String(i), x0 + mm(i) - mm(0.8), y0 + mm(7.5));
      }
    }
    g.strokeStyle = '#111'; g.lineWidth = Math.max(1, mm(0.3));
    g.strokeRect(x0 - mm(2), y0 - mm(4), mm(104), mm(20));
    return c;
  }

  P.render = {
    drawPreview: drawPreview, renderNegative: renderNegative, renderRuler: renderRuler,
    makeSourceCanvas: makeSourceCanvas, noiseTile: noiseTile, LIN: LIN, GRAY: GRAY
  };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
