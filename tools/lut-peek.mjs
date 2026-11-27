import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../src/js/sci.js');
const dmax = Number(process.argv[2] || 1.52);
const lut = P.sci.buildPrintLut({ dmax });
const out = [0,0,0];
console.log('c\tdens\thex');
for (const c of [0,0.08,0.15,0.25,0.4,0.55,0.7,0.85,1]) {
  P.sci.sampleLut(lut, c, out);
  const i = Math.round(c*(lut.steps-1));
  console.log(c.toFixed(2)+'\t'+lut.dens[i].toFixed(3)+'\t'+P.sci.hexOf(out));
}
