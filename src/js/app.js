/* Prusia — app.js
 * Estado, bandeja de herramientas y todo lo que pasa cuando tocas algo.
 *
 * La app es una sola superficie: la foto en medio y una bandeja de
 * herramientas abajo. Abrir una herramienta hace crecer la bandeja hacia
 * arriba; el último control tocado queda «armado» y responde al arrastre
 * sobre la foto, como en Snapseed. Todo cambio entra en un historial que se
 * deshace con ⌘Z.
 */
(function (P) {
  'use strict';
  const U = P.ui, el = U.el, S = P.sci, T = P.tone, E = P.engine, R = P.render, D = P.develop;
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
    out: { size: 'a4', w: 210, h: 297, margin: 6, fit: 'cover', dpi: 360, mirror: true, marks: true },
    cal: { steps: 21 }
  };

  const state = JSON.parse(JSON.stringify(DEFAULTS));
  state.view = 'revelar';
  state.mode = 'print';
  state.calib = null;
  state.dev = D.defaults();
  state.look = { id: 'ninguno', strength: 1 };
  state.tool = null;
  state.zoom = 1;
  state.raw = false;

  let profiles = [];
  let img = null;
  let imgName = '';
  let engine = null;
  let pending = false;
  let fast = false;
  let engHash = '';
  let imgRev = 0;

  /* ------------------------------------------------------------ persistencia */
  const KEY = 'prusia.state.v3';
  const KEYP = 'prusia.profiles.v2';

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        neg: state.neg, proc: state.proc, out: state.out, cal: state.cal,
        dev: state.dev, look: state.look
      }));
      localStorage.setItem(KEYP, JSON.stringify(profiles));
    } catch (_e) { /* modo privado: seguimos sin guardar */ }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o.neg) Object.assign(state.neg, o.neg);
        if (o.proc) Object.assign(state.proc, o.proc);
        if (o.out) Object.assign(state.out, o.out);
        if (o.cal) Object.assign(state.cal, o.cal);
        if (o.dev) Object.assign(state.dev, o.dev);
        if (o.look) Object.assign(state.look, o.look);
      }
      const pr = localStorage.getItem(KEYP);
      if (pr) profiles = JSON.parse(pr);
    } catch (_e) { /* datos corruptos: arrancamos limpio */ }
  }

  /* -------------------------------------------------------------- historial */
  const SLICES = ['neg', 'proc', 'out', 'dev', 'look'];
  let hist = [];
  let histIdx = -1;

  function snap() {
    const o = {};
    SLICES.forEach((k) => { o[k] = state[k]; });
    return JSON.stringify(o);
  }
  function pushHistory(label, merge) {
    const s = snap();
    const now = Date.now();
    const top = hist[histIdx];
    if (top && top.s === s) return;
    if (merge && top && top.label === label && now - top.t < 900) {
      top.s = s; top.t = now;            // misma rueda: se refunde en una entrada
    } else {
      hist = hist.slice(0, histIdx + 1);
      hist.push({ s: s, label: label, t: now });
      if (hist.length > 80) hist.shift();
      histIdx = hist.length - 1;
    }
    paintHistBtns();
    if (!$('#stackpanel').hidden) paintStack();
  }
  function applySnap(s) {
    const o = JSON.parse(s);
    SLICES.forEach((k) => {
      if (!o[k]) return;
      if (typeof o[k] === 'object') {
        Object.keys(state[k]).forEach((kk) => { delete state[k][kk]; });
        Object.assign(state[k], o[k]);
      } else state[k] = o[k];
    });
    engHash = '';
    if (state.look && state.look.id === 'ninguno') {
      // el estilo «sin estilo» implica revelado neutro
      Object.assign(state.dev, D.defaults());
    }
    buildEngine();
    rebuildSheet();
    drawStage();
    renderReadouts();
    syncHints();
    syncOut();
    save();
  }
  function undo() {
    if (histIdx <= 0) return;
    histIdx--;
    applySnap(hist[histIdx].s);
    U.toast('Deshecho · ' + (hist[histIdx + 1] ? hist[histIdx + 1].label : ''));
  }
  function redo() {
    if (histIdx >= hist.length - 1) return;
    histIdx++;
    applySnap(hist[histIdx].s);
  }
  function paintHistBtns() {
    const u = $('#btn-undo'), r = $('#btn-redo');
    if (!u) return;
    u.disabled = histIdx <= 0;
    r.disabled = histIdx >= hist.length - 1;
  }

  /* ------------------------------------------------------------------ motor */
  function buildEngine(force) {
    const mix = MIXES[state.neg.mix] || MIXES.neutro;
    const h = JSON.stringify([state.neg, state.proc, state.calib]);
    if (!force && h === engHash && engine) { engine.mix = mix.w; return; }
    engHash = h;
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
  }

  /* --------------------------------------------------------------- dibujado */
  function groundBox() {
    const g = $('#ground');
    const paper = $('#paper');
    /* El suelo es un grid: si el papel ya está grande, agranda el suelo y la
       medida se realimenta (el papel nunca encoge). Se colapsa un instante
       para medir el hueco de verdad. */
    const pw = paper.style.width, ph = paper.style.height;
    paper.style.width = '0px';
    paper.style.height = '0px';
    const w = g.clientWidth, h = g.clientHeight;
    paper.style.width = pw;
    paper.style.height = ph;
    /* clientWidth/Height incluyen el padding, y aquí el padding es el aire que
       se le deja al panel de herramientas: se descuenta tal cual. */
    const cs = getComputedStyle(g);
    const px = (v) => parseFloat(v) || 0;
    return {
      w: Math.max(80, w - px(cs.paddingLeft) - px(cs.paddingRight)),
      h: Math.max(80, h - px(cs.paddingTop) - px(cs.paddingBottom))
    };
  }

  let devSig = '';
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

    const useDev = !state.raw && !D.isNeutral(state.dev);
    const mode = state.raw ? 'orig' : state.mode;
    if (!devSig) devSig = JSON.stringify(state.dev);
    R.drawPreview(canvas, {
      eng: engine, img: img, mode: mode,
      w: cw, h: ch, fit: state.out.fit, zoom: state.zoom,
      margin: state.out.margin, paperW: state.out.w, paperH: state.out.h,
      texture: state.proc.texture, mix: engine.mix,
      develop: useDev ? state.dev : null,
      devKey: useDev ? devSig + ':' + imgRev : '',
      quality: fast ? 0.62 : 1,
      cache: devCache
    });
    $('#stage-meta').textContent =
      (PAPER_SIZES[state.out.size] ? PAPER_SIZES[state.out.size].name.split(' · ')[0] : 'A medida') +
      ' · ' + state.out.w + ' × ' + state.out.h + ' mm' + (state.raw ? ' · original' : '');
  }

  const devCache = { key: '', data: null };

  /* textos de ayuda que dependen del estado */
  function syncHints() {
    if (!engine) return;
    const d = engine.diag;
    const chem = T.CHEM[state.proc.chem];
    if (ctrl.dr) {
      ctrl.dr.setHint('La química pide ' + num(chem.range) + ' D · tu soporte llega a ' + num(d.dmaxSupport) + ' D');
      ctrl.dr.setActive(!state.neg.autoDr);
    }
    const calibChip = document.getElementById('calib-chip');
    if (state.calib) {
      if (!calibChip) {
        const c = el('span', { class: 'chip good', id: 'calib-chip', text: 'perfil: ' + state.calib.name });
        $('#warnings').appendChild(c);
      } else {
        calibChip.textContent = 'perfil: ' + state.calib.name;
      }
    } else if (calibChip) {
      calibChip.remove();
    }
    paintDirty();
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

  /* un cambio de usuario: guarda, apunta en el historial y repinta */
  let saveT = null;
  let mergeable = false;   // ¿este cambio viene de arrastrar un deslizador?
  function touch(label) {
    if (saveT) clearTimeout(saveT);
    saveT = setTimeout(save, 450);
    pushHistory(label, mergeable);
    mergeable = false;
    devSig = '';
    schedule();
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

    const alert = $('#sheet-alert');
    if (alert) {
      alert.textContent = '';
      if (d.capacityShort || d.veiled || d.weak) {
        alert.hidden = false;
        alert.appendChild(el('span', { class: 'chip ' + (d.capacityShort ? 'bad' : ''), text: chips[0][1] }));
      } else {
        alert.hidden = true;
      }
    }
  }

  /* ================================================== bandeja de herramientas */
  const ICON = {
    estilos: '<rect x="3.5" y="3.5" width="7.4" height="7.4" rx="1.7"/><rect x="13.1" y="3.5" width="7.4" height="7.4" rx="1.7"/><rect x="3.5" y="13.1" width="7.4" height="7.4" rx="1.7"/><rect x="13.1" y="13.1" width="7.4" height="7.4" rx="1.7"/>',
    enfoque: '<path d="M4 8.5V5.6A1.6 1.6 0 0 1 5.6 4h2.9"/><path d="M20 8.5V5.6A1.6 1.6 0 0 0 18.4 4h-2.9"/><path d="M4 15.5v2.9A1.6 1.6 0 0 0 5.6 20h2.9"/><path d="M20 15.5v2.9A1.6 1.6 0 0 1 18.4 20h-2.9"/><circle cx="12" cy="12" r="2.2"/>',
    lente: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.1"/><path d="M12 3.6v3.6M12 16.8v3.6M3.6 12h3.6M16.8 12h3.6"/>',
    efectos: '<path d="M12 3.4l1.9 4.6 4.6 1.9-4.6 1.9L12 16.4l-1.9-4.6L5.5 9.9l4.6-1.9z"/><path d="M18.4 15.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
    ajustes: '<path d="M4 7.5h5.5M14 7.5h6M4 16.5h6M14.5 16.5H20"/><circle cx="11.6" cy="7.5" r="2.1"/><circle cx="12.1" cy="16.5" r="2.1"/>',
    negativo: '<circle cx="12" cy="12" r="8.4"/><path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke="none"/>',
    quimica: '<circle cx="12" cy="11" r="4.2"/><path d="M12 2.6v1.8M12 17.6v1.8M3.6 11H5.4M18.6 11h1.8M6.1 5.1l1.3 1.3M16.6 15.6l1.3 1.3M17.9 5.1l-1.3 1.3M7.4 15.6l-1.3 1.3"/>',
    ver: '<path d="M2.6 12S6 6.2 12 6.2 21.4 12 21.4 12 18 17.8 12 17.8 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.6"/>',
    salida: '<path d="M12 3.6v10.2"/><path d="M8.4 10.4L12 14l3.6-3.6"/><path d="M4.4 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8v-2.2"/>',
    fuentes: '<circle cx="12" cy="12" r="8.4"/><path d="M12 10.8v5.4"/><circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none"/>'
  };

  const TOOLS = [
    { id: 'estilos', name: 'Estilos', note: 'Estilos de revelado, medidos sobre tu foto' },
    { id: 'enfoque', name: 'Enfoque', note: 'Nitidez, estructura y claridad' },
    { id: 'lente', name: 'Desenfoque', note: 'Profundidad de campo sobre un foco elíptico' },
    { id: 'efectos', name: 'Efectos', note: 'Grano, viñeta, brillo, contraste tonal, emulsión' },
    { id: 'ajustes', name: 'Ajustes', note: 'Punto negro y blanco, medios tonos, contraste' },
    { id: 'negativo', name: 'Negativo', note: 'Soporte, tinta de bloqueo y rango' },
    { id: 'quimica', name: 'Cianotipia', note: 'Química, exposición, papel y virado' },
    { id: 'ver', name: 'Ver', note: 'Qué se muestra, zoom y comparación' },
    { id: 'salida', name: 'Salida', note: 'Tamaño, resolución y exportación' },
    { id: 'fuentes', name: 'Fuentes', note: 'De dónde sale cada número' }
  ];

  let sliders = [];      // controles que responden al arrastre
  let armed = null;      // el control armado ahora mismo

  /* iconos: SVG estático del propio código, creado con el parser del DOM
     (sin innerHTML, y sin datos que vengan de fuera) */
  function svgIcon(paths) {
    const doc = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>',
      'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  }

  function buildRail() {
    const rail = $('#tray-rail');
    rail.textContent = '';
    TOOLS.forEach((t) => {
      const b = el('button', {
        class: 'tool', 'aria-pressed': 'false', dataset: { tool: t.id }, title: t.note
      }, [
        el('span', { class: 'tool-ico' }, [svgIcon(ICON[t.id])]),
        el('span', { class: 'tool-name', text: t.name })
      ]);
      b.addEventListener('click', () => openTool(state.tool === t.id ? null : t.id));
      rail.appendChild(b);
    });
  }

  function openTool(id) {
    state.tool = id;
    document.querySelectorAll('.tool').forEach((b) => {
      const on = b.dataset.tool === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const sheet = $('#tray-sheet');
    if (!id) {
      sheet.hidden = true;
      armed = null;
      $('#drag-pill').hidden = true;
      fitGround();
      return;
    }
    sheet.hidden = false;
    rebuildSheet();
  }

  function rebuildSheet() {
    const id = state.tool;
    if (!id) return;
    const t = TOOLS.find((x) => x.id === id);
    $('#sheet-title').textContent = t.name;
    $('#sheet-note').textContent = t.note;
    const body = $('#sheet-body');
    body.textContent = '';
    sliders = [];
    armed = null;
    const api = {
      body: body,
      slider: (o) => regSlider(U.slider(o), o),
      select: (o) =>
        U.select(o),
      toggle: (o) => U.toggle(o),
      swatches: (o) => U.swatches(o),
      number: (o) => U.number(o),
      group: (title, kids) => U.group(title, kids),
      wide: (node) => { node.classList.add('sheet-wide'); return node; }
    };
    BUILD[id](api);
    $('#sheet-reset').hidden = id === 'fuentes';
    if (sliders.length) arm(sliders[0]);
    else $('#drag-pill').hidden = true;
    paintDirty();
    requestAnimationFrame(() => {
      fitGround();
      const sh = $('#tray-sheet');
      sh.classList.toggle('has-overflow', sh.scrollHeight > sh.clientHeight + 2);
    });
  }

  /* La rejilla del estudio ya recoloca la foto al abrir o cerrar el panel;
     aquí sólo hay que volver a medir y pintar. */
  function fitGround() {
    requestAnimationFrame(drawStage);
  }

  /* Un slider registrado: además del control normal, responde al arrastre
     sobre la foto y a las flechas del teclado cuando está armado. */
  function regSlider(ctl, o) {
    const node = ctl.node;
    const input = node.querySelector('input[type="range"]');
    const rec = {
      node: node, input: input, label: o.label,
      min: o.min, max: o.max, step: o.step || 1, fmt: o.fmt || ((v) => String(v)),
      set: (v) => {
        mergeable = true;
        v = Math.max(o.min, Math.min(o.max, v));
        v = Math.round(v / (o.step || 1)) * (o.step || 1);
        input.value = v;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      value: () => +input.value
    };
    sliders.push(rec);
    /* Arrastrar el mando o deslizar sobre la foto es un gesto continuo: sus
       pasos se funden en una sola entrada del historial. Un clic en un estilo,
       en cambio, siempre deja su propia entrada. */
    input.addEventListener('input', () => { mergeable = true; });
    node.addEventListener('pointerdown', () => arm(rec));
    if (input) input.addEventListener('focus', () => arm(rec));
    return ctl;
  }

  function arm(rec) {
    if (!rec) return;
    armed = rec;
    sliders.forEach((s) => s.node.classList.toggle('is-armed', s === rec));
    const pill = $('#drag-pill');
    pill.hidden = false;
    $('#dp-k').textContent = rec.label;
    $('#dp-v').textContent = rec.fmt(rec.value());
  }

  function paintPill() {
    if (!armed) return;
    $('#dp-v').textContent = armed.fmt(armed.value());
  }

  /* ----------------------------------------------------------- herramientas */
  const BUILD = {};

  /* ---- Estilos ---- */
  BUILD.estilos = (api) => {
    const row = el('div', { class: 'looks', role: 'group', 'aria-label': 'Estilos' });
    const badges = {};
    const strength = api.slider({
      id: 'lookstr', label: 'Intensidad del estilo',
      min: 0, max: 1, step: 0.02, value: state.look.strength == null ? 1 : state.look.strength,
      fmt: (v) => Math.round(v * 100) + ' %',
      onInput: (v) => {
        state.look.strength = v;
        if (state.look.id !== 'ninguno') {
          Object.assign(state.dev, P.looks.paramsFor(state.look.id, v));
        }
        touch('Estilo');
      }
    });
    if (state.look.id === 'ninguno') strength.node.style.opacity = '0.4';

    P.looks.LIST.forEach((look) => {
      const cv = document.createElement('canvas');
      cv.width = 156; cv.height = 156;
      const btn = el('button', {
        class: 'look' + (state.look.id === look.id ? ' is-active' : ''),
        'aria-pressed': state.look.id === look.id ? 'true' : 'false',
        dataset: { look: look.id }, title: look.note
      }, [cv, el('span', { class: 'look-name', text: look.name })]);
      btn.addEventListener('click', () => applyLook(look.id));
      badges[look.id] = btn;
      row.appendChild(btn);
    });

    const note = el('p', { class: 'look-note', text: (P.looks.byId[state.look.id] || { note: '' }).note });
    api.body.appendChild(row);
    api.body.appendChild(note);
    api.body.appendChild(api.wide(U.group(null, [strength.node])));

    // miniaturas reales: revelado del estilo + química elegida
    const src = thumbSource();
    const eng = engine;
    let i = 0;
    const step = () => {
      if (i >= P.looks.LIST.length) return;
      const look = P.looks.LIST[i++];
      const btn = badges[look.id];
      const cv = btn.querySelector('canvas');
      const th = P.looks.thumb(src, P.looks.paramsFor(look.id, 1), eng, 78 * 2);
      const g2 = cv.getContext('2d');
      g2.clearRect(0, 0, cv.width, cv.height);
      if (th.width >= cv.width) g2.drawImage(th, 0, 0, cv.width, cv.height);
      else g2.drawImage(th, 0, 0);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  function thumbSource() {
    return img;
  }

  function applyLook(id) {
    state.look.id = id;
    if (id === 'ninguno') {
      Object.assign(state.dev, D.defaults());
    } else {
      Object.assign(state.dev, P.looks.paramsFor(id, state.look.strength == null ? 1 : state.look.strength));
    }
    document.querySelectorAll('.look').forEach((b) => {
      const on = b.dataset.look === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const note = document.querySelector('.look-note');
    if (note) note.textContent = (P.looks.byId[id] || { note: '' }).note;
    pushHistory('Estilo');
    devSig = '';
    save();
    schedule();
    paintDirty();
  }

  /* ---- Enfoque ---- */
  BUILD.enfoque = (api) => {
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'Todo se hace en luz lineal y escalando la luminancia, no los canales: en un negativo, cambiar el color de un borde es cambiar su densidad UV. El umbral evita amplificar el grano; la rodilla evita el halo.' })));
    api.body.appendChild(api.group('Detalle', [
      api.slider({
        id: 'sharp', label: 'Nitidez', min: 0, max: 100, step: 1, value: state.dev.sharp,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        onInput: (v) => { state.dev.sharp = v; customLook(); touch('Nitidez'); }
      }).node,
      api.slider({
        id: 'radius', label: 'Radio del detalle', min: 0.0006, max: 0.006, step: 0.0002, value: state.dev.radius,
        fmt: (v) => (v * 900).toFixed(1) + ' px',
        hint: 'En píxeles sobre una imagen de 900 px de ancho. Se guarda como fracción, así el PNG sale igual que el preview.',
        onInput: (v) => { state.dev.radius = v; customLook(); touch('Radio'); }
      }).node,
      api.slider({
        id: 'threshold', label: 'Umbral contra el grano', min: 0, max: 40, step: 1, value: state.dev.threshold,
        fmt: (v) => Math.round(v) + ' / 255',
        onInput: (v) => { state.dev.threshold = v; customLook(); touch('Umbral'); }
      }).node
    ]));
    api.body.appendChild(api.group('Contraste local', [
      api.slider({
        id: 'structure', label: 'Estructura', min: 0, max: 100, step: 1, value: state.dev.structure,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        hint: 'Detalle medio: texturas, hojas, ladrillo. Es la que más se nota en cianotipo.',
        onInput: (v) => { state.dev.structure = v; customLook(); touch('Estructura'); }
      }).node,
      api.slider({
        id: 'clarity', label: 'Claridad', min: 0, max: 100, step: 1, value: state.dev.clarity,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        hint: 'Radio grande. Separa el sujeto del fondo sin tocar los bordes finos.',
        onInput: (v) => { state.dev.clarity = v; customLook(); touch('Claridad'); }
      }).node
    ]));
  };

  /* ---- Desenfoque de lente ---- */
  BUILD.lente = (api) => {
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'Un foco elíptico: dentro la foto queda nítida, fuera se abre el desenfoque. Las luces del fondo ganan cuerpo antes de emborronarse, que es lo que hace una lente de verdad y no un simple desenfoque.' })));
    api.body.appendChild(api.group('Desenfoque', [
      api.slider({
        id: 'lens', label: 'Intensidad', min: 0, max: 100, step: 1, value: state.dev.lens,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        onInput: (v) => { state.dev.lens = v; customLook(); touch('Desenfoque'); }
      }).node,
      api.slider({
        id: 'lensTrans', label: 'Transición', min: 0.05, max: 1, step: 0.01, value: state.dev.lensTrans,
        fmt: (v) => Math.round(v * 100) + ' %',
        onInput: (v) => { state.dev.lensTrans = v; customLook(); touch('Transición'); }
      }).node,
      api.slider({
        id: 'lensBokeh', label: 'Cuerpo de las luces', min: 0, max: 100, step: 1, value: state.dev.lensBokeh,
        fmt: (v) => Math.round(v) + ' %',
        hint: 'Bokeh: engorda los puntos de luz del fondo antes de desenfocar.',
        onInput: (v) => { state.dev.lensBokeh = v; customLook(); touch('Bokeh'); }
      }).node
    ]));
    api.body.appendChild(api.group('Foco', [
      api.slider({
        id: 'lensSize', label: 'Tamaño del foco', min: 0.12, max: 1, step: 0.01, value: state.dev.lensSize,
        fmt: (v) => Math.round(v * 100) + ' %',
        onInput: (v) => { state.dev.lensSize = v; customLook(); touch('Foco'); }
      }).node,
      api.slider({
        id: 'lensY', label: 'Altura del foco', min: 0, max: 1, step: 0.01, value: state.dev.lensY,
        fmt: (v) => Math.round(v * 100) + ' % del alto',
        onInput: (v) => { state.dev.lensY = v; customLook(); touch('Foco'); }
      }).node
    ]));
  };

  /* ---- Efectos ---- */
  BUILD.efectos = (api) => {
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'Todo esto va dentro del negativo, así que se imprime: no es un adorno de la previsualización. El grano del papel sigue estando en Cianotipia.' })));
    api.body.appendChild(api.group('Grano y emulsión', [
      api.slider({
        id: 'grain', label: 'Grano de película', min: 0, max: 100, step: 1, value: state.dev.grain,
        fmt: (v) => Math.round(v) + ' %',
        onInput: (v) => { state.dev.grain = v; customLook(); touch('Grano'); }
      }).node,
      api.slider({
        id: 'grainSize', label: 'Tamaño del grano', min: 0.4, max: 3, step: 0.1, value: state.dev.grainSize,
        fmt: (v) => v.toFixed(1) + '×',
        onInput: (v) => { state.dev.grainSize = v; customLook(); touch('Grano'); }
      }).node,
      api.slider({
        id: 'textura', label: 'Irregularidad de la emulsión', min: 0, max: 100, step: 1, value: state.dev.textura,
        fmt: (v) => Math.round(v) + ' %',
        hint: 'Una cianotipia nunca se revela igual en toda la hoja. Esto lo mete en la imagen.',
        onInput: (v) => { state.dev.textura = v; customLook(); touch('Emulsión'); }
      }).node,
      api.select({
        id: 'texturatipo', label: 'Tipo de irregularidad',
        value: state.dev.texturaTipo,
        options: [
          { value: 'pincel', label: 'Pincelada' },
          { value: 'fibra', label: 'Fibra del papel' },
          { value: 'mancha', label: 'Manchas de revelado' }
        ],
        onChange: (v) => { state.dev.texturaTipo = v; customLook(); touch('Emulsión'); }
      }).node
    ]));
    api.body.appendChild(api.group('Luz', [
      api.slider({
        id: 'glow', label: 'Brillo difuso', min: 0, max: 100, step: 1, value: state.dev.glow,
        fmt: (v) => Math.round(v) + ' %',
        onInput: (v) => { state.dev.glow = v; customLook(); touch('Brillo'); }
      }).node,
      api.slider({
        id: 'glowWarm', label: 'Temperatura del brillo', min: -100, max: 100, step: 1, value: state.dev.glowWarm,
        fmt: (v) => (v === 0 ? 'neutra' : (v > 0 ? '+' : '') + Math.round(v)),
        onInput: (v) => { state.dev.glowWarm = v; customLook(); touch('Temperatura'); }
      }).node,
      api.slider({
        id: 'vignette', label: 'Viñeta', min: -100, max: 100, step: 1, value: state.dev.vignette,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        onInput: (v) => { state.dev.vignette = v; customLook(); touch('Viñeta'); }
      }).node,
      api.slider({
        id: 'vignetteMid', label: 'Círculo limpio', min: 0, max: 100, step: 1, value: state.dev.vignetteMid,
        fmt: (v) => Math.round(v) + ' %',
        onInput: (v) => { state.dev.vignetteMid = v; customLook(); touch('Viñeta'); }
      }).node
    ]));
    api.body.appendChild(api.group('Contraste por bandas', [
      api.slider({
        id: 'tonal', label: 'Contraste tonal', min: -100, max: 100, step: 1, value: state.dev.tonal,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        hint: 'Lo que hace revelar con dos exposiciones y enmascarar, pero por separado.',
        onInput: (v) => { state.dev.tonal = v; customLook(); touch('Contraste tonal'); }
      }).node,
      api.slider({
        id: 'shadows', label: 'Sombras', min: -100, max: 100, step: 1, value: state.dev.shadows,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        onInput: (v) => { state.dev.shadows = v; customLook(); touch('Sombras'); }
      }).node,
      api.slider({
        id: 'mids', label: 'Medios', min: -100, max: 100, step: 1, value: state.dev.mids,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        onInput: (v) => { state.dev.mids = v; customLook(); touch('Medios'); }
      }).node,
      api.slider({
        id: 'highs', label: 'Luces', min: -100, max: 100, step: 1, value: state.dev.highs,
        fmt: (v) => (v > 0 ? '+' : '') + Math.round(v),
        onInput: (v) => { state.dev.highs = v; customLook(); touch('Luces'); }
      }).node
    ]));
  };

  const ctrl = {};

  /* ---- Ajustes (curva de tono) ---- */
  BUILD.ajustes = (api) => {
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'La curva de tono lleva la imagen a la escala de azul. Es la parte del negativo que sí conviene tocar a mano: el resto lo decide la química.' })));
    api.body.appendChild(api.group('Extremos', [
      api.slider({
        id: 'black', label: 'Punto negro', min: 0, max: 40, step: 1, value: state.neg.black,
        fmt: (v) => 'L ' + v,
        hint: 'Dónde empieza el azul. Súbelo si la copia tiene un gris sucio en las sombras.',
        onInput: (v) => { state.neg.black = v; touch('Punto negro'); }
      }).node,
      api.slider({
        id: 'white', label: 'Punto blanco', min: 55, max: 100, step: 1, value: state.neg.white,
        fmt: (v) => 'L ' + v,
        hint: 'Dónde el papel se queda limpio. Bájalo para dejar blancos de verdad.',
        onInput: (v) => { state.neg.white = v; touch('Punto blanco'); }
      }).node
    ]));
    api.body.appendChild(api.group('Curva', [
      api.slider({
        id: 'gamma', label: 'Medios tonos', min: 0.5, max: 2, step: 0.02, value: state.neg.gamma,
        fmt: (v) => v.toFixed(2),
        onInput: (v) => { state.neg.gamma = v; touch('Medios tonos'); }
      }).node,
      api.slider({
        id: 'contrast', label: 'Contraste de la curva', min: -1, max: 1, step: 0.05, value: state.neg.contrast,
        fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(2),
        onInput: (v) => { state.neg.contrast = v; touch('Contraste'); }
      }).node,
      api.select({
        id: 'mix', label: 'Mezcla a blanco y negro',
        value: state.neg.mix,
        options: Object.keys(MIXES).map((k) => ({ value: k, label: MIXES[k].name })),
        hint: 'Cómo se pesan los canales al pasar a gris. «Cielos profundos» hunde el azul del cielo, que en cianotipo se lee casi igual que el blanco.',
        onChange: (v) => { state.neg.mix = v; touch('Mezcla'); }
      }).node
    ]));
  };

  /* ---- Negativo ---- */
  BUILD.negativo = (api) => {
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'El negativo es lo único que se imprime. Aquí se decide cuánta densidad UV pides y con qué tinta la consigues.' })));
    api.body.appendChild(api.group('Soporte y tinta', [
      api.select({
        id: 'support', label: 'Soporte del negativo',
        value: state.neg.support,
        options: Object.keys(E.SUPPORT).map((k) => ({ value: k, label: E.SUPPORT[k].name })),
        hint: E.SUPPORT[state.neg.support].note,
        onChange: (v) => { state.neg.support = v; touch('Soporte'); rebuildSheet(); }
      }).node,
      api.swatches({
        id: 'ink', label: 'Tinta de bloqueo',
        value: state.neg.ink,
        hint: E.INK[state.neg.ink].note,
        options: Object.keys(E.INK).map((k) => ({
          value: k, label: E.INK[k].name, css: 'rgb(' + E.INK[k].rgb.join(',') + ')'
        })),
        onChange: (v) => { state.neg.ink = v; touch('Tinta'); rebuildSheet(); }
      }).node
    ]));
    ctrl.dr = api.slider({
      id: 'dr', label: 'Rango del negativo', min: 0.4, max: 2.6, step: 0.05, value: state.neg.dr,
      fmt: (v) => v.toFixed(2) + ' log D',
      onInput: (v) => { state.neg.dr = v; state.neg.autoDr = false; ctrl.autoDr.set(false); touch('Rango'); }
    });
    ctrl.autoDr = api.toggle({
      id: 'autodr', label: 'Ajustar al proceso',
      value: state.neg.autoDr,
      hint: 'Usa el rango que pide la química elegida: la clásica pide 1,15 D; la nueva cianotipia, más de 2.',
      onChange: (v) => {
        state.neg.autoDr = v;
        if (v) { state.neg.dr = T.CHEM[state.proc.chem].range; ctrl.dr.set(state.neg.dr); }
        touch('Rango');
      }
    });
    api.body.appendChild(api.wide(U.group('Rango', [ctrl.dr.node, ctrl.autoDr.node])));
  };

  /* ---- Cianotipia ---- */
  BUILD.quimica = (api) => {
    const chem0 = T.CHEM[state.proc.chem];
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'La química fija el rango de densidad que hay que meterle al negativo. Si no coincides con tu tira de pasos, calibra: la app cambia el negativo, no la copia.' })));
    ctrl.chem = api.select({
      id: 'chem', label: 'Química',
      value: state.proc.chem,
      options: Object.keys(T.CHEM).map((k) => ({ value: k, label: T.CHEM[k].name })),
      hint: chem0.note,
      onChange: (v) => {
        state.proc.chem = v;
        state.proc.printDmax = T.CHEM[v].printDmax;
        if (state.neg.autoDr) state.neg.dr = T.CHEM[v].range;
        touch('Química');
        rebuildSheet();
      }
    });
    ctrl.exposure = api.slider({
      id: 'exposure', label: 'Exposición', min: -2, max: 2, step: 0.05, value: state.proc.exposure,
      fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(2) + ' pasos',
      hint: '0 = el tiempo con el que calibraste. Cada paso dobla o reduce a la mitad.',
      onInput: (v) => { state.proc.exposure = v; touch('Exposición'); }
    });
    ctrl.dmax = api.slider({
      id: 'dmax', label: 'Azul máximo (Dmáx)', min: 0.9, max: 1.8, step: 0.02, value: state.proc.printDmax,
      fmt: (v) => v.toFixed(2) + ' log D',
      hint: 'Densidad de la copia terminada. Estimación: ninguna fuente publica el Dmáx real de cada química. Papel satinado aguanta algo más.',
      onInput: (v) => { state.proc.printDmax = v; touch('Azul máximo'); }
    });
    api.body.appendChild(api.group('Proceso', [ctrl.chem.node, ctrl.exposure.node, ctrl.dmax.node]));

    api.body.appendChild(api.group('Material', [
      api.select({
        id: 'paper', label: 'Papel', value: state.proc.paper,
        options: Object.keys(S.PAPER).map((k) => ({ value: k, label: S.PAPER[k].name })),
        onChange: (v) => { state.proc.paper = v; touch('Papel'); }
      }).node,
      api.slider({
        id: 'oxid', label: 'Oxidación', min: 0, max: 1, step: 0.02, value: state.proc.oxidation,
        fmt: (v) => (v > 0.98 ? 'estabilizada' : v < 0.1 ? 'recién lavada' : Math.round(v * 24) + ' h'),
        hint: 'El azul sube durante las primeras 24 h de secado. El peróxido lo hace al instante.',
        onInput: (v) => { state.proc.oxidation = v; touch('Oxidación'); }
      }).node,
      api.slider({
        id: 'paptex', label: 'Grano del papel', min: 0, max: 1, step: 0.05, value: state.proc.texture,
        fmt: (v) => (v < 0.03 ? 'liso' : Math.round(v * 100) + ' %'),
        hint: 'Solo afecta a la previsualización. El grano que se imprime está en Efectos.',
        onInput: (v) => { state.proc.texture = v; touch('Grano del papel'); }
      }).node
    ]));

    ctrl.tonerAmt = api.slider({
      id: 'toneramt', label: 'Intensidad del virado', min: 0, max: 1, step: 0.05, value: state.proc.tonerAmount,
      fmt: (v) => Math.round(v * 100) + ' %',
      onInput: (v) => { state.proc.tonerAmount = v; touch('Virado'); }
    });
    ctrl.tonerAmt.node.style.display = state.proc.toner === 'ninguno' ? 'none' : '';
    api.body.appendChild(api.group('Virado', [
      api.select({
        id: 'toner', label: 'Virado', value: state.proc.toner,
        hint: 'Sobre la copia ya lavada. Tanino, té o café: los que documenta Jacquard.',
        options: Object.keys(S.TONER).map((k) => ({ value: k, label: S.TONER[k].name })),
        onChange: (v) => {
          state.proc.toner = v;
          ctrl.tonerAmt.node.style.display = v === 'ninguno' ? 'none' : '';
          touch('Virado');
        }
      }).node,
      ctrl.tonerAmt.node
    ]));
  };

  /* ---- Ver ---- */
  BUILD.ver = (api) => {
    api.body.appendChild(api.group('Qué se muestra', [
      api.wide(el('div', { class: 'sheet-seg' }, [
        ...['print', 'neg', 'orig', 'side'].map((m) => {
          const names = { print: 'Cianotipia', neg: 'Negativo', orig: 'Foto', side: 'Lado a lado' };
          const b = el('button', { class: state.mode === m ? 'is-active' : '', text: names[m] });
          b.addEventListener('click', () => {
            state.mode = m;
            document.querySelectorAll('#mode-seg button').forEach((x) => x.classList.toggle('is-active', x.dataset.mode === m));
            document.querySelectorAll('.sheet-seg button').forEach((x) => x.classList.toggle('is-active', x === b));
            drawStage();
          });
          return b;
        })
      ]))
    ]));
    api.body.appendChild(api.group('Zoom', [
      api.slider({
        id: 'zoom', label: 'Ampliación', min: 0.5, max: 3, step: 0.05, value: state.zoom,
        fmt: (v) => Math.round(v * 100) + ' %',
        hint: 'También con ⌥ + rueda sobre la foto. Sólo cambia la previsualización.',
        onInput: (v) => { state.zoom = v; drawStage(); }
      }).node
    ]));
    const lado = api.group('Comparar', [
      api.toggle({
        id: 'raw', label: 'Ver la foto sin revelar',
        value: state.raw,
        hint: 'O mantén pulsado el botón de comparar en la barra de arriba.',
        onChange: (v) => { state.raw = v; $('#btn-compare').classList.toggle('is-on', v); drawStage(); }
      }).node
    ]);
    api.body.appendChild(lado);
  };

  /* ---- Salida ---- */
  BUILD.salida = (api) => {
    api.body.appendChild(api.wide(el('p', { class: 'sheet-lead', text:
      'El negativo se genera a tamaño físico. Nada de «ajustar a la página»: si la escala se va un 3 %, la copia no coincide nunca.' })));
    ctrl.size = api.select({
      id: 'size', label: 'Tamaño de papel', value: state.out.size,
      options: Object.keys(PAPER_SIZES).map((k) => ({ value: k, label: PAPER_SIZES[k].name })),
      onChange: (v) => {
        state.out.size = v;
        if (v !== 'custom') { state.out.w = PAPER_SIZES[v].w; state.out.h = PAPER_SIZES[v].h; }
        touch('Papel'); rebuildSheet(); syncOut();
      }
    });
    ctrl.mmW = api.number({
      id: 'mmw', label: 'Ancho (mm)', min: 40, max: 330, step: 1, value: state.out.w,
      onInput: (v) => { state.out.w = v; state.out.size = 'custom'; ctrl.size.set('custom'); touch('Tamaño'); syncOut(); }
    });
    ctrl.mmH = api.number({
      id: 'mmh', label: 'Alto (mm)', min: 40, max: 480, step: 1, value: state.out.h,
      onInput: (v) => { state.out.h = v; state.out.size = 'custom'; ctrl.size.set('custom'); touch('Tamaño'); syncOut(); }
    });
    ctrl.margin = api.slider({
      id: 'margin', label: 'Margen', min: 0, max: 20, step: 1, value: state.out.margin,
      fmt: (v) => v + ' mm',
      onInput: (v) => { state.out.margin = v; touch('Margen'); drawStage(); syncOut(); }
    });
    ctrl.fit = api.select({
      id: 'fit', label: 'Encaje de la imagen', value: state.out.fit,
      options: [
        { value: 'cover', label: 'Recortar para llenar' },
        { value: 'contain', label: 'Encajar entera' },
        { value: 'width', label: 'Ajustar al ancho' }
      ],
      onChange: (v) => { state.out.fit = v; touch('Encaje'); }
    });
    api.body.appendChild(api.group('Papel', [ctrl.size.node, ctrl.mmW.node, ctrl.mmH.node, ctrl.margin.node, ctrl.fit.node]));
    api.body.appendChild(api.group('Archivo', [
      api.select({
        id: 'dpi', label: 'Resolución', value: String(state.out.dpi),
        options: [{ value: '360', label: '360 ppp' }, { value: '720', label: '720 ppp (máxima)' }],
        hint: '360 es la base nativa del cabezal; 720 duplica el archivo.',
        onChange: (v) => { state.out.dpi = +v; touch('Resolución'); syncOut(); }
      }).node,
      api.toggle({
        id: 'mirror', label: 'Espejar el negativo', value: state.out.mirror,
        hint: 'Va con la tinta contra el papel: sin espejar, la copia sale invertida.',
        onChange: (v) => { state.out.mirror = v; touch('Espejo'); }
      }).node,
      api.toggle({
        id: 'marks', label: 'Marcas de corte y etiqueta', value: state.out.marks,
        onChange: (v) => { state.out.marks = v; touch('Marcas'); }
      }).node
    ]));
    const act = el('div', { class: 'sheet-wide sheet-actions' }, [
      el('button', { class: 'btn btn-primary', text: 'Guardar negativo (PNG)', onclick: (ev) => doExport(ev.currentTarget) }),
      el('button', { class: 'btn btn-quiet', text: 'Imprimir…', onclick: doPrint }),
      el('button', { class: 'btn btn-quiet', text: 'Probar escala', onclick: doRuler })
    ]);
    api.body.appendChild(act);
    api.body.appendChild(api.wide(el('p', { class: 'step-note', id: 'out-hint-2' })));
    syncOut();
  };

  /* ---- Fuentes ---- */
  const FUENTES = [
    ['Química', [
      ['A + B', '40 g de ferricianuro en 400 ml + 100 g de citrato férrico amónico en 400 ml. Mezclar 1:1 → 5 % + 12,5 %.', 'doc'],
      ['La clásica de Ware', '25 g de citrato y 10 g de ferricianuro por 100 ml, a partes iguales: el doble de concentrada que la mezcla de trabajo del kit Jacquard, que da 12,5 % + 5 %. El preset «clásica» de la app usa 20 % + 8 %, la fórmula tradicional más citada.', 'doc'],
      ['Vida de la mezcla', 'De 2 a 4 horas. Las disoluciones madre aguantan mucho tiempo; el papel ya recubierto, hasta 6 meses a oscuras.', 'doc'],
      ['Rango que pide la química', 'Clásica 1,0-1,2 log D. Nueva cianotipia (Ware) 1,8-2,4. La app arranca en esos valores.', 'doc'],
      ['Dmáx de la copia', '1,1-1,5 log D según química. Ninguna fuente publica el número real: es una estimación de la app, no una medida.', 'estimado']
    ]],
    ['Exposición', [
      ['Kit Jacquard al sol', '10-20 minutos según condiciones (ficha del kit).', 'doc'],
      ['Clásica al sol', '3-8 minutos: estimación propia para negativo denso. Jacquard da 1-30 min como marco general de su química.', 'estimado'],
      ['Nueva cianotipia', 'Menos de 5 min bajo luz UVA (Ware). Son minutos de UV, no de sol: la etiqueta importa.', 'doc'],
      ['Pasarse es mejor', 'Sobre-exponer casi siempre se prefiere a quedarse corto. Si sale velado, la mitad de tiempo; si sale corto, el doble.', 'doc']
    ]],
    ['Negativo', [
      ['Techo del film', '1,85 log D medido sobre film de inyección con esta ET-2865. Es el techo de esta cadena, no una capacidad universal.', 'medido'],
      ['Tintas dye', 'Negro puro ~1,05 D; color compuesto ~1,8 D. En tintas de colorante el negro está optimizado para el visible y se queda corto en UV.', 'medido'],
      ['Amarillo dominante', 'El amarillo absorbe 400-480 nm, la cola que el cianotipo todavía ve. La app usa oliva (Y100 M50 C75).', 'medido'],
      ['Negativo coloreado', 'EDN: con negativo rojizo (HSB 330-100-0) salen 57 tonos útiles frente a 23 en negro, en tabla de 101 campos y en cianotipo. Mide cantidad de tonos, no densidad UV.', 'doc'],
      ['Corrección por tabla', 'EDN rechaza las curvas de Photoshop por posterización y por el efecto palanca sobre los valores vecinos, y corrige con un mapa de tonos calculado sobre una cuña de 256 parches. Esta app usa un spline monótono sobre 21-101 parches.', 'doc']
    ]],
    ['Calibración', [
      ['Tonos útiles del cianotipo', 'Entre 17 y 23 tonos según la página de EDN. Es el proceso más corto de la lista: por eso el rango importa más que el contraste.', 'doc'],
      ['Por qué el negativo, no la copia', 'Se corrige lo que se imprime. La copia no se puede retocar; el negativo sí, y el perfil queda guardado.', 'doc'],
      ['Segunda pasada', 'EDN recomienda repetir la carta una vez corregida («corrección de la corrección»). La app la deja a mano: imprime la carta otra vez y vuelve a analizarla.', 'doc'],
      ['Repetir muestras', 'EDN promedia al menos tres lecturas por parche. La app ya promedia una fila de píxeles por paso, pero no varias fotos.', 'doc']
    ]],
    ['Lo que no es de nadie', [
      ['Ganancias de tinta', 'Los factores por tinta (1,0 oliva … 0,5 magenta) son una heurística de la app para ordenar el efecto. No son densidades medidas por tinta.', 'estimado'],
      ['Oxidación', 'El ancla es 24 h hasta el azul final, documentada; la forma de la curva es una heurística.', 'estimado'],
      ['Texturas de emulsión', 'Inventadas con ruido: no pretenden reproducir una emulsión concreta.', 'estimado']
    ]]
  ];

  BUILD.fuentes = (api) => {
    const wrap = el('div', { class: 'fuentes' });
    wrap.appendChild(el('p', { class: 'sheet-lead', text:
      'Cada cifra de la app, de dónde sale y cuánto se fía uno de ella. «Documentado» = está en la ficha de Jacquard o en Mike Ware. «Medido» = propio, sobre la ET-2865. «Estimado» = heurística de la app, sin fuente.' }));
    FUENTES.forEach(([titulo, filas]) => {
      const g = el('div', { class: 'fuente-grupo' }, [el('h3', { text: titulo })]);
      filas.forEach(([k, v, tag]) => {
        g.appendChild(el('div', { class: 'fuente-fila' }, [
          el('b', { text: k }),
          el('span', { text: v }),
          el('span', { class: 'tag ' + tag, text: tag })
        ]));
      });
      wrap.appendChild(g);
    });
    api.body.appendChild(wrap);
  };

  /* Marca el estilo como «personalizado» cuando se toca un control del revelado */
  function customLook() {
    if (state.look.id === 'ninguno') return;
    state.look.id = 'personalizado';
    const note = document.querySelector('.look-note');
    if (note) note.textContent = 'Ajustes propios sobre el estilo anterior. Vuelve a Estilos para partir de cero.';
    document.querySelectorAll('.look').forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
  }

  /* puntito en la herramienta que tiene algo puesto */
  function paintDirty() {
    const dirty = {
      enfoque: state.dev.sharp || state.dev.structure || state.dev.clarity,
      lente: state.dev.lens,
      efectos: state.dev.grain || state.dev.vignette || state.dev.glow || state.dev.tonal ||
        state.dev.shadows || state.dev.mids || state.dev.highs || state.dev.textura,
      estilos: state.look.id !== 'ninguno',
      ajustes: state.neg.black || state.neg.white !== 100 || state.neg.gamma !== 1 || state.neg.contrast,
      negativo: !state.neg.autoDr || state.neg.ink !== DEFAULTS.neg.ink || state.neg.support !== DEFAULTS.neg.support,
      quimica: state.proc.exposure || state.proc.toner !== 'ninguno' || state.proc.chem !== DEFAULTS.proc.chem
    };
    document.querySelectorAll('.tool').forEach((b) => {
      b.classList.toggle('has-edits', !!dirty[b.dataset.tool]);
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
        state.zoom = 1;
        imgRev++;
        devSig = '';
        devCache.key = '';
        schedule();
        if (state.tool === 'estilos') rebuildSheet();
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
      imgRev++;
      devSig = '';
      devCache.key = '';
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
    if (v === 'imprimir') { syncOut(); drawOutPreview(); }
    if (v === 'revelar') setTimeout(drawStage, 30);
  }

  /* ---------------------------------------------------------- calibración */
  let calPhoto = null;
  let calQuad = null;

  function calSteps() {
    const n = state.cal && state.cal.steps;
    return n === 51 || n === 101 ? n : 21;
  }

  function drawCalSheetPreview() {
    const c = $('#cal-sheet');
    P.sheets.drawCalSheet(c, {
      dpi: 100,
      steps: calSteps(),
      inkRGB: E.INK[state.neg.ink].rgb
    });
    c.style.width = '100%';
    c.style.maxWidth = '300px';
    c.style.height = 'auto';
  }

  function calSheetFull() {
    const c = document.createElement('canvas');
    P.sheets.drawCalSheet(c, { dpi: 300, steps: calSteps(), inkRGB: E.INK[state.neg.ink].rgb });
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
    const ns = calSteps();
    for (let i = 0; i <= ns; i++) {
      const u = i / ns;
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

  let calAnalysis = null;

  function analyzeCal() {
    const c = $('#cal-photo');
    if (!c || !calQuad || !calPhoto) return;
    /* Se mide sobre la foto original, no sobre la copia que se ve en pantalla:
       con 101 pasos la copia reducida no tiene píxeles para tanto parche.
       El tope de 2400 px evita cargar 12 Mpx en memoria para nada. */
    const s = Math.min(1, 2400 / calPhoto.width);
    const k = (calPhoto.width / c.width) * s;
    const off = document.createElement('canvas');
    off.width = Math.round(calPhoto.width * s);
    off.height = Math.round(calPhoto.height * s);
    const og = off.getContext('2d', { willReadFrequently: true });
    og.drawImage(calPhoto, 0, 0, off.width, off.height);
    const data = og.getImageData(0, 0, off.width, off.height);
    const n = calSteps();
    const quad = calQuad.map(([x, y]) => [x * k, y * k]);
    const samples = P.calib.sampleStrip(data, quad, n);
    const an = P.calib.analyze(samples);
    calAnalysis = an;
    $('#cal-result').hidden = false;
    P.sheets.drawCurve($('#cal-curve'), an.xs, an.ys, { residual: 'residuo ' + (an.noise / 255).toFixed(3) });
    const st = $('#cal-stats');
    st.textContent = '';
    [
      ['pasos leídos', n + ' de ' + n],
      ['mesetas', String(an.plateau)],
      ['inversiones', String(an.inversions)],
      ['ruido', an.noise.toFixed(0)]
    ].forEach(([k2, v]) => {
      st.appendChild(el('div', { class: 'readout' }, [el('span', { class: 'ro-k', text: k2 }), el('b', { text: v })]));
    });
    const dg = $('#cal-diagnosis');
    dg.textContent = an.warnings.length
      ? an.warnings.map((w) => w.text).join(' ')
      : 'La tira se lee bien: ' + n + ' pasos monótonos, sin mesetas. Guarda el perfil y úsalo con todas tus imágenes.';
    $('#cal-name').value = $('#cal-name').value || ('Perfil ' + new Date().toLocaleDateString('es-ES'));
  }

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
      mix: engine.mix, label: currentLabel(),
      develop: D.isNeutral(state.dev) ? null : state.dev
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

  function doExport(btnEl) {
    const btn = btnEl || $('#btn-export');
    busy(btn, 'Revelando y preparando…', (restore) => {
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

  /* --------------------------------------------------------------- salida */
  function syncOut() {
    if (ctrl.size) {
      const custom = state.out.size === 'custom';
      ctrl.mmW.node.style.display = custom ? '' : 'none';
      ctrl.mmH.node.style.display = custom ? '' : 'none';
    }
    const dpi = state.out.dpi;
    const w = Math.round((state.out.w / 25.4) * dpi);
    const h = Math.round((state.out.h / 25.4) * dpi);
    const mp = ((w * h) / 1e6).toFixed(1).replace('.', ',');
    const nom = PAPER_SIZES[state.out.size];
    const h1 = $('#out-hint');
    if (h1) h1.textContent = (state.out.size === 'custom' ? 'A medida' : nom.name.split(' · ')[0]) +
      ' · ' + state.out.w + ' × ' + state.out.h + ' mm';
    const h2 = $('#out-hint-2');
    if (h2) h2.textContent = w + ' × ' + h + ' px · ' + mp + ' Mpx · ' + dpi + ' ppp';
    drawRecipe();
    paintChecklist();
    if (state.view === 'imprimir') drawOutPreview();
  }

  /* Lo que hay que tener claro justo antes de darle a imprimir. */
  function paintChecklist() {
    const ul = $('#out-check');
    if (!ul || !engine) return;
    const d = engine.diag;
    const chem = T.CHEM[state.proc.chem];
    const margen = state.out.margin;
    const items = [];

    const falta = chem.range - d.dr;
    if (d.capacityShort || falta > 0.03) {
      items.push(['warn', 'La densidad no llega',
        'La química pide ' + num(chem.range) + ' D y tu cadena entrega ' + num(d.dr) + ' D. Baja el rango en Negativo o cambia de tinta.']);
    } else {
      items.push(['ok', 'Densidad justa',
        'El negativo entrega ' + num(d.dr) + ' D para los ' + num(chem.range) + ' D que pide «' + chem.name + '».']);
    }
    items.push(state.out.mirror
      ? ['ok', 'Espejado', 'La tinta va contra el papel, así que la copia sale en su sitio.']
      : ['warn', 'Sin espejar', 'Con la tinta contra el papel, la copia saldrá invertida. Actívalo en Salida.']);
    items.push(margen >= 4
      ? ['ok', 'Margen de ' + margen + ' mm', 'Sitio para coger la copia sin tocar la emulsión.']
      : ['warn', 'Margen escaso', 'Con menos de 4 mm los dedos acaban en la imagen.']);
    items.push(state.out.dpi >= 360
      ? ['ok', state.out.dpi + ' ppp', 'A ' + state.out.dpi + ' ppp el tramado del cabezal no se ve ni con lupa sobre la copia.']
      : ['warn', state.out.dpi + ' ppp', 'Por debajo de 360 ppp el tramado empieza a verse en la copia.']);
    items.push(['ok', 'Escala 100 %', 'En el diálogo de impresión: sin «ajustar a la página» y sin «encajar al marco».']);

    ul.textContent = '';
    items.forEach(([cls, titulo, texto]) => {
      ul.appendChild(el('li', { class: cls }, [
        el('span', { class: 'mark', text: cls === 'ok' ? '✓' : '!' }),
        el('span', {}, [el('b', { text: titulo }), document.createTextNode(texto)])
      ]));
    });
  }

  /* El negativo tal cual se va a imprimir: espejado, con sus marcas. */
  function drawOutPreview() {
    const c = $('#out-preview');
    if (!c || !engine || !img) return;
    const neg = R.renderNegative({
      eng: engine, img: img, dpi: 44,
      paperW: state.out.w, paperH: state.out.h,
      margin: state.out.margin, fit: state.out.fit,
      mirror: state.out.mirror, marks: false,
      mix: engine.mix, label: '',
      develop: D.isNeutral(state.dev) ? null : state.dev
    });
    c.width = neg.canvas.width;
    c.height = neg.canvas.height;
    const g = c.getContext('2d');
    g.drawImage(neg.canvas, 0, 0);
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

  /* ------------------------------------------------------------ historial UI */
  function paintStack() {
    const p = $('#stackpanel');
    p.textContent = '';
    p.appendChild(el('p', { class: 'stack-title', text: 'Historial' }));
    if (hist.length <= 1) {
      p.appendChild(el('p', { class: 'stack-empty', text: 'Aún no has tocado nada. Cada ajuste aparecerá aquí y se puede volver a él.' }));
      return;
    }
    hist.forEach((h, i) => {
      const b = el('button', {
        class: 'stack-item' + (i === histIdx ? ' is-current' : '') + (i > histIdx ? ' is-future' : '')
      }, [
        el('span', { class: 'stack-dot' }),
        el('span', { text: (i === 0 ? 'Estado inicial' : h.label) }),
        el('span', { class: 'stack-time', text: new Date(h.t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) })
      ]);
      b.addEventListener('click', () => {
        histIdx = i;
        applySnap(hist[i].s);
      });
      p.appendChild(b);
    });
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
        state.raw = false;
        document.querySelectorAll('#mode-seg button').forEach((x) => x.classList.toggle('is-active', x === b));
        drawStage();
      });
    });

    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    $('#sheet-back').addEventListener('click', () => openTool(null));
    $('#sheet-reset').addEventListener('click', () => {
      const id = state.tool;
      if (!id) return;
      if (id === 'enfoque' || id === 'lente' || id === 'efectos') {
        const d = D.defaults();
        if (id === 'efectos') {
          ['grain', 'grainSize', 'textura', 'texturaTipo', 'vignette', 'vignetteMid', 'glow', 'glowWarm', 'tonal', 'shadows', 'mids', 'highs'].forEach((k) => { state.dev[k] = d[k]; });
        } else if (id === 'lente') {
          ['lens', 'lensTrans', 'lensY', 'lensSize', 'lensBokeh'].forEach((k) => { state.dev[k] = d[k]; });
        } else {
          ['sharp', 'radius', 'threshold', 'structure', 'clarity'].forEach((k) => { state.dev[k] = d[k]; });
        }
        state.look.id = 'personalizado';
      } else if (id === 'estilos') {
        applyLook('ninguno');
        return;
      } else if (id === 'ajustes') {
        Object.assign(state.neg, { black: 0, white: 100, gamma: 1, contrast: 0, mix: 'neutro' });
      } else if (id === 'negativo') {
        Object.assign(state.neg, { dr: T.CHEM[state.proc.chem].range, autoDr: true });
      } else if (id === 'quimica') {
        Object.assign(state.proc, { exposure: 0, toner: 'ninguno', oxidation: 1, texture: 0.35 });
      } else if (id === 'ver') {
        state.zoom = 1;
        state.raw = false;
      }
      pushHistory('Reiniciar ' + id);
      devSig = '';
      save();
      rebuildSheet();
      buildEngine();
      drawStage();
      renderReadouts();
      syncHints();
      U.toast('Reiniciado');
    });

    const stackBtn = $('#btn-stack');
    const stackPanel = $('#stackpanel');
    stackBtn.addEventListener('click', () => {
      const on = stackPanel.hidden;
      stackPanel.hidden = !on;
      stackBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) paintStack();
    });

    // comparar: mantener pulsado
    const cmp = $('#btn-compare');
    const cmpOn = () => { if (!img) return; state.raw = true; cmp.classList.add('is-on'); drawStage(); };
    const cmpOff = () => { if (!state.raw) return; state.raw = false; cmp.classList.remove('is-on'); drawStage(); };
    cmp.addEventListener('pointerdown', (e) => { e.preventDefault(); cmpOn(); });
    cmp.addEventListener('pointerup', cmpOff);
    cmp.addEventListener('pointerleave', cmpOff);
    cmp.addEventListener('pointercancel', cmpOff);
    cmp.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cmpOn(); } });
    cmp.addEventListener('keyup', cmpOff);

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

    /* Arrastre sobre la foto: ajusta el control armado.
       Vertical, como en Snapseed: subir sube el valor. */
    let dragCtl = null;
    let dragY = 0;
    let dragVal = 0;
    ground.addEventListener('pointerdown', (e) => {
      if (!armed || !img) return;
      if (e.target.closest('.drag-pill')) return;
      dragCtl = armed;
      dragY = e.clientY;
      dragVal = armed.value();
      ground.classList.add('is-adjusting');
      $('.drag-pill').hidden = false;
      if (ground.setPointerCapture) {
        try { ground.setPointerCapture(e.pointerId); } catch { /* captura no disponible */ }
      }
      e.preventDefault();
    });
    ground.addEventListener('pointermove', (e) => {
      if (!dragCtl) return;
      const range = dragCtl.max - dragCtl.min;
      const dy = dragY - e.clientY;
      const sens = e.shiftKey ? 1400 : 340;      // ⇧ = ajuste fino
      const v = dragVal + (dy / sens) * range;
      dragCtl.set(v);
      paintPill();
      fast = true;
      schedule();
    });
    const endDrag = () => {
      if (!dragCtl) return;
      dragCtl = null;
      ground.classList.remove('is-adjusting');
      fast = false;
      schedule();
    };
    ground.addEventListener('pointerup', endDrag);
    ground.addEventListener('pointercancel', endDrag);
    ground.addEventListener('pointerleave', endDrag);

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
      const meta = e.metaKey || e.ctrlKey;
      if (typing && !meta) return;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (meta && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#file-input').click(); return; }
      if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); doExport(); return; }
      if (meta && e.key.toLowerCase() === 'p') { e.preventDefault(); doPrint(); return; }
      if (e.key === 'Escape') {
        if (!$('#stackpanel').hidden) { $('#stackpanel').hidden = true; return; }
        if (state.tool) { openTool(null); return; }
      }
      if (e.key === '1') setView('revelar');
      else if (e.key === '2') setView('calibrar');
      else if (e.key === '3') setView('imprimir');
      else if (armed && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        // con un control armado, las flechas ajustan ese control
        if (typing) return;
        e.preventDefault();
        const d = (e.shiftKey ? 0.2 : 1) * armed.step;
        armed.set(armed.value() + (e.key === 'ArrowUp' ? d : -d));
        paintPill();
      }
    });

    // calibración
    $('#btn-cal-sheet').addEventListener('click', () => {
      const c = calSheetFull();
      printCanvas(c, 210, 297);
    });
    $('#btn-cal-save').addEventListener('click', () => download(calSheetFull(), 'prusia-carta-calibracion.png'));
    const calStepsSel = $('#in-calsteps');
    calStepsSel.value = String(calSteps());
    calStepsSel.addEventListener('change', () => {
      state.cal = { steps: Number(calStepsSel.value) };
      save();
      drawCalSheetPreview();
      if (calPhoto) {
        $('#cal-result').hidden = true;
        calAnalysis = null;
        U.toast('Tira de ' + calSteps() + ' pasos: vuelve a analizar la foto');
      }
    });
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
      engHash = '';
      save();
      renderProfiles();
      schedule();
      U.toast('Perfil guardado y aplicado');
    });
    $('#btn-cal-manual').addEventListener('click', () => {
      U.toast('Método manual: usa el paso 1 y anota dónde sale blanco y negro pleno');
    });

    // arrastre de esquinas de la tira
    const photo = $('#cal-photo');
    let dragIdx = -1;
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
      dragIdx = hit(p[0], p[1]);
      if (dragIdx >= 0) { photo.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    photo.addEventListener('pointermove', (e) => {
      if (dragIdx < 0 || !calQuad) return;
      const p = pos(e);
      calQuad[dragIdx] = p;
      paintCalQuad();
    });
    photo.addEventListener('pointerup', (e) => {
      if (dragIdx >= 0 && photo.releasePointerCapture) {
        try { photo.releasePointerCapture(e.pointerId); } catch { /* ya se soltó */ }
      }
      dragIdx = -1;
    });

    // salida
    const goto = $('#btn-goto-salida');
    if (goto) {
      goto.addEventListener('click', () => {
        setView('revelar');
        openTool('salida');
      });
    }
    $('#btn-export').addEventListener('click', doExport);
    $('#btn-print').addEventListener('click', doPrint);
    $('#btn-ruler').addEventListener('click', doRuler);

    window.addEventListener('resize', () => {
      if (state.view === 'revelar') drawStage();
      else if (state.view === 'calibrar' && calAnalysis) {
        P.sheets.drawCurve($('#cal-curve'), calAnalysis.xs, calAnalysis.ys, {
          residual: 'residuo ' + (calAnalysis.noise / 255).toFixed(3)
        });
      }
    });

    // zoom con rueda sobre el escenario
    ground.addEventListener('wheel', (e) => {
      if (!e.altKey) return;
      e.preventDefault();
      state.zoom = Math.max(0.5, Math.min(3, state.zoom * (e.deltaY > 0 ? 0.94 : 1.06)));
      drawStage();
    }, { passive: false });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    restore();
    buildRail();
    bind();
    buildEngine(true);
    syncOut();
    drawRecipe();
    loadSample();
    $('#drop-hint').hidden = true;
    renderProfiles();
    if (!img) $('#drop-hint').hidden = false;
    hist = [];
    histIdx = -1;
    pushHistory('Estado inicial');
  }

  window.__prusia = {
    state: state,
    engine: () => engine,
    negative: () => makeNegative(),
    profiles: () => profiles,
    hist: () => ({ i: histIdx, n: hist.length, labels: hist.map((h) => h.label) }),
    undo: undo,
    redo: redo,
    openTool: openTool,
    applyLook: applyLook,
    /* repintado síncrono: la app va por rAF y las pestañas en segundo plano
       no lo reciben, así que las pruebas necesitan forzarlo */
    redraw: () => { engHash = ''; buildEngine(); drawStage(); renderReadouts(); syncHints(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.P = window.P || {});
