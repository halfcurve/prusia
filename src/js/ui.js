/* Prusia — ui.js
 * Controles. Todos salen de aquí para que la escala, el radio y el
 * comportamiento sean idénticos en los tres paneles.
 */
(function (P) {
  'use strict';

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (k === 'dataset') { for (const d in v) n.dataset[d] = v[d]; }
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    if (kids) {
      (Array.isArray(kids) ? kids : [kids]).forEach((c) => {
        if (c == null) return;
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return n;
  }

  function head(label, valueEl) {
    return el('div', { class: 'ctl-head' }, [el('span', { class: 'ctl-label', text: label }), valueEl]);
  }

  /* ---------- slider ---------- */
  function slider(o) {
    const val = el('span', { class: 'ctl-val', text: '' });
    const input = el('input', {
      class: 'slider', type: 'range', min: o.min, max: o.max, step: o.step || 1,
      id: o.id ? 'in-' + o.id : null, 'aria-label': o.label
    });
    const node = el('div', { class: 'ctl' }, [head(o.label, val), input]);
    let hintEl = null;
    if (o.hint) { hintEl = el('p', { class: 'ctl-hint', text: o.hint }); node.appendChild(hintEl); }

    function paint(v) {
      const p = ((v - o.min) / (o.max - o.min)) * 100;
      input.style.setProperty('--p', Math.max(0, Math.min(100, p)) + '%');
      val.textContent = o.fmt ? o.fmt(v) : v;
    }
    function set(v) { input.value = v; paint(+v); }
    input.addEventListener('input', () => {
      const v = +input.value;
      paint(v);
      if (o.onInput) o.onInput(v);
    });
    set(o.value);
    return {
      node: node,
      set: set,
      setHint: (t) => { if (hintEl) hintEl.textContent = t; },
      setActive: (on) => val.classList.toggle('is-active', !!on)
    };
  }

  /* ---------- select ---------- */
  function select(o) {
    const sel = el('select', { class: 'select', id: o.id ? 'in-' + o.id : null, 'aria-label': o.label });
    (o.options || []).forEach((op) => {
      sel.appendChild(el('option', { value: op.value, text: op.label }));
    });
    sel.value = o.value;
    const node = el('div', { class: 'ctl' }, [head(o.label, null), sel]);
    let hintEl = null;
    if (o.hint) { hintEl = el('p', { class: 'ctl-hint', text: o.hint }); node.appendChild(hintEl); }
    sel.addEventListener('change', () => { if (o.onChange) o.onChange(sel.value); });
    return {
      node: node,
      set: (v) => { sel.value = v; },
      setHint: (t) => { if (hintEl) hintEl.textContent = t; }
    };
  }

  /* ---------- número ---------- */
  function number(o) {
    const input = el('input', {
      class: 'input', type: 'number', min: o.min, max: o.max, step: o.step || 1,
      value: o.value, id: o.id ? 'in-' + o.id : null, 'aria-label': o.label
    });
    const node = el('div', { class: 'ctl' }, [head(o.label, null), input]);
    let hintEl = null;
    if (o.hint) { hintEl = el('p', { class: 'ctl-hint', text: o.hint }); node.appendChild(hintEl); }
    input.addEventListener('input', () => {
      const v = Number(input.value);
      if (!isNaN(v) && o.onInput) o.onInput(v);
    });
    return {
      node: node,
      set: (v) => { input.value = v; },
      setHint: (t) => { if (hintEl) hintEl.textContent = t; }
    };
  }

  /* ---------- swatches ---------- */
  function swatches(o) {
    const wrap = el('div', { class: 'swatches', role: 'group', 'aria-label': o.label });
    const btns = {};
    (o.options || []).forEach((op) => {
      const b = el('button', {
        class: 'swatch', title: op.label, 'aria-label': op.label, 'aria-pressed': 'false',
        dataset: { value: op.value }, style: 'background:' + op.css
      });
      b.addEventListener('click', () => {
        set(op.value);
        if (o.onChange) o.onChange(op.value);
      });
      btns[op.value] = b;
      wrap.appendChild(b);
    });
    const node = el('div', { class: 'ctl' }, [head(o.label, null), wrap]);
    let hintEl = null;
    if (o.hint) { hintEl = el('p', { class: 'ctl-hint', text: o.hint }); node.appendChild(hintEl); }
    function set(v) {
      for (const k in btns) {
        btns[k].classList.toggle('is-active', k === v);
        btns[k].setAttribute('aria-pressed', k === v ? 'true' : 'false');
      }
      if (o.hintOf) node.querySelector('.ctl-hint').textContent = o.hintOf(v);
    }
    set(o.value);
    return { node: node, set: set, setHint: (t) => { if (hintEl) hintEl.textContent = t; } };
  }

  /* ---------- toggle ---------- */
  function toggle(o) {
    const id = o.id ? 'in-' + o.id : 'sw-' + Math.random().toString(36).slice(2, 8);
    const input = el('input', { type: 'checkbox', id: id });
    input.checked = !!o.value;
    const node = el('div', { class: 'ctl' }, [
      el('label', { class: 'switch', for: id }, [
        el('span', { class: 'ctl-label', text: o.label }),
        input,
        el('span', { class: 'switch-track', 'aria-hidden': 'true' })
      ])
    ]);
    let hintEl = null;
    if (o.hint) { hintEl = el('p', { class: 'ctl-hint', text: o.hint }); node.appendChild(hintEl); }
    input.addEventListener('change', () => { if (o.onChange) o.onChange(input.checked); });
    return {
      node: node,
      set: (v) => { input.checked = !!v; },
      setHint: (t) => { if (hintEl) hintEl.textContent = t; }
    };
  }

  function group(title, children) {
    return el('div', { class: 'group' }, [
      title ? el('p', { class: 'group-title', text: title }) : null
    ].concat(children.filter(Boolean)));
  }

  function toast(msg, ms) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('is-on'), ms || 2600);
  }

  P.ui = { el: el, slider: slider, select: select, number: number, swatches: swatches, toggle: toggle, group: group, toast: toast };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
