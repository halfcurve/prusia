/* Prusia — app.js
 * Estado, controles y todo lo que pasa cuando tocas algo.
 */
(function (P) {
  'use strict';
  const U = P.ui, el = U.el, S = P.sci, T = P.tone, E = P.engine, R = P.render;
  const $ = (s) => document.querySelector(s);
  const num = (v, d) => Number(v).toFixed(d === undefined ? 2 : d).replace('.', ',');

  /* ------------------------------------------------------------------ estado */
  const PAPER_SIZES = {
    a4: { name: 'A4 · 210 × 297', w: 210, h: 297 },
    a4l: { name: 'A4 apaisado · 297 × 210', w: 297, h: 210 },
    a5: { name: 'A5 · 148 × 210', w: 148, h: 210 },
    '20x25': { name: '20 × 25 cm', w: 200, h: 250 },
    '13x18': { name: '13 × 18 cm', w: 130, h: 180 },
    custom: { name: 'A medida', w: 210, h: 297 }
  };

  const MIXES = {
    neutro: { name: 'Neutra', w: [0.2126, 0.7152, 0.0722] },
    cielos: { name: 'Cielos profundos', w: [0.10, 0.55, 0.35] },
    suave: { name: 'Suave', w: [0.30, 0.64, 0.06] },
    dramatica: { name: 'Dramática', w: [0.42, 0.50, 0.08] }
  };

  const DEFAULTS = {
    neg: { support: 'film', ink: 'oliva', dr: 1.15, autoDr: true, contrast: 0, gamma: 1, black: 0, white: 100, mix: 'neutro' },
    proc: { chem: 'clasica', exposure: 0, paper: 'blanco', oxidation: 1, toner: 'ninguno', tonerAmount: 0.65, printDmax: 1.32, texture: 0.35 },
    out: { size: 'a4', w: 210, h: 297, margin: 6, fit: 'cover', dpi: 360, mirror: true, marks: true }
  };

  const state = JSON.parse(JSON.stringify(DEFAULTS));
  state.view = 'revelar';
  state.mode = 'print';
  state.calib = null;
  let profiles = [];
  let img = null;
  let imgName = '';
  let engine = null;
  let pending = false;
  let zoom = 1;

  /* ------------------------------------------------------------ persistencia */
  const KEY = 'prusia.state.v2';
  const KEYP = 'prusia.profiles.v2';

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ neg: state.neg, proc: state.proc, out: state.out }));
      localStorage.setItem(KEYP, JSON.stringify(profiles));
    } catch { /* modo privado: seguimos sin guardar */ }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o.neg) Object.assign(state.neg, o.neg);
        if (o.proc) Object.assign(state.proc, o.proc);
        if (o.out) Object.assign(state.out, o.out);
      }
      const pr = localStorage.getItem(KEYP);
      if (pr) profiles = JSON.parse(pr);
    } catch { /* datos corruptos: arrancamos limpio */ }
  }

  /* ------------------------------------------------------------------ motor */
  function buildEngine() {
    const mix = MIXES[state.neg.mix] || MIXES.neutro;
    engine = E.build({
      chem: state.proc.chem,
      support: state.neg.support,
      ink: state.neg.ink,
      paper: state.proc.paper,
      toner: state.proc.toner,
      tonerAmount: state.proc.tonerAmount,
      oxidation: state.proc.oxidation,
      exposure: state.proc.exposure,
      printDmax: state.proc.printDmax,
      dr: state.neg.dr,
      black: state.neg.black,
      white: state.neg.white,
      gamma: state.neg.gamma,
      contrast: state.neg.contrast,
      calib: state.calib
    });
    engine.mix = mix.w;
    return engine;
  }

  /* --------------------------------------------------------------- dibujado */
  function groundBox() {
    const g = $('#ground');
    const pad = 26;
    return {
      w: Math.max(80, g.clientWidth - pad * 2),
      h: Math.max(80, g.clientHeight - pad * 2)
    };
  }

  function drawStage() {
    const canvas = $('#cv-main');
    const paper = $('#paper');
    if (!engine || !img) return;
    const box = groundBox();
    const ar = state.out.w / state.out.h;
    let cw = box.w, ch = cw / ar;
    if (ch > box.h) { ch = box.h; cw = ch * ar; }
    cw = Math.max(40, Math.floor(cw));
    ch = Math.max(40, Math.floor(ch));
    paper.style.width = cw + 'px';
    paper.style.height = ch + 'px';
    paper.style.setProperty('--paper', '#' + [engine.diag.paperTint.r, engine.diag.paperTint.g, engine.diag.paperTint.b]
      .map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
    R.drawPreview(canvas, {
      eng: engine, img: img, mode: state.mode,
      w: cw, h: ch, fit: state.out.fit, zoom: zoom,
      margin: state.out.margin, paperW: state.out.w, paperH: state.out.h,
      texture: state.proc.texture, mix: engine.mix
    });
    $('#stage-meta').textContent =
      (PAPER_SIZES[state.out.size] ? PAPER_SIZES[state.out.size].name.split(' · ')[0] : 'A medida') +
      ' · ' + state.out.w + ' × ' + state.out.h + ' mm';
  }

  /* textos de ayuda que dependen del estado */
  function syncHints() {
    if (!engine) return;
    const d = engine.diag;
    const chem = T.CHEM[state.proc.chem];
    ctrl.dr.setHint('La química pide ' + num(chem.range) + ' D · tu soporte llega a ' + num(d.dmaxSupport) + ' D');
    ctrl.dr.setActive(!state.neg.autoDr);
    const calibChip = document.getElementById('calib-chip');
    if (state.calib) {
      if (!calibChip) {
        const c = el('span', { class: 'chip good', id: 'calib-chip', text: 'perfil: ' + state.calib.name });
        document.getElementById('warnings').appendChild(c);
      } else {
        calibChip.textContent = 'perfil: ' + state.calib.name;
      }
    } else if (calibChip) {
      calibChip.remove();
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      buildEngine();
      drawStage();
      renderReadouts();
      syncHints();
    });
  }

  /* ------------------------------------------------------------- lecturas */
  function renderReadouts() {
    if (!engine) return;
    const d = engine.diag;
    const ro = $('#readouts');
    ro.textContent = '';
    const items = [
      ['Dmáx copia', num(d.densMax)],
      ['Dmín copia', num(d.densMin)],
      ['rango negativo', num(d.dr) + ' D'],
      ['tinta', Math.round(d.inkUsed * 100) + ' %']
    ];
    items.forEach(([k, v]) => {
      ro.appendChild(el('div', { class: 'readout' }, [
        el('span', { class: 'ro-k', text: k }),
        el('b', { text: v })
      ]));
    });

    const w = $('#warnings');
    w.textContent = '';
    const chips = [];
    if (d.capacityShort) chips.push(['bad', 'El film se queda en ' + num(d.dmaxSupport) + ' D']);
    else if (d.veiled) chips.push(['', 'Blancos velados: sobra exposición']);
    else if (d.weak) chips.push(['', 'Azul flojo: falta exposición']);
    else if (d.inkUsed > 0.95) chips.push(['', 'Tinta al límite: puede correrse']);
    else chips.push(['good', 'Cubre toda la escala']);
    chips.slice(0, 2).forEach(([cls, text]) => {
      w.appendChild(el('span', { class: 'chip ' + cls, text: text }));
    });
  }

  /* --------------------------------------------------------- panel negativo */
  const ctrl = {};

  function buildNegPanel() {
    const box = $('#controls-neg');
    box.textContent = '';

    ctrl.support = U.select({
      id: 'support', label: 'Soporte del negativo',
      value: state.neg.support,
      options: Object.keys(E.SUPPORT).map((k) => ({ value: k, label: E.SUPPORT[k].name })),
      hint: E.SUPPORT[state.neg.support].note,
      onChange: (v) => {
        state.neg.support = v;
        ctrl.support.setHint(E.SUPPORT[v].note);
        save(); schedule();
      }
    });

    ctrl.ink = U.swatches({
      id: 'ink', label: 'Tinta de bloqueo',
      value: state.neg.ink,
      hint: E.INK[state.neg.ink].note,
      options: Object.keys(E.INK).map((k) => ({
        value: k,
        label: E.INK[k].name,
        css: 'rgb(' + E.INK[k].rgb.join(',') + ')'
      })),
      onChange: (v) => {
        state.neg.ink = v;
        ctrl.ink.setHint(E.INK[v].note);
        save(); schedule();
      }
    });

    ctrl.dr = U.slider({
      id: 'dr', label: 'Rango del negativo',
      min: 0.4, max: 2.6, step: 0.05, value: state.neg.dr,
      fmt: (v) => v.toFixed(2) + ' log D',
      onInput: (v) => {
        state.neg.dr = v;
        state.neg.autoDr = false;
        ctrl.autoDr.set(false);
        save(); schedule();
      }
    });

    ctrl.autoDr = U.toggle({
      id: 'autodr', label: 'Ajustar al proceso',
      value: state.neg.autoDr,
      hint: 'Usa el rango que pide la química elegida.',
      onChange: (v) => {
        state.neg.autoDr = v;
        if (v) {
          state.neg.dr = T.CHEM[state.proc.chem].range;
          ctrl.dr.set(state.neg.dr);
        }
        save(); schedule();
      }
    });

    ctrl.black = U.slider({
      id: 'black', label: 'Punto negro',
      min: 0, max: 40, step: 1, value: state.neg.black,
      fmt: (v) => 'L ' + v,
      onInput: (v) => { state.neg.black = v; save(); schedule(); }
    });

    ctrl.white = U.slider({
      id: 'white', label: 'Punto blanco',
      min: 55, max: 100, step: 1, value: state.neg.white,
      fmt: (v) => 'L ' + v,
      onInput: (v) => { state.neg.white = v; save(); schedule(); }
    });

    ctrl.gamma = U.slider({
      id: 'gamma', label: 'Medios tonos',
      min: 0.5, max: 2, step: 0.02, value: state.neg.gamma,
      fmt: (v) => v.toFixed(2),
      onInput: (v) => { state.neg.gamma = v; save(); schedule(); }
    });

    ctrl.contrast = U.slider({
      id: 'contrast', label: 'Contraste de la curva',
      min: -1, max: 1, step: 0.05, value: state.neg.contrast,
      fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(2),
      onInput: (v) => { state.neg.contrast = v; save(); schedule(); }
    });

    ctrl.mix = U.select({
      id: 'mix', label: 'Mezcla a blanco y negro',
      value: state.neg.mix,
      options: Object.keys(MIXES).map((k) => ({ value: k, label: MIXES[k].name })),
      hint: 'Cómo se pesan los canales al pasar a gris.',
      onChange: (v) => { state.neg.mix = v; save(); schedule(); }
    });

    box.appendChild(U.group('Soporte y tinta', [ctrl.support.node, ctrl.ink.node]));
    box.appendChild(U.group('Rango y curva', [ctrl.dr.node, ctrl.autoDr.node, ctrl.black.node, ctrl.white.node, ctrl.gamma.node, ctrl.contrast.node]));
    box.appendChild(U.group('Imagen', [ctrl.mix.node]));
  }

  /* ---------------------------------------------------------- panel proceso */
  function buildPrintPanel() {
    const box = $('#controls-print');
    box.textContent = '';

    const chem0 = T.CHEM[state.proc.chem];
    ctrl.chem = U.select({
      id: 'chem', label: 'Química',
      value: state.proc.chem,
      options: Object.keys(T.CHEM).map((k) => ({ value: k, label: T.CHEM[k].name })),
      hint: chem0.note,
      onChange: (v) => {
        state.proc.chem = v;
        state.proc.printDmax = T.CHEM[v].printDmax;
        ctrl.chem.setHint(T.CHEM[v].note);
        ctrl.dmax.set(T.CHEM[v].printDmax);
        if (state.neg.autoDr) {
          state.neg.dr = T.CHEM[v].range;
          ctrl.dr.set(state.neg.dr);
        }
        save(); schedule();
      }
    });

    ctrl.exposure = U.slider({
      id: 'exposure', label: 'Exposición',
      min: -2, max: 2, step: 0.05, value: state.proc.exposure,
      fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(2) + ' pasos',
      hint: '0 = el tiempo con el que calibraste. Cada paso dobla o reduce a la mitad.',
      onInput: (v) => { state.proc.exposure = v; save(); schedule(); }
    });

    ctrl.dmax = U.slider({
      id: 'dmax', label: 'Azul máximo (Dmáx)',
      min: 0.9, max: 1.8, step: 0.02, value: state.proc.printDmax,
      fmt: (v) => v.toFixed(2) + ' log D',
      hint: 'Densidad de la copia terminada. Papel satinado aguanta algo más.',
      onInput: (v) => { state.proc.printDmax = v; save(); schedule(); }
    });

    ctrl.paper = U.select({
      id: 'paper', label: 'Papel',
      value: state.proc.paper,
      options: Object.keys(S.PAPER).map((k) => ({ value: k, label: S.PAPER[k].name })),
      onChange: (v) => { state.proc.paper = v; save(); schedule(); }
    });

    ctrl.oxid = U.slider({
      id: 'oxid', label: 'Oxidación',
      min: 0, max: 1, step: 0.02, value: state.proc.oxidation,
      fmt: (v) => (v > 0.98 ? 'estabilizada' : v < 0.1 ? 'recién lavada' : Math.round(v * 24) + ' h'),
      hint: 'El azul sube durante las primeras 24 h de secado.',
      onInput: (v) => { state.proc.oxidation = v; save(); schedule(); }
    });

    ctrl.texture = U.slider({
      id: 'texture', label: 'Grano del papel',
      min: 0, max: 1, step: 0.05, value: state.proc.texture,
      fmt: (v) => (v < 0.03 ? 'liso' : Math.round(v * 100) + ' %'),
      hint: 'Solo afecta a la previsualización.',
      onInput: (v) => { state.proc.texture = v; save(); schedule(); }
    });

    ctrl.toner = U.select({
      id: 'toner', label: 'Virado',
      hint: 'Te, tanino o café sobre la copia ya lavada.',
      value: state.proc.toner,
      options: Object.keys(S.TONER).map((k) => ({ value: k, label: S.TONER[k].name })),
      onChange: (v) => {
        state.proc.toner = v;
        ctrl.tonerAmt.node.style.display = v === 'ninguno' ? 'none' : '';
        save(); schedule();
      }
    });

    ctrl.tonerAmt = U.slider({
      id: 'toneramt', label: 'Intensidad del virado',
      min: 0, max: 1, step: 0.05, value: state.proc.tonerAmount,
      fmt: (v) => Math.round(v * 100) + ' %',
      onInput: (v) => { state.proc.tonerAmount = v; save(); schedule(); }
    });

    box.appendChild(U.group('Proceso', [ctrl.chem.node, ctrl.exposure.node, ctrl.dmax.node]));
    box.appendChild(U.group('Material', [ctrl.paper.node, ctrl.oxid.node, ctrl.texture.node]));
    ctrl.tonerAmt.node.style.display = state.proc.toner === 'ninguno' ? 'none' : '';
    box.appendChild(U.group('Virado', [ctrl.toner.node, ctrl.tonerAmt.node]));
  }

  /* --------------------------------------------------------------- salida */
  function buildOutPanel() {
    const box = $('#controls-out');
    box.textContent = '';

    ctrl.size = U.select({
      id: 'size', label: 'Tamaño de papel',
      value: state.out.size,
      options: Object.keys(PAPER_SIZES).map((k) => ({ value: k, label: PAPER_SIZES[k].name })),
      onChange: (v) => {
        state.out.size = v;
        if (v !== 'custom') {
          state.out.w = PAPER_SIZES[v].w;
          state.out.h = PAPER_SIZES[v].h;
        }
        save(); schedule(); syncOut();
      }
    });

    ctrl.mmW = U.number({
      id: 'mmw', label: 'Ancho (mm)', min: 40, max: 330, step: 1, value: state.out.w,
      onInput: (v) => { state.out.w = v; state.out.size = 'custom'; ctrl.size.set('custom'); save(); schedule(); syncOut(); }
    });
    ctrl.mmH = U.number({
      id: 'mmh', label: 'Alto (mm)', min: 40, max: 480, step: 1, value: state.out.h,
      onInput: (v) => { state.out.h = v; state.out.size = 'custom'; ctrl.size.set('custom'); save(); schedule(); syncOut(); }
    });

    ctrl.margin = U.slider({
      id: 'margin', label: 'Margen',
      min: 0, max: 20, step: 1, value: state.out.margin,
      fmt: (v) => v + ' mm',
      hint: 'La ET-2865 no imprime hasta el borde salvo que actives sin márgenes.',
      onInput: (v) => { state.out.margin = v; save(); }
    });

    ctrl.fit = U.select({
      id: 'fit', label: 'Encaje de la imagen',
      value: state.out.fit,
      options: [
        { value: 'cover', label: 'Recortar para llenar' },
        { value: 'contain', label: 'Encajar entera' },
        { value: 'width', label: 'Ajustar al ancho' }
      ],
      onChange: (v) => { state.out.fit = v; save(); schedule(); }
    });

    ctrl.dpi = U.select({
      id: 'dpi', label: 'Resolución',
      value: String(state.out.dpi),
      options: [
        { value: '360', label: '360 ppp' },
        { value: '720', label: '720 ppp (máxima)' }
      ],
      hint: '360 es la base nativa del cabezal; 720 duplica el archivo.',
      onChange: (v) => { state.out.dpi = +v; save(); syncOut(); }
    });

    ctrl.mirror = U.toggle({
      id: 'mirror', label: 'Espejar el negativo',
      value: state.out.mirror,
      hint: 'Va con la tinta contra el papel: sin espejar, la copia sale invertida.',
      onChange: (v) => { state.out.mirror = v; save(); }
    });

    ctrl.marks = U.toggle({
      id: 'marks', label: 'Marcas de corte y etiqueta',
      value: state.out.marks,
      onChange: (v) => { state.out.marks = v; save(); }
    });

    box.appendChild(U.group('Papel', [ctrl.size.node, ctrl.mmW.node, ctrl.mmH.node, ctrl.margin.node]));
    box.appendChild(U.group('Imagen', [ctrl.fit.node]));
    box.appendChild(U.group('Archivo', [ctrl.dpi.node, ctrl.mirror.node, ctrl.marks.node]));
  }

  function syncOut() {
    const custom = state.out.size === 'custom';
    ctrl.mmW.node.style.display = custom ? '' : 'none';
    ctrl.mmH.node.style.display = custom ? '' : 'none';
    const dpi = state.out.dpi;
    const w = Math.round((state.out.w / 25.4) * dpi);
    const h = Math.round((state.out.h / 25.4) * dpi);
    const mp = ((w * h) / 1e6).toFixed(1);
    const hint = $('#out-hint');
    if (hint) hint.textContent = w + ' × ' + h + ' px · ' + String(mp).replace('.', ',') + ' Mpx · ' + (state.out.w + ' × ' + state.out.h) + ' mm';
    drawRecipe();
  }

  function drawRecipe() {
    const dl = $('#recipe-list');
    if (!dl) return;
    dl.textContent = '';
    const ink = E.INK[state.neg.ink];
    const rows = [
      ['Modo de color', ink.mode],
      ['Tipo de papel', 'Premium Presentation Matte'],
      ['Carga', 'Film sobre el papel mate, cara brillante arriba'],
      ['Calidad', 'Alta · sin alta velocidad'],
      ['Gestión de color', 'Desactivada'],
      ['Gamma', '2,2 · sin corrección automática'],
      ['Escala', '100 % (sin ajustar a página)'],
      ['Resolución', '720 ppp máx · 360 ppp suficiente'],
      ['Tinta', ink.name + ' · ' + ink.rgb.join('/')]
    ];
    rows.forEach(([k, v]) => {
      dl.appendChild(el('div', { class: 'recipe-row' }, [
        el('dt', { text: k }),
        el('dd', { text: v })
      ]));
    });
  }

  /* ------------------------------------------------------------- apertura */
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) {
      U.toast('Eso no es una imagen');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        img = image;
        imgName = file.name || 'imagen';
        $('#file-name').textContent = imgName;
        $('#file-name').title = imgName;
        $('#drop-hint').hidden = true;
        zoom = 1;
        schedule();
      };
      image.onerror = () => U.toast('No he podido abrir esa imagen');
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function loadSample() {
    const url = P.SAMPLE || 'public/sample.jpg';
    const image = new Image();
    image.onload = () => {
      img = image;
      imgName = 'blossfeldt · ejemplo';
      $('#file-name').textContent = 'ejemplo: Karl Blossfeldt, 1928';
      $('#drop-hint').hidden = true;
      schedule();
    };
    image.src = url;
  }

  /* --------------------------------------------------------------- vistas */
  function setView(v) {
    state.view = v;
    document.querySelectorAll('.tab').forEach((t) => {
      const on = t.dataset.view === v;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.view').forEach((s) => {
      s.classList.toggle('is-active', s.id === 'view-' + v);
    });
    if (v === 'calibrar') { drawCalSheetPreview(); renderProfiles(); }
    if (v === 'imprimir') { syncOut(); }
    if (v === 'revelar') setTimeout(drawStage, 30);
  }

  /* ---------------------------------------------------------- calibración */
  let calPhoto = null;
  let calQuad = null;

  function drawCalSheetPreview() {
    const c = $('#cal-sheet');
    P.sheets.drawCalSheet(c, {
      dpi: 100,
      inkRGB: E.INK[state.neg.ink].rgb
    });
    c.style.width = '100%';
    c.style.maxWidth = '300px';
    c.style.height = 'auto';
  }

  function calSheetFull() {
    const c = document.createElement('canvas');
    P.sheets.drawCalSheet(c, { dpi: 300, inkRGB: E.INK[state.neg.ink].rgb });
    return c;
  }

  function setupCalPhoto(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        calPhoto = image;
        const c = $('#cal-photo');
        const maxW = Math.min(680, ($('#view-calibrar').clientWidth || 700) - 120);
        const s = Math.min(1, maxW / image.width);
        c.width = Math.round(image.width * s);
        c.height = Math.round(image.height * s);
        c.style.width = c.width + 'px';
        const g = c.getContext('2d');
        g.drawImage(image, 0, 0, c.width, c.height);
        calQuad = [
          [c.width * 0.08, c.height * 0.40],
          [c.width * 0.92, c.height * 0.40],
          [c.width * 0.92, c.height * 0.60],
          [c.width * 0.08, c.height * 0.60]
        ];
        $('#cal-align').hidden = false;
        paintCalQuad();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function paintCalQuad() {
    const c = $('#cal-photo');
    if (!c || !calPhoto) return;
    const g = c.getContext('2d');
    g.drawImage(calPhoto, 0, 0, c.width, c.height);
    g.save();
    g.strokeStyle = 'rgba(78,140,201,0.95)';
    g.lineWidth = 1.5;
    g.setLineDash([6, 4]);
    g.beginPath();
    calQuad.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.stroke();
    g.setLineDash([]);
    // divisiones de los 21 pasos
    for (let i = 0; i <= 21; i++) {
      const u = i / 21;
      const top = [calQuad[0][0] + (calQuad[1][0] - calQuad[0][0]) * u, calQuad[0][1] + (calQuad[1][1] - calQuad[0][1]) * u];
      const bot = [calQuad[3][0] + (calQuad[2][0] - calQuad[3][0]) * u, calQuad[3][1] + (calQuad[2][1] - calQuad[3][1]) * u];
      g.strokeStyle = 'rgba(255,255,255,0.28)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(top[0], top[1]);
      g.lineTo(bot[0], bot[1]);
      g.stroke();
    }
    calQuad.forEach((p) => {
      g.fillStyle = '#4e8cc9';
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(p[0], p[1], 7, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    });
    g.restore();
  }

  function analyzeCal() {
    const c = $('#cal-photo');
    if (!c || !calQuad) return;
    const g = c.getContext('2d');
    const data = g.getImageData(0, 0, c.width, c.height);
    const samples = P.calib.sampleStrip(data, calQuad, 21);
    const an = P.calib.analyze(samples);
    calAnalysis = an;
    $('#cal-result').hidden = false;
    P.sheets.drawCurve($('#cal-curve'), an.xs, an.ys, { residual: 'residuo ' + (an.noise / 255).toFixed(3) });
    const st = $('#cal-stats');
    st.textContent = '';
    [
      ['pasos leídos', '21 de 21'],
      ['mesetas', String(an.plateau)],
      ['inversiones', String(an.inversions)],
      ['ruido', an.noise.toFixed(0)]
    ].forEach(([k, v]) => {
      st.appendChild(el('div', { class: 'readout' }, [el('span', { class: 'ro-k', text: k }), el('b', { text: v })]));
    });
    const dg = $('#cal-diagnosis');
    dg.textContent = an.warnings.length
      ? an.warnings.map((w) => w.text).join(' ')
      : 'La tira se lee bien: 21 pasos monótonos, sin mesetas. Guarda el perfil y úsalo con todas tus imágenes.';
    $('#cal-name').value = $('#cal-name').value || ('Perfil ' + new Date().toLocaleDateString('es-ES'));
  }

  let calAnalysis = null;

  function renderProfiles() {
    const box = $('#profiles');
    if (!box) return;
    box.textContent = '';
    if (!profiles.length) return;
    profiles.forEach((p, i) => {
      const active = state.calib && state.calib.id === p.id;
      box.appendChild(el('div', { class: 'profile' }, [
        el('span', { class: 'profile-name', text: p.name }),
        el('span', { class: 'profile-meta', text: new Date(p.date).toLocaleDateString('es-ES') }),
        el('button', {
          class: 'btn btn-quiet', text: active ? 'En uso' : 'Aplicar',
          onclick: () => {
            state.calib = active ? null : p;
            U.toast(active ? 'Perfil desactivado' : 'Perfil aplicado: ' + p.name);
            save(); renderProfiles(); schedule();
          }
        }),
        el('button', {
          class: 'btn btn-quiet', text: 'Quitar',
          onclick: () => {
            profiles.splice(i, 1);
            if (state.calib && state.calib.id === p.id) state.calib = null;
            save(); renderProfiles(); schedule();
          }
        })
      ]));
    });
  }

  /* ------------------------------------------------------------- exportar */
  function currentLabel() {
    const d = new Date();
    return imgName.replace(/\.[^.]+$/, '') + ' · ' + state.out.w + 'x' + state.out.h + 'mm · ' +
      d.toLocaleDateString('es-ES');
  }

  function makeNegative() {
    if (!img) { U.toast('Carga una imagen primero'); return null; }
    return R.renderNegative({
      eng: engine, img: img, dpi: state.out.dpi,
      paperW: state.out.w, paperH: state.out.h,
      margin: state.out.margin, fit: state.out.fit,
      mirror: state.out.mirror, marks: state.out.marks,
      mix: engine.mix, label: currentLabel()
    });
  }

  function download(canvas, name, onFail) {
    const done = (url, revoke) => {
      const a = el('a', { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) { if (onFail) onFail(); return; }
        done(URL.createObjectURL(blob), true);
      }, 'image/png');
    } else {
      done(canvas.toDataURL('image/png'), false);
    }
  }

  /* un botón que tarda no puede parecer roto: se desactiva y lo dice */
  function busy(btn, label, work) {
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    const restore = () => { btn.disabled = false; btn.textContent = prev; };
    setTimeout(() => {
      try { work(restore); } catch (err) { restore(); U.toast('No se pudo generar el archivo'); }
    }, 24);
  }

  function doExport() {
    const btn = $('#btn-export');
    busy(btn, 'Preparando…', (restore) => {
      const neg = makeNegative();
      if (!neg) { restore(); return; }
      download(neg.canvas, (imgName.replace(/\.[^.]+$/, '') || 'negativo') + '-negativo-' + state.out.dpi + 'ppp.png', () => {
        restore();
        U.toast('El navegador no ha podido crear un PNG tan grande');
      });
      restore();
      U.toast('Negativo guardado · ' + neg.w + ' × ' + neg.h + ' px');
    });
  }

  /* -------------------------------------------------------------- imprimir */
  function printCanvas(canvas, wmm, hmm) {
    let area = document.getElementById('print-area');
    if (!area) {
      area = el('div', { id: 'print-area' });
      document.body.appendChild(area);
    }
    area.textContent = '';
    canvas.style.width = wmm + 'mm';
    canvas.style.height = hmm + 'mm';
    area.appendChild(canvas);
    let style = document.getElementById('print-page');
    if (!style) {
      style = el('style', { id: 'print-page' });
      document.head.appendChild(style);
    }
    style.textContent = '@page { size: ' + wmm + 'mm ' + hmm + 'mm; margin: 0 }' +
      '@media print { body > *:not(#print-area) { display: none !important }' +
      '#print-area { display: block; position: absolute; inset: 0 }' +
      '#print-area canvas { display: block } }';
    document.body.classList.add('is-printing');
    const after = () => {
      document.body.classList.remove('is-printing');
      window.removeEventListener('afterprint', after);
      area.textContent = '';
    };
    window.addEventListener('afterprint', after);
    setTimeout(() => {
      window.print();
      setTimeout(after, 1500);
    }, 60);
    U.toast('En el diálogo: escala 100 %, sin ajustar a página');
  }

  function doPrint() {
    const neg = makeNegative();
    if (!neg) return;
    printCanvas(neg.canvas, state.out.w, state.out.h);
  }

  function doRuler() {
    const c = R.renderRuler(300);
    printCanvas(c, 210, 297);
  }

  /* ------------------------------------------------------------- eventos */
  function bind() {
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => setView(t.dataset.view));
    });

    $('#btn-open').addEventListener('click', () => $('#file-input').click());
    $('#file-input').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) loadFile(files[0]);
      if (files.length > 1) U.toast(files.length + ' imágenes: se usa la primera');
      e.target.value = '';
    });
    $('#btn-sample').addEventListener('click', loadSample);

    document.querySelectorAll('#mode-seg button').forEach((b) => {
      b.addEventListener('click', () => {
        state.mode = b.dataset.mode;
        document.querySelectorAll('#mode-seg button').forEach((x) => x.classList.toggle('is-active', x === b));
        drawStage();
      });
    });

    const ground = $('#ground');
    ['dragenter', 'dragover'].forEach((ev) => ground.addEventListener(ev, (e) => {
      e.preventDefault();
      ground.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach((ev) => ground.addEventListener(ev, (e) => {
      e.preventDefault();
      ground.classList.remove('is-over');
    }));
    ground.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    });

    document.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type && it.type.indexOf('image') === 0) {
          const f = it.getAsFile();
          if (f) { loadFile(f); e.preventDefault(); }
          return;
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing && !e.metaKey && !e.ctrlKey) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#file-input').click(); }
      else if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); doExport(); }
      else if (meta && e.key.toLowerCase() === 'p') { e.preventDefault(); doPrint(); }
      else if (e.key === '1') setView('revelar');
      else if (e.key === '2') setView('calibrar');
      else if (e.key === '3') setView('imprimir');
    });

    // calibración
    $('#btn-cal-sheet').addEventListener('click', () => {
      const c = calSheetFull();
      printCanvas(c, 210, 297);
    });
    $('#btn-cal-save').addEventListener('click', () => download(calSheetFull(), 'prusia-carta-calibracion.png'));
    $('#btn-cal-photo').addEventListener('click', () => $('#cal-file').click());
    $('#cal-file').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) setupCalPhoto(f);
      e.target.value = '';
    });
    $('#btn-cal-analyze').addEventListener('click', analyzeCal);
    $('#btn-cal-reset').addEventListener('click', () => {
      $('#cal-align').hidden = true;
      $('#cal-result').hidden = true;
      calPhoto = null;
    });
    $('#btn-cal-save-profile').addEventListener('click', () => {
      if (!calAnalysis) return;
      const prof = P.calib.makeProfile(calAnalysis, {
        name: $('#cal-name').value || 'Perfil',
        chem: state.proc.chem,
        ink: state.neg.ink,
        support: state.neg.support,
        exposure: state.proc.exposure
      });
      profiles.push(prof);
      state.calib = prof;
      save();
      renderProfiles();
      schedule();
      U.toast('Perfil guardado y aplicado');
    });
    $('#btn-cal-manual').addEventListener('click', () => {
      U.toast('Método manual: usa el paso 1 y anota dónde sale blanco y negro pleno');
    });

    // arrastre de esquinas
    const photo = $('#cal-photo');
    let drag = -1;
    const hit = (x, y) => {
      for (let i = 0; i < calQuad.length; i++) {
        const d = Math.hypot(calQuad[i][0] - x, calQuad[i][1] - y);
        if (d < 26) return i;
      }
      return -1;
    };
    const pos = (e) => {
      const r = photo.getBoundingClientRect();
      return [(e.clientX - r.left) * (photo.width / r.width), (e.clientY - r.top) * (photo.height / r.height)];
    };
    photo.addEventListener('pointerdown', (e) => {
      if (!calQuad) return;
      const p = pos(e);
      drag = hit(p[0], p[1]);
      if (drag >= 0) { photo.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    photo.addEventListener('pointermove', (e) => {
      if (drag < 0 || !calQuad) return;
      const p = pos(e);
      calQuad[drag] = p;
      paintCalQuad();
    });
    photo.addEventListener('pointerup', (e) => {
      if (drag >= 0 && photo.releasePointerCapture) {
        try { photo.releasePointerCapture(e.pointerId); } catch { /* nada */ }
      }
      drag = -1;
    });

    // salida
    $('#btn-export').addEventListener('click', doExport);
    $('#btn-print').addEventListener('click', doPrint);
    $('#btn-ruler').addEventListener('click', doRuler);

    window.addEventListener('resize', () => {
      if (state.view === 'revelar') drawStage();
    });

    // zoom con rueda sobre el escenario
    $('#ground').addEventListener('wheel', (e) => {
      if (!e.altKey) return;
      e.preventDefault();
      zoom = Math.max(0.5, Math.min(3, zoom * (e.deltaY > 0 ? 0.94 : 1.06)));
      drawStage();
    }, { passive: false });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    restore();
    buildNegPanel();
    buildPrintPanel();
    buildOutPanel();
    bind();
    buildEngine();
    syncOut();
    drawRecipe();
    loadSample();
    $('#drop-hint').hidden = true;
    renderProfiles();
    if (!img) $('#drop-hint').hidden = false;
  }

  window.__prusia = {
    state: state,
    engine: () => engine,
    negative: () => makeNegative(),
    profiles: () => profiles
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.P = window.P || {});
