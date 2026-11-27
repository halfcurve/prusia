import { loadP, hex } from './load.mjs';
const P = loadP();
const eng = P.engine.build({ chem: 'clasica', support: 'film', ink: 'oliva', paper: 'blanco', toner: 'ninguno', oxidation: 1, exposure: 0, dr: 1.15, black: 0, white: 100, gamma: 1, contrast: 0 });
const d = eng.diag;
console.log('diag', Object.fromEntries(Object.entries(d).map(([k,v]) => [k, typeof v === 'number' ? Math.round(v*1000)/1000 : v])));
for (const y of [0, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1]) {
  const i = Math.round(Math.sqrt(y) * 4095);
  console.log('Y', y.toFixed(2).padStart(4), 'c', eng.cAt[i].toFixed(3), hex(eng.mapY[i*3], eng.mapY[i*3+1], eng.mapY[i*3+2]));
}
console.log('negativo (gris imagen → píxel):');
for (const g of [0, 51, 102, 153, 204, 255]) {
  console.log(' g', String(g).padStart(3), hex(eng.negMap[g*3], eng.negMap[g*3+1], eng.negMap[g*3+2]));
}
