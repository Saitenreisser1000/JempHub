// Erreichbarkeit aller Diamanten und Sterne: spielt jede Welt mit der echten Spielphysik ab (dieselbe Suche
// wie „Prüfen“ im Editor) – zuerst ohne Fähigkeiten, dann mit Doppelsprung, + Wandsprung, + Dash, + Gleiten.
// Für jedes Sammelstück wird die erste Fähigkeit vermerkt, ab der es erreichbar ist, und als Tabelle REACH
// in index.html geschrieben. Die Weltkarte zeigt damit, was sich mit den vorhandenen Fähigkeiten holen lässt.
//
//   node erreichbar.mjs            alle Welten neu berechnen und index.html aktualisieren
//   node erreichbar.mjs 1 bonus1   nur diese Welten (übrige Einträge bleiben)
//   node erreichbar.mjs --pruefen bonus1 bonus2   nur prüfen: Ziel erreichbar? (ändert nichts)
//   node erreichbar.mjs --json 3   Ergebnis nur ausgeben (zum parallelen Rechnen, danach zusammenführen)
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gameSource, engine, search } from './pruefung.mjs';

const root = import.meta.dirname;
const { src, html } = await gameSource();
const STEPS = [[], ['double'], ['double', 'wall'], ['double', 'wall', 'dash'], ['double', 'wall', 'dash', 'glide']];
const raw = process.argv.slice(2), jsonOut = raw.includes('--json'), args = raw.filter(a => a !== '--json'), onlyCheck = args[0] === '--pruefen', want = (onlyCheck ? args.slice(1) : args).map(a => isNaN(+a) ? a : +a);
const E = engine(html);
const worlds = want.length ? want : [...new Set(E.EDITABLE.filter(w => !String(w).startsWith('archiv') && !E.BONUS.includes(w)))];

if (onlyCheck) {
  for (const w of worlds) { const D = E.levelData(w); const steps = E.BONUS_AB?.[w] ? [E.BONUS_AB[w], E.BONUS_AB[w].slice(0, -1)] : STEPS;   // Bonus: mit und ohne die jüngste Fähigkeit
    for (const ab of steps) { const t0 = Date.now(), r = search(E, D, ab); console.log(`${w} mit [${ab.join(', ') || '–'}]: Ziel ${r.goal ? 'erreichbar' : 'NICHT erreichbar'}, ${r.got.size}/${Object.keys(r.cells).length} Sammelstücke, ${r.nodes} Standplätze (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } }
  process.exit(0);
}

const m = src.match(/const REACH=\/\*erreichbar\*\/(\{[\s\S]*?\})\/\*erreichbar\*\/;/);
if (!m) throw new Error('REACH-Markierung in index.html fehlt');
const REACH = JSON.parse(m[1]);
for (const w of worlds) { const t0 = Date.now(), D = E.levelData(w), need = {}; let cells = {};
  for (const ab of STEPS) { const r = search(E, D, ab); for (const id of r.got) if (!(id in need)) need[id] = ab.length ? ab[ab.length - 1] : ''; cells = r.cells; }
  for (const k of Object.keys(REACH)) if (k.startsWith(w + ':')) delete REACH[k];
  for (const [id, cell] of Object.entries(cells)) REACH[`${w}:${cell}`] = id in need ? need[id] : 'x';   // x = mit keiner Fähigkeit gefunden
  console.log(`${w}: ${Object.entries(cells).map(([id]) => `${id}=${id in need ? need[id] || '–' : '?'}`).join(' ')} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
if (jsonOut) { console.log('JSON ' + JSON.stringify(Object.fromEntries(Object.entries(REACH).filter(([k]) => worlds.some(w => k.startsWith(w + ':')))))); process.exit(0); }
const key = k => { const [w, c] = k.split(':'); return [w === 'uebung' ? 0 : 1, isNaN(+w) ? 99 : +w, w, ...c.split(',').map(Number)]; };
const cmp = (a, b) => { const A = key(a), B = key(b); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1; return 0; };
const sorted = Object.fromEntries(Object.entries(REACH).sort(([a], [b]) => cmp(a, b)));
await writeFile(resolve(root, 'index.html'), src.replace(m[0], `const REACH=/*erreichbar*/${JSON.stringify(sorted)}/*erreichbar*/;`));
console.log('index.html: REACH aktualisiert');
