// Erreichbarkeit aller Diamanten und Sterne: spielt jede Welt mit der echten Spielphysik ab (dieselbe Suche
// wie „Prüfen“ im Editor) – zuerst ohne Fähigkeiten, dann mit Doppelsprung, + Wandsprung, + Dash, + Gleiten.
// Für jedes Sammelstück wird die erste Fähigkeit vermerkt, ab der es erreichbar ist, und als Tabelle REACH
// in index.html geschrieben. Die Weltkarte zeigt damit, was sich mit den vorhandenen Fähigkeiten holen lässt.
//
//   node erreichbar.mjs            alle Welten neu berechnen und index.html aktualisieren
//   node erreichbar.mjs 1 bonus1   nur diese Welten (übrige Einträge bleiben)
//   node erreichbar.mjs --pruefen bonus1 bonus2   nur prüfen: Ziel erreichbar? (ändert nichts)
//   node erreichbar.mjs --json 3   Ergebnis nur ausgeben (zum parallelen Rechnen, danach zusammenführen)
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { inlineLevels } from './levels.mjs';

const root = import.meta.dirname;
const src = await readFile(resolve(root, 'index.html'), 'utf8');
const { html } = inlineLevels(src, resolve(root, 'levels'));
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

function engine() {
  const stub = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub(), apply: () => stub(), set: () => true });
  const element = () => ({ classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, append() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, style: { setProperty() {} }, dataset: {}, hidden: false, textContent: '', innerHTML: '', getContext: () => stub(), width: 16, height: 16 });
  let time = 0;
  const ctx = { document: { getElementById: element, createElement: element, querySelector: () => null, querySelectorAll: () => [], documentElement: {}, body: element(), addEventListener() {} },
    addEventListener() {}, removeEventListener() {}, innerWidth: 844, innerHeight: 390, devicePixelRatio: 1, matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, performance: { now: () => time }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {}, AudioContext: function () { return stub(); }, navigator: {}, screen: {}, location: { search: '?engine=1', href: '' }, console, URLSearchParams };
  ctx.window = ctx; ctx.globalThis = ctx; vm.runInNewContext(script, ctx);
  return ctx.__dz.editor;
}

// Gleiche Suche wie runCheck im Editor (Bewegungen aus jedem erreichten Standplatz)
function check(E, D, ab) {
  let Lv = E.load(D, ab); Lv.enemies.length = 0; const P = E.P, TSx = E.TS, MAXV = E.PH.max;
  if (Lv.shoesItem) Lv.shoesItem.got = true;   // Prüfung mit vollem Tempo
  const st = { L: false, R: false, J: false }; const apply = () => E.keys(st.L, st.R, st.J);
  const set = (k, on) => { if (k === 'D') { if (on) E.dash(); return; } if (st[k] !== on) { st[k] = on; apply(); } };
  const release = () => { st.L = st.R = st.J = false; apply(); };
  const place = (n, vx) => { release(); Object.assign(P, { x: n.x, y: n.feet - P.h, vx, vy: 0, ground: true, plat: null, usedDouble: false, airDash: false, dashT: 0, dashCD: 0, kickT: 0, glide: false, wallDir: 0, buffer: 0, coyote: 0, inv: 5 }); };
  const M_ = []; const has = a => ab.includes(a);
  for (const d of ['R', 'L']) { const o = d === 'R' ? 'L' : 'R';
    M_.push({ f: f => { set(d, f < 14); return f >= 14 && P.ground; }, spd: [0] });
    for (const h of [3, 20]) for (const k of [0, 12, 26, 999]) M_.push({ f: f => { set('J', f < h); set(d, f < k); return f > 3 && P.ground; }, spd: [0, 1], dir: d });
    if (has('double')) { for (const t2 of [16, 28]) for (const k of [30, 999]) M_.push({ f: f => { set('J', f < 20 || (f >= t2 && f < t2 + 20)); set(d, f < k); return f > 3 && P.ground; }, spd: [0, 1], dir: d });
      for (const t2 of [24, 34, 44]) M_.push({ f: f => { set(d, true); set('J', f >= t2 && f < t2 + 18); return f > t2 + 4 && P.ground; }, spd: [0, 1], max: 300, dir: d }); }
    if (has('dash')) { for (const td of [12, 26]) M_.push({ f: f => { set('J', f < 20); set(d, true); set('D', f === td); return f > 3 && P.ground; }, spd: [0, 1], dir: d });
      M_.push({ f: f => { set(d, true); set('D', f === 2); return f > 16 && P.ground; }, spd: [0, 1], dir: d });
      if (has('double')) M_.push({ f: f => { set('J', f < 20 || (f >= 24 && f < 44)); set(d, true); set('D', f === 44); return f > 3 && P.ground; }, spd: [1], dir: d }); }
    if (has('glide')) { for (const k of [40, 999]) M_.push({ f: f => { set('J', true); set(d, f < k); return f > 3 && P.ground; }, spd: [0, 1], max: 700, dir: d });
      M_.push({ f: f => { set('J', true); set(d, f > 100); return f > 3 && P.ground; }, spd: [0], max: 700 }); }
    if (has('wall')) for (const dt2 of has('double') ? [0, 10, 16] : [0]) { const s0 = {}; M_.push({ f: f => { if (f === 0) { s0.c = 0; s0.ev = [[0, 12]]; } set(d, true); set(o, false);
        if (P.wallDir) s0.c++; else s0.c = 0; const busy = s0.ev.some(([a, b]) => f >= a && f < a + b);
        if (P.wallDir && s0.c >= 2 && !busy && f > 8) { s0.ev.push([f, 12]); if (dt2) s0.ev.push([f + 12 + dt2, 12]); s0.c = -99; } if (!P.wallDir && s0.c < 0) s0.c = 0;
        const want = s0.ev.some(([a, b]) => f >= a && f < a + b), edge = s0.ev.some(([a]) => f === a); if (edge && st.J) set('J', false); set('J', want); return f > 8 && P.ground; }, spd: [0, 1], max: 500, dir: d }); }
  }
  const nodes = new Map(), queue = []; let goalHit = false;
  const addNode = () => { const c = Math.floor((P.x + P.w / 2) / TSx), feet = Math.round(P.y + P.h), r = Math.floor((feet - 1) / TSx), id = c + ',' + r; if (!nodes.has(id)) { const n = { c, r, x: P.x, feet }; nodes.set(id, n); queue.push(n); } };
  place({ x: Lv.start.x, feet: Lv.start.y + 14 }, 0); for (let i = 0; i < 20; i++) E.tick(1 / 60); if (P.ground) addNode(); else place({ x: Lv.start.x, feet: Lv.start.y + 14 }, 0), addNode();
  const got = new Set();
  const note = () => { for (const k of Lv.crystals) if (k.got) got.add(k.id); for (const k of Lv.stars) if (k.got) got.add(k.id); };
  while (queue.length) { const n = queue.shift();
    for (const m of M_) for (const s of m.spd) { const vx = s ? (m.dir === 'L' ? -MAXV : MAXV) : 0; place(n, vx); let px = P.x, py = P.y, dead = false, ok = false;
      for (let f = 0; f < (m.max || 200); f++) { const done = m.f(f); P.inv = 5; E.tick(1 / 60);
        if (E.state !== 'play') { goalHit = true; note(); E.state = 'play'; dead = true; break; }
        if (E.L !== Lv) { dead = true; break; } if (Math.abs(P.x - px) > 40 || Math.abs(P.y - py) > 40) { dead = true; break; } px = P.x; py = P.y; if (done) { ok = true; break; } }
      release(); note(); if (E.L !== Lv) { Lv = E.load(D, ab); Lv.enemies.length = 0; if (Lv.shoesItem) Lv.shoesItem.got = true; continue; }
      if (ok && !dead) { for (let i = 0; i < 4; i++) { P.inv = 5; E.tick(1 / 60); } if (P.ground) addNode(); } } }
  const g = Lv.goal || [...Lv.doors].sort((a, b) => b.x - a.x)[0], gc = g ? Math.floor(g.x / TSx) : -99, gr = g ? Math.floor((g.bottom - 1) / TSx) : -99;
  let goal = goalHit; for (const n of nodes.values()) if (Math.abs(n.c - gc) <= 1 && Math.abs(n.r - gr) <= 1) goal = true;
  const cells = {}; for (const k of [...Lv.crystals, ...Lv.stars]) cells[k.id] = `${Math.floor(k.x / TSx)},${Math.floor(k.y / TSx)}`;
  return { goal, got, cells, nodes: nodes.size };
}

const STEPS = [[], ['double'], ['double', 'wall'], ['double', 'wall', 'dash'], ['double', 'wall', 'dash', 'glide']];
const raw = process.argv.slice(2), jsonOut = raw.includes('--json'), args = raw.filter(a => a !== '--json'), onlyCheck = args[0] === '--pruefen', want = (onlyCheck ? args.slice(1) : args).map(a => isNaN(+a) ? a : +a);
const E = engine();
const worlds = want.length ? want : [...new Set(E.EDITABLE.filter(w => !String(w).startsWith('archiv')))];

if (onlyCheck) {
  for (const w of worlds) { const t0 = Date.now(); const D = E.levelData(w); const steps = E.BONUS_AB?.[w] ? [E.BONUS_AB[w], E.BONUS_AB[w].slice(0, -1)] : STEPS;   // Bonus: mit und ohne die jüngste Fähigkeit
    for (const ab of steps) { const r = check(E, D, ab); console.log(`${w} mit [${ab.join(', ') || '–'}]: Ziel ${r.goal ? 'erreichbar' : 'NICHT erreichbar'}, ${r.got.size}/${Object.keys(r.cells).length} Sammelstücke, ${r.nodes} Standplätze (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } }
  process.exit(0);
}

const m = src.match(/const REACH=\/\*erreichbar\*\/(\{[\s\S]*?\})\/\*erreichbar\*\/;/);
if (!m) throw new Error('REACH-Markierung in index.html fehlt');
const REACH = JSON.parse(m[1]);
for (const w of worlds) { const t0 = Date.now(), D = E.levelData(w), need = {};
  for (const ab of STEPS) { const r = check(E, D, ab); for (const id of r.got) if (!(id in need)) need[id] = ab.length ? ab[ab.length - 1] : ''; var cells = r.cells; }
  for (const k of Object.keys(REACH)) if (k.startsWith(w + ':')) delete REACH[k];
  for (const [id, cell] of Object.entries(cells)) REACH[`${w}:${cell}`] = id in need ? need[id] : 'x';   // x = mit keiner Fähigkeit gefunden
  console.log(`${w}: ${Object.entries(cells).map(([id]) => `${id}=${id in need ? need[id] || '–' : '?'}`).join(' ')} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
if (jsonOut) { console.log('JSON ' + JSON.stringify(Object.fromEntries(Object.entries(REACH).filter(([k]) => worlds.some(w => k.startsWith(w + ':')))))); process.exit(0); }
const sorted = Object.fromEntries(Object.entries(REACH).sort(([a], [b]) => a.localeCompare(b, 'de', { numeric: true })));
await writeFile(resolve(root, 'index.html'), src.replace(m[0], `const REACH=/*erreichbar*/${JSON.stringify(sorted)}/*erreichbar*/;`));
console.log('index.html: REACH aktualisiert');
