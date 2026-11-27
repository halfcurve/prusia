/* Carga los módulos del navegador en un contexto vm, igual que el build real
 * (todos escriben en window.P). Sirve para tests y para inspeccionar la cadena. */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'src', 'js');
export const FILES = ['sci.js', 'tone.js', 'engine.js', 'calibrate.js', 'sheets.js', 'develop.js'];

export function loadP() {
  const ctx = {
    console, Math, JSON, Date,
    Float32Array, Float64Array, Uint8ClampedArray, Uint8Array, Int32Array, Uint16Array,
    Array, Object, String, Number, Boolean, Error, isNaN, isFinite, parseInt, parseFloat
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of FILES) {
    const p = path.join(SRC, f);
    if (!fs.existsSync(p)) continue;
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
  }
  return ctx.P;
}

export const hex = (r, g, b) =>
  '#' + [r, g, b].map((q) => Math.max(0, Math.min(255, Math.round(q))).toString(16).padStart(2, '0')).join('');
