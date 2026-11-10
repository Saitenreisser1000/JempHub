// Gemeinsame Grundlage für erreichbar.mjs und kamera.mjs: lädt das Spiel ohne Bildschirm (nur Rechenkern) und
// durchsucht ein Level mit der echten Spielphysik – dieselbe Suche wie „Prüfen“ im Editor.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { inlineLevels } from './levels.mjs';

const root = import.meta.dirname;

export async function gameSource() { const src = await readFile(resolve(root, 'index.html'), 'utf8'); return { src, html: inlineLevels(src, resolve(root, 'levels')).html }; }

export function engine(html, { width = 844, height = 390 } = {}) {
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const stub = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub(), apply: () => stub(), set: () => true });
  const element = () => ({ classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, append() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, style: { setProperty() {} }, dataset: {}, hidden: false, textContent: '', innerHTML: '', getContext: () => stub(), width: 16, height: 16 });
  const ctx = { document: { getElementById: element, createElement: element, querySelector: () => null, querySelectorAll: () => [], documentElement: {}, body: element(), addEventListener() {} },
    addEventListener() {}, removeEventListener() {}, innerWidth: width, innerHeight: height, devicePixelRatio: 1, matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {}, AudioContext: function () { return stub(); }, navigator: {}, screen: {}, location: { search: '?engine=1', href: '' }, console, URLSearchParams };
  ctx.window = ctx; ctx.globalThis = ctx; vm.runInNewContext(script, ctx);
  return ctx.__dz.editor;
}

// Eingaben als Zustand; jede Bewegung ist eine Funktion f(Bild) → fertig?
function controls(E) {
  const st = { L: false, R: false, J: false }, P = E.P; const apply = () => E.keys(st.L, st.R, st.J);
  const set = (k, on) => { if (k === 'D') { if (on) E.dash(); return; } if (st[k] !== on) { st[k] = on; apply(); } };
  const release = () => { st.L = st.R = st.J = false; apply(); };
  const place = (n, vx) => { release(); Object.assign(P, { x: n.x, y: n.feet - P.h, vx, vy: 0, ground: true, plat: null, usedDouble: false, airDash: false, dashT: 0, dashCD: 0, kickT: 0, glide: false, wallDir: 0, buffer: 0, coyote: 0, inv: 5 }); };
  return { st, set, release, place };
}
function moves(E, ab, set, st) {
  const P = E.P, M_ = [], has = a => ab.includes(a);
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
  return M_;
}
function fresh(E, D, ab) { const Lv = E.load(D, ab); Lv.enemies.length = 0; if (Lv.shoesItem) Lv.shoesItem.got = true; return Lv; }   // ohne Gegner, mit vollem Tempo

// Breitensuche über Standplätze. Liefert Erreichbarkeit und – falls das Ziel erreicht wird – den Weg dorthin als Folge von Bewegungen.
export function search(E, D, ab) {
  let Lv = fresh(E, D, ab); const P = E.P, TSx = E.TS, MAXV = E.PH.max;
  const C = controls(E), M_ = moves(E, ab, C.set, C.st);
  const nodes = new Map(), queue = []; let goalStep = null;
  const g = Lv.goal || [...Lv.doors].sort((a, b) => b.x - a.x)[0], gc = g ? Math.floor(g.x / TSx) : -99, gr = g ? Math.floor((g.bottom - 1) / TSx) : -99;
  const addNode = (from, mi, s) => { const c = Math.floor((P.x + P.w / 2) / TSx), feet = Math.round(P.y + P.h), r = Math.floor((feet - 1) / TSx), id = c + ',' + r;
    if (!nodes.has(id)) { const n = { id, c, r, x: P.x, feet, from, mi, s }; nodes.set(id, n); queue.push(n); } };
  const start = { x: Lv.start.x, feet: Lv.start.y + 14 };
  C.place(start, 0); for (let i = 0; i < 20; i++) E.tick(1 / 60); if (P.ground) addNode(null); else { C.place(start, 0); addNode(null); }
  const got = new Set(), note = () => { for (const k of Lv.crystals) if (k.got) got.add(k.id); for (const k of Lv.stars) if (k.got) got.add(k.id); };
  while (queue.length) { const n = queue.shift();
    for (let mi = 0; mi < M_.length; mi++) { const m = M_[mi]; for (const s of m.spd) { const vx = s ? (m.dir === 'L' ? -MAXV : MAXV) : 0; C.place(n, vx); let px = P.x, py = P.y, dead = false, ok = false;
      for (let f = 0; f < (m.max || 200); f++) { const done = m.f(f); P.inv = 5; E.setFlow(0); E.tick(1 / 60);
        if (E.state !== 'play') { if (!goalStep) goalStep = { from: n, mi, s }; note(); E.state = 'play'; dead = true; break; }
        if (E.L !== Lv) { dead = true; break; } if (Math.abs(P.x - px) > 40 || Math.abs(P.y - py) > 40) { dead = true; break; } px = P.x; py = P.y; if (done) { ok = true; break; } }
      C.release(); note(); if (E.L !== Lv) { Lv = fresh(E, D, ab); continue; }
      if (ok && !dead) { for (let i = 0; i < 4; i++) { P.inv = 5; E.setFlow(0); E.tick(1 / 60); } if (P.ground) addNode(n, mi, s); } } } }
  let goalNode = null; for (const n of nodes.values()) if (Math.abs(n.c - gc) <= 1 && Math.abs(n.r - gr) <= 1) { goalNode = n; break; }
  const cells = {}; for (const k of [...Lv.crystals, ...Lv.stars]) cells[k.id] = `${Math.floor(k.x / TSx)},${Math.floor(k.y / TSx)}`;
  // Weg: Kette der Bewegungen vom Start bis zum Ziel
  let path = null; const end = goalStep ? goalStep.from : goalNode;
  if (end) { path = []; for (let n = end; n && n.from; n = n.from) path.unshift({ from: n.from, mi: n.mi, s: n.s }); if (goalStep) path.push(goalStep); }
  return { goal: !!(goalStep || goalNode), got, cells, nodes: nodes.size, path, start };
}

// Spielt einen gefundenen Weg ab und ruft nach jedem Bild onFrame auf (z. B. um die Kamera mitlaufen zu lassen).
export function replay(E, D, ab, path, onFrame) {
  let Lv = fresh(E, D, ab); const P = E.P, MAXV = E.PH.max, C = controls(E), M_ = moves(E, ab, C.set, C.st); let frames = 0, cuts = 0;
  for (const step of path) { const m = M_[step.mi], vx = step.s ? (m.dir === 'L' ? -MAXV : MAXV) : 0;
    // wie in der Suche: gleicher Ausgangszustand. Meist steht Sam schon dort; weicht der Lauf ab (Fahrplattform in anderer Phase,
    // Bröckelblock schon weg), wird er an den Standplatz gesetzt – das zählt als Schnitt und wird aus der Messung herausgehalten.
    const cut = Math.abs(P.x - step.from.x) > 6 || Math.abs(P.y + P.h - step.from.feet) > 6; if (cut && frames) cuts++;
    C.place(step.from, vx); let done = false;
    for (let f = 0; f < (m.max || 200) && !done; f++) { done = m.f(f); P.inv = 5; E.setFlow(0); E.tick(1 / 60); frames++;
      if (E.state !== 'play') { onFrame?.(Lv, cut && f === 0); return { frames, finished: true, cuts }; }
      if (E.L !== Lv) { Lv = E.L; if (Lv.shoesItem) Lv.shoesItem.got = true; Lv.enemies.length = 0; break; }
      onFrame?.(Lv, cut && f === 0); }
    C.release();
    for (let i = 0; i < 4; i++) { P.inv = 5; E.setFlow(0); E.tick(1 / 60); frames++; if (E.L === Lv) onFrame?.(Lv, false); } }
  return { frames, finished: false, cuts };
}
