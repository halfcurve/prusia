/* build.mjs — junta todo en un único HTML autónomo.
 * Sin dependencias: node build.mjs
 * El resultado (dist/index.html) abre desde file:// y desde http://.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const JS_ORDER = ['sci.js', 'tone.js', 'engine.js', 'calibrate.js', 'sheets.js', 'render.js', 'ui.js', 'app.js'];
const js = JS_ORDER.map((f) => read('src/js/' + f)).join('\n');
const css = read('src/styles.css');
let html = read('src/index.html');

const samplePath = path.join(ROOT, 'public/sample.jpg');
const sample = fs.existsSync(samplePath)
  ? 'data:image/jpeg;base64,' + fs.readFileSync(samplePath).toString('base64')
  : '';

const prelude = `<script>window.P={};P.SAMPLE=${JSON.stringify(sample)};</script>`;

html = html.replace('<!--@css-->', '<style>\n' + css + '\n</style>');
html = html.replace('<!--@js-->', prelude + '\n<script>\n' + js + '\n</script>');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);
const kb = (fs.statSync(path.join(ROOT, 'dist/index.html')).size / 1024).toFixed(0);
console.log('dist/index.html · ' + kb + ' KB');
