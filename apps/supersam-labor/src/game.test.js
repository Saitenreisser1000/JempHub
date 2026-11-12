// Rauchtest: lädt das Spielskript aus index.html mit Browser-Attrappen und spielt jede Welt kurz an.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { inlineLevels, readLevels } from '../levels.mjs';
// Die Spieltests laufen gegen die Levels aus dem Code, damit im Editor geänderte Welten sie nicht brechen.
// Die Dateien in levels/ (aus dem Editor) prüfen die Tests „Editor-Levels“ weiter unten.
const LEVELS_DIR = resolve(import.meta.dirname, '..', 'levels');
const html = readFileSync(resolve(import.meta.dirname, '..', 'index.html'), 'utf8');
const scriptOf = h => h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>'));
const script = scriptOf(html);

function stub() {
  const f = function () { return stub(); };
  return new Proxy(f, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : p === 'width' || p === 'height' ? 64 : stub()),
    set: () => true,
    apply: () => stub(),
  });
}

function boot(src = script) {
  const listeners = {};
  const warnings = [];
  let time = 0;
  let frame = null;
  const element = () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, append() {}, querySelectorAll: () => [],
    style: { setProperty() {} }, hidden: false, textContent: '', innerHTML: '', getContext: () => stub(), width: 16, height: 16,
  });
  const ctx = {
    document: { getElementById: element, createElement: element, documentElement: {}, addEventListener() {} },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    innerWidth: 844, innerHeight: 390, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: () => null, setItem() {} },
    performance: { now: () => time },
    requestAnimationFrame: fn => { if (fn.name === 'frame') frame = fn; return 1; }, cancelAnimationFrame() {},
    setInterval: () => 0, setTimeout: () => 0, clearTimeout() {},
    AudioContext: function () { return stub(); },
    navigator: {}, screen: {},
    console: { ...console, warn: (...a) => warnings.push(a.join(' ')) },
  };
  ctx.window = ctx;
  vm.runInNewContext(src, ctx);
  const run = n => { for (let i = 0; i < n; i++) { time += 16.7; frame(time); } };
  return { dz: ctx.__dz, listeners, warnings, run };
}

test('Sprites haben gleich lange Zeilen', () => {
  const { warnings } = boot();
  assert.deepEqual(warnings, []);
});

test('Jede Welt lädt und lässt sich anspielen', () => {
  const { dz, listeners, run } = boot();
  dz.setState('play');
  Object.assign(dz.save.ab, { double: true, wall: true, dash: true, glide: true });
  for (const id of ['hub', 1, 2, 3, 4]) {
    dz.loadLevel(id);
    listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
    for (let k = 0; k < 30; k++) {
      run(10);
      listeners.keydown({ key: ' ', preventDefault() {} }); run(3); listeners.keyup({ key: ' ' });
      listeners.keydown({ key: 'Shift' });
    }
    listeners.keyup({ key: 'ArrowRight' });
    assert.ok(Number.isFinite(dz.P.x) && Number.isFinite(dz.P.y), `Welt ${id}: Position ist eine Zahl`);
  }
});

test('Höchsttempo wird eingehalten', () => {
  const { dz, listeners, run } = boot();
  dz.setState('play');
  dz.loadLevel(1);
  listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
  let max = 0;
  for (let i = 0; i < 120; i++) { run(1); max = Math.max(max, Math.abs(dz.P.vx)); }
  assert.ok(max <= dz.PH.max + 0.001, `vx ${max}`);
});

test('Musik und Effekte laufen ohne Fehler', () => {
  const { dz } = boot();
  dz.audioInit();
  for (const name of Object.keys(dz.SFX)) dz.SFX[name](2);
  for (const id of ['hub', 1, 2, 3, 4]) {
    dz.AU.song = null; dz.playSong(id);
    for (let i = 0; i < 64; i++) dz.playStep(i, 1);
  }
});

test('Hügel und Senken lassen sich in beide Richtungen durchlaufen', () => {
  const { dz, listeners, run } = boot();
  dz.PH.max = 60;
  for (const [lv, col, key, frames, minCols] of [[1, 42, 'ArrowRight', 260, 14], [1, 64, 'ArrowRight', 140, 7], [1, 334, 'ArrowLeft', 140, 6], [4, 31, 'ArrowRight', 160, 8]]) {
    dz.setState('play'); dz.loadLevel(lv); dz.L.enemies.length = 0; dz.L.goal = null;
    let r = 0; for (let y = 0; y < dz.L.h; y++) if (dz.L.grid[y][col] === '#') { r = y; break; }
    dz.P.x = col * 16; dz.P.y = r * 16 - 14; run(5);
    const x0 = dz.P.x; let air = 0;
    listeners.keydown({ key, preventDefault() {} });
    for (let i = 0; i < frames; i++) { run(1); if (!dz.P.ground) air++; }
    listeners.keyup({ key });
    assert.ok(Math.abs(dz.P.x - x0) / 16 >= minCols, `Welt ${lv} ab ${col}: nur ${((dz.P.x - x0) / 16).toFixed(1)} Kacheln`);
    assert.ok(air <= 2, `Welt ${lv} ab ${col}: ${air} Frames in der Luft`);
  }
});

test('Kamera schlägt beim Landen auf einer höheren Plattform nicht nach unten aus', () => {
  const { dz, listeners, run } = boot();
  dz.setState('play'); dz.loadLevel('uebung'); dz.L.enemies.length = 0; dz.L.shoesItem.got = true;   // volles Tempo für den Anlauf
  dz.P.x = 33 * 16; dz.P.y = 17 * 16 - 14; run(60);
  const before = dz.cam.camY; let maxY = before;
  listeners.keydown({ key: 'ArrowRight', preventDefault() {} }); run(4);
  listeners.keydown({ key: ' ', preventDefault() {} });
  for (let i = 0; i < 120; i++) { run(1); maxY = Math.max(maxY, dz.cam.camY); if (i === 20) listeners.keyup({ key: 'ArrowRight' }); }
  assert.ok(dz.P.y < 14 * 16, 'Sam steht auf der Mauer');
  assert.ok(maxY <= before + 0.5, `Kamera ging um ${(maxY - before).toFixed(1)} px nach unten`);
});

test('Neue Gegner bewegen sich und bleiben im Level', () => {
  const { dz, run } = boot();
  const seen = new Set();
  for (const lv of [1, 2, 3, 4]) {
    dz.setState('play'); dz.loadLevel(lv);
    for (const e of dz.L.enemies) {
      if (e.type === 'beetle') continue;
      seen.add(e.type);
      const x0 = e.x, y0 = e.y;
      dz.P.x = e.spawn.x + 64; dz.P.y = e.spawn.y - 40; dz.P.vy = 0;
      if (e.type === 'fisch') { e.state = 'leap'; e.vy = -340; }
      let moved = 0;
      // Sam schwebt fest über dem Gegner: fiele er z. B. ins Wasser, würde der Neustart alle Gegner auf ihren Startplatz zurücksetzen
      const px = dz.P.x, py = dz.P.y;
      for (let i = 0; i < 120; i++) { dz.P.x = px; dz.P.y = py; dz.P.vy = 0; run(1); moved = Math.max(moved, Math.abs(e.x - x0) + Math.abs(e.y - y0)); }
      assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), `${e.type} hat gültige Position`);
      assert.ok(e.y < dz.L.h * 16, `${e.type} ist nicht aus dem Level gefallen`);
      assert.ok(moved > 1 || !e.alive, `${e.type} bewegt sich`);
    }
  }
  assert.deepEqual([...seen].sort(), ['fisch', 'frosch', 'geist', 'igel', 'skorpion', 'wespe']);
});

test('Geheimgänge werden aufgedeckt und Sternmünzen sind erreichbar', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  const setup = (lv, col, row) => { dz.setState('play'); dz.loadLevel(lv); dz.L.enemies.length = 0; dz.P.x = col * 16 + 3; dz.P.y = (row + 1) * 16 - 14; dz.P.vx = 0; dz.P.vy = 0; run(3); };
  setup(1, 166, 24); const ws = dz.L.stars.find(s => Math.floor(s.x / 16) === 153);
  key('ArrowLeft', 1); for (let i = 0; i < 200 && !ws.got; i++) run(1); key('ArrowLeft', 0);
  assert.ok(dz.L.reveal.size > 0 && ws.got, 'Wald: Versteck hinter der Bachbett-Wand');
  setup(2, 174, 22); key('ArrowRight', 1); for (let i = 0; i < 150 && !dz.L.stars[0].got; i++) run(1); key('ArrowRight', 0);
  assert.ok(dz.L.stars[0].got, 'Felsen: Geheimgang im Tafelberg');
  setup(3, 218, 22); key('ArrowRight', 1); for (let i = 0; i < 200 && !dz.L.stars[1].got; i++) run(1); key('ArrowRight', 0);
  assert.ok(dz.L.stars[1].got, 'See: Geheimraum im Felsen');
  Object.assign(dz.save.ab, { double: true, wall: true, dash: true, glide: true });
  setup(4, 212, 24); key('ArrowRight', 1); run(3); listeners.keydown({ key: 'Shift' }); run(40); key('ArrowRight', 0);
  assert.equal(dz.L.grid[21][214], ' ', 'Gipfel: Höhlenausgang per Dash');
});

test('Kamera bleibt bei kurzen Hüpfern ruhig und folgt ohne Ruck', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  dz.PH.camFrame = 0;
  dz.setState('play'); dz.loadLevel('hub'); dz.P.x = 20 * 16; dz.P.y = 23 * 16 - 14; run(90);
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < 300; i++) { if (i % 40 === 0) key(' ', 1); if (i % 40 === 4) key(' ', 0); run(1); mn = Math.min(mn, dz.cam.cy); mx = Math.max(mx, dz.cam.cy); }
  assert.ok(mx - mn < 1, `Kamera bewegte sich bei kurzen Hüpfern um ${(mx - mn).toFixed(1)} px`);
  dz.setState('play'); dz.loadLevel(2); dz.L.enemies.length = 0; dz.P.x = 146 * 16; dz.P.y = 19 * 16 - 14; run(90);
  const ys = []; key('ArrowRight', 1); for (let i = 0; i < 120; i++) { run(1); ys.push(dz.cam.cy); } key('ArrowRight', 0);
  let jerk = 0; for (let i = 2; i < ys.length; i++) jerk = Math.max(jerk, Math.abs((ys[i] - ys[i - 1]) - (ys[i - 1] - ys[i - 2])));
  assert.ok(jerk < 1, `Ruck auf der Rampe ${jerk.toFixed(2)}`);
});

test('Kamera zoomt aus, wenn die nächste Plattform hoch oder tief liegt', () => {
  const { dz, run } = boot();
  for (const [lv, col, row, targetRow] of [[2, 13, 22, 16], [1, 40, 11, 19], [1, 203, 18, 10]]) {
    dz.setState('play'); dz.loadLevel(lv); dz.L.enemies.length = 0;
    dz.P.x = col * 16 + 3; dz.P.y = (row + 1) * 16 - 14; dz.P.face = 1; run(240);
    const c = dz.cam, ty = targetRow * 16;
    assert.ok(c.zoom > 1.3, `Welt ${lv} Spalte ${col}: Zoom ${c.zoom.toFixed(2)}`);
    assert.ok(ty >= c.camY + 8 && ty <= c.camY + c.viewH - 4, `Welt ${lv} Spalte ${col}: Ziel Reihe ${targetRow} nicht im Bild`);
    assert.ok(dz.P.y >= c.camY && dz.P.y + 14 <= c.camY + c.viewH, `Welt ${lv} Spalte ${col}: Sam nicht im Bild`);
  }
});

test('Käfig am Ziel öffnet erst mit genug Punkten', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  for (const lv of [1, 2, 3, 4]) {
    Object.assign(dz.save.ab, { double: false, wall: false, dash: false, glide: false });
    dz.setState('play'); dz.loadLevel(lv); dz.L.enemies.length = 0;
    const g = dz.L.goal; dz.P.x = g.x - 80; dz.P.y = g.bottom - 14; run(10);
    assert.ok(dz.score() < dz.L.need, `Welt ${lv}: Restzeit allein reicht nicht`);
    key('ArrowRight', 1); run(120); key('ArrowRight', 0);
    assert.equal(dz.cage.open, false, `Welt ${lv}: Käfig bleibt zu`);
    assert.ok(dz.gate.door >= 1, `Welt ${lv}: Käfig wird zur Tür`);
    dz.addCoins(Math.ceil((dz.L.need - dz.score()) / 10) + 5);
    key('ArrowLeft', 1); run(20); key('ArrowLeft', 0); key('ArrowRight', 1); run(200); key('ArrowRight', 0); run(200);
    assert.equal(dz.cage.open, true, `Welt ${lv}: Käfig öffnet mit genug Punkten`);
    assert.equal(dz.save.ab[['', 'double', 'wall', 'dash', 'glide'][lv]], true, `Welt ${lv}: Fähigkeit erhalten`);
  }
});

test('Tür bei zu wenig Punkten startet die Welt neu; Gegner und Tod ändern die Punkte', () => {
  const { dz, run } = boot();
  dz.setState('play'); dz.loadLevel(1); dz.L.enemies.length = 0; const g = dz.L.goal;
  dz.addCoins(12); run(300);
  dz.P.x = g.x + 3; dz.P.y = g.bottom - 14; dz.P.vx = 0;
  let restarted = false; for (let i = 0; i < 120 && !restarted; i++) { run(1); restarted = dz.P.x < 20 * 16; }
  assert.ok(restarted, 'Stillstand in der Tür startet neu');
  assert.equal(dz.scoreParts().coins, 0, 'Münzpunkte zurückgesetzt');
  dz.setState('play'); dz.loadLevel(1);
  const e = dz.L.enemies.find(e => e.type === 'beetle'), s0 = dz.score();
  dz.P.x = e.x; dz.P.y = e.y - 40; dz.P.vy = 200; run(20);
  assert.equal(dz.scoreParts().nk, 1, 'Käfer zählt als besiegt');
  assert.ok(dz.score() - s0 >= 45, 'Gegner bringt Punkte');
  const s1 = dz.score(); dz.P.y = 40 * 16; run(3);
  assert.equal(dz.scoreParts().nd, 1, 'Tod zählt'); assert.ok(s1 - dz.score() >= 95, 'Tod kostet Punkte');
});

test('Nach dem Wiedereinstieg 2 Sekunden unverwundbar', () => {
  const { dz, run } = boot();
  dz.setState('play'); dz.loadLevel(1);
  dz.die(); const d0 = dz.scoreParts().nd;
  const e = dz.L.enemies.find(e => e.type === 'beetle');
  const hold = () => { e.x = dz.P.x; e.y = dz.P.y + dz.P.h - e.h; };
  for (let i = 0; i < 100; i++) { hold(); run(1); }
  assert.equal(dz.scoreParts().nd, d0, 'in der Schutzzeit kein Tod');
  let died = false; for (let i = 0; i < 40 && !died; i++) { hold(); run(1); died = dz.scoreParts().nd > d0; }
  assert.ok(died, 'nach der Schutzzeit wieder verwundbar');
});

test('Endgegner: ein Boss je Abschnitt, Kronentore, Bosse brauchen Fähigkeiten', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  dz.setState('play'); dz.loadLevel('hub');
  assert.equal(dz.L.coins.length, 0, 'keine Münzen in der Hubwelt');
  const bossDoors = dz.L.doors.filter(d => typeof d.world === 'string').map(d => d.world);
  assert.equal(JSON.stringify(bossDoors), JSON.stringify(['b0', 'b2', 'b1', 'b3']), 'Boss-Reihenfolge Wald, Felsen, See, Gipfel');
  assert.equal(JSON.stringify(dz.L.gates.map(g => [g.boss, g.open])), JSON.stringify([['b0', false], ['b2', false], ['b1', false]]), 'Kronentore zu');
  const gx = dz.L.gates[0].x / 16; assert.ok(dz.L.grid[0][gx] === 'K' && dz.L.grid[22][gx] === 'K', 'Kronentor sperrt die ganze Höhe');
  dz.save.bosses.b0 = true; dz.loadLevel('hub');
  assert.equal(dz.L.gates[0].open, true, 'Krone der Wespenkönigin öffnet das erste Tor'); assert.ok(dz.L.grid[22][gx] !== 'K', 'Durchgang frei');
  delete dz.save.bosses.b0;
  // Wespenkönigin: einfacher Sprung reicht nicht, von oben (Doppelsprung) trifft
  dz.setState('play'); dz.loadLevel('b0'); run(80); let Q = dz.boss;
  dz.P.inv = 5; dz.P.x = Q.x + Q.w / 2 - 5; dz.P.y = 15 * 16 - 14; dz.P.vy = 0; run(3);
  key(' ', 1); let top0 = 1e9; for (let i = 0; i < 40; i++) { run(1); top0 = Math.min(top0, dz.P.y + dz.P.h); } key(' ', 0);
  assert.ok(top0 > Q.y + 4, 'Einfacher Sprung kommt nicht über die Königin');
  for (let k = 0; k < 3; k++) { Q.inv = 0; Q.state = 'fly'; dz.P.inv = 0; for (let i = 0; i < 4; i++) { dz.P.x = Q.x + Q.w / 2 - 5; dz.P.y = Q.y - 16 + i * 3; dz.P.vy = 150; run(1); } for (let i = 0; i < 20; i++) { dz.P.inv = 5; run(1); } }
  assert.equal(Q.hp, 0, 'Wespenkönigin besiegt');
  Object.assign(dz.save.ab, { double: true, wall: true, dash: true, glide: true });
  // Igelkönig: Draufspringen hilft nicht, Dash im benommenen Zustand trifft
  dz.setState('play'); dz.loadLevel('b1'); run(80); let B = dz.boss;
  B.state = 'dizzy'; B.timer = 3; B.x = 20 * 16; dz.P.inv = 0; dz.P.face = 1; dz.P.x = B.x - 24; dz.P.y = 13 * 16 - 14; run(1);
  key('ArrowRight', 1); run(1); listeners.keydown({ key: 'Shift' }); run(12); key('ArrowRight', 0);
  assert.equal(B.hp, 2, 'Dash trifft den Igelkönig');
  for (let i = 0; i < 30; i++) { dz.P.inv = 5; run(1); }
  for (let k = 0; k < 2; k++) { B.state = 'dizzy'; B.timer = 3; B.inv = 0; B.x = 20 * 16; dz.P.inv = 0; dz.P.face = 1; dz.P.x = B.x - 24; dz.P.y = 13 * 16 - 14; dz.P.vx = 0; dz.P.dashCD = 0; run(1);
    key('ArrowRight', 1); run(1); listeners.keydown({ key: 'Shift' }); run(14); key('ArrowRight', 0); for (let i = 0; i < 30; i++) { dz.P.inv = 5; run(1); } }
  for (let i = 0; i < 160; i++) { dz.P.inv = 5; run(1); }
  assert.ok(B.trophy, 'Igelkönig lässt die Krone fallen');
  dz.P.x = B.trophy.x - 5; dz.P.y = 13 * 16 - 14; run(220);
  assert.equal(dz.save.bosses.b1, true, 'Igelkönig-Sieg gespeichert');
  // Felsgolem: Einzelsprung erreicht den Kopf nicht, Kopftreffer von oben zählt
  dz.setState('play'); dz.loadLevel('b2'); run(60); B = dz.boss;
  dz.save.ab.double = false; dz.P.inv = 5; dz.P.x = 4 * 16; dz.P.y = 15 * 16 - 14; run(5);
  key(' ', 1); let top = 1e9; for (let i = 0; i < 40; i++) { run(1); top = Math.min(top, dz.P.y + dz.P.h); } key(' ', 0);
  assert.ok(top > B.y, 'Kopf ohne Doppel-/Wandsprung unerreichbar');
  dz.save.ab.double = true; B.inv = 0; dz.P.inv = 0; dz.P.x = B.x + B.w / 2 - 5; dz.P.y = B.y - 60; dz.P.vy = 150; run(20);
  assert.equal(B.hp, 2, 'Kopftreffer am Golem');
  // Sturmgeist: drei Treffer von oben, dann Krone und Sieg
  dz.setState('play'); dz.loadLevel('b3'); run(60); B = dz.boss;
  for (let k = 0; k < 3; k++) { B.inv = 0; dz.P.inv = 0; for (let i = 0; i < 4; i++) { dz.P.x = B.x + B.w / 2 - 5; dz.P.y = B.y - 16 + i * 3; dz.P.vy = 150; run(1); } for (let i = 0; i < 20; i++) { dz.P.inv = 5; run(1); } }
  assert.equal(B.hp, 0, 'Sturmgeist besiegt');
  for (let i = 0; i < 150; i++) { dz.P.inv = 5; run(1); }
  assert.ok(B.trophy, 'Krone erscheint');
  dz.P.x = B.trophy.x - 5; dz.P.y = 17 * 16 - 14; run(220);
  assert.equal(dz.save.bosses.b3, true, 'Sieg gespeichert');
});

test('Nach dem letzten Endgegner kommt der Abschluss-Bildschirm', () => {
  const { dz, run } = boot();
  Object.assign(dz.save.ab, { double: true, wall: true, dash: true, glide: true });
  dz.save.bosses.b0 = true; dz.save.bosses.b1 = true; dz.save.bosses.b2 = true;
  dz.setState('play'); dz.loadLevel('b3'); run(60); const B = dz.boss;
  for (let k = 0; k < 3; k++) { B.inv = 0; dz.P.inv = 0; for (let i = 0; i < 4; i++) { dz.P.x = B.x + B.w / 2 - 5; dz.P.y = B.y - 16 + i * 3; dz.P.vy = 150; run(1); } for (let i = 0; i < 20; i++) { dz.P.inv = 5; run(1); } }
  for (let i = 0; i < 150; i++) { dz.P.inv = 5; run(1); }
  assert.equal(dz.save.endingSeen, false, 'noch nicht vor dem Sieg');
  dz.P.x = B.trophy.x - 5; dz.P.y = 17 * 16 - 14;
  for (let i = 0; i < 220 && !dz.save.endingSeen; i++) run(1);
  assert.equal(dz.save.bosses.b3, true, 'dritter Boss besiegt');
  assert.equal(dz.save.endingSeen, true, 'Abschluss-Bildschirm gezeigt');
});

test('Outfits verändern Sam je nach Fähigkeiten', () => {
  const { dz } = boot();
  const base = dz.HERO_ROWS.idle.join('\n');
  const look = ab => dz.dress(dz.HERO_ROWS.idle, ab).join('\n');
  assert.equal(look({}), base, 'ohne Fähigkeit unverändert');
  assert.match(look({ double: true }), /u/, 'Flügelschuhe');
  assert.match(look({ wall: true }), /n/, 'Stirnband');
  assert.match(look({ dash: true }), /L/, 'Blitz-Shirt');
  assert.match(look({ glide: true }), /c/, 'Umhang');
  const all = look({ double: true, wall: true, dash: true, glide: true });
  for (const ch of ['u', 'n', 'L', 'c', 'l']) assert.ok(all.includes(ch), `alle Teile kombiniert: ${ch}`);
  for (const r of all.split('\n')) assert.equal(r.length, 16, 'Zeilenbreite bleibt 16');
});

test('Übungswiese beim ersten Start: Stationen nacheinander, dann Hubwelt', () => {
  const { dz, listeners, run } = boot();
  const kd = key => listeners.keydown({ key, preventDefault() {} }), ku = key => listeners.keyup({ key });
  assert.equal(dz.save.tutorialDone, false, 'neuer Spielstand ohne Übung');
  dz.begin(); run(10);
  assert.equal(dz.L.id, 'uebung', 'erster Start beginnt auf der Übungswiese');
  assert.ok(dz.L.enemies.length > 0 && dz.L.enemies.every(e => e.x > dz.L.w * 16 / 2), 'Gegner nur in der zweiten Hälfte');
  assert.ok(dz.L.movers.length >= 2 && dz.L.springs.length >= 1, 'fahrende Plattformen und Feder vorhanden');
  dz.L.enemies.length = 0;
  const until = (n, max = 300) => { for (let i = 0; i < max && dz.TUT.i < n; i++) run(1); return dz.TUT.i >= n; };
  kd('ArrowRight'); assert.ok(until(1), 'Station 1: rechts laufen'); ku('ArrowRight');
  kd('ArrowLeft'); assert.ok(until(2), 'Station 2: zurück laufen'); ku('ArrowLeft');
  kd('ArrowRight');
  let w = 0; const W = [[24, 25.3], [35, 37], [45, 46.5]], win = c => c > W[w][0] && c < W[w][1];
  const hop = frames => { for (let i = 0; i < 200; i++) { const c = (dz.P.x + 5) / 16; if (dz.P.ground && dz.P.vx > 100 && win(c)) break; run(1); } kd(' '); run(frames); ku(' '); w++; };
  hop(3); assert.ok(until(3), 'Station 3: Kiste übersprungen');
  hop(14); assert.ok(until(4), 'Station 4: Mauer mit langem Sprung');
  hop(10); assert.ok(until(5), 'Station 5: Graben');
  const vertical = stop => { for (let i = 0; i < 300 && (dz.P.x + 5) / 16 < stop; i++) run(1); ku('ArrowRight'); run(20); kd(' '); run(4); kd('ArrowRight'); run(14); ku(' '); };
  vertical(63.3); assert.ok(until(6), 'Station 6: senkrecht auf den Block');
  // Ab hier ein einfacher Läufer: springt voll, wenn vorn ein Hindernis oder eine Lücke ist
  const solid = (c, r) => '#=BX'.includes((dz.L.grid[r] || [])[c] || ' ');
  const auto = (n, max = 900) => { let j = 0;
    for (let i = 0; i < max && dz.TUT.i < n; i++) { const P = dz.P, c = Math.floor((P.x + P.w / 2) / 16), r = Math.floor((P.y + P.h - 1) / 16);
      if (j > 0) { j--; if (j === 0) ku(' '); } else if (P.ground && (solid(c + 1, r) || solid(c + 2, r) || !solid(c + 2, r + 1))) { kd(' '); j = 14; }
      run(1); }
    ku(' '); return dz.TUT.i >= n; };
  assert.ok(auto(7), 'Station 7: Treppe');
  assert.ok(auto(8), 'Station 8: Bretter über dem Graben');
  vertical(137.3); assert.ok(until(9), 'Station 9: noch einmal senkrecht');
  assert.ok(auto(10), 'Station 10: Parcours');
  ku('ArrowRight'); ku(' ');
  // Stationen 11–14 zählen erst, wenn Sam hinter dem Hindernis steht
  const place = (c, feetRow) => { dz.P.x = c * 16; dz.P.y = feetRow * 16 - 14; dz.P.vx = 0; dz.P.vy = 0; run(2); };
  for (const [n, c, r] of [[11, 216, 17], [12, 228, 10], [13, 248, 17], [14, 264, 17]]) { place(c, r); assert.ok(until(n), `Station ${n} gezählt`); }
  assert.equal(dz.L.stars.length, 3, 'drei Sterne auf der Übungswiese');
  dz.L.stars[0].got = dz.L.stars[1].got = true;
  place(294, 17);
  for (let i = 0; i < 200 && dz.L.id === 'uebung'; i++) run(1);
  assert.equal(dz.L.id, 'uebung', 'Tür bleibt zu, solange ein Stern fehlt');
  place(280, 17); run(5); dz.L.stars[2].got = true; place(294, 17);
  for (let i = 0; i < 200 && dz.L.id === 'uebung'; i++) run(1);
  assert.equal(dz.L.id, 'hub', 'mit allen 3 Sternen führt die Tür in die Hubwelt');
  assert.equal(dz.save.tutorialDone, true, 'Übung gilt als erledigt');
  assert.equal(dz.TUT.on, false, 'Übungsleiste ausgeblendet');
});

test('Neue Welten: Türen in der Hubwelt und Abschluss ohne neue Fähigkeit', () => {
  const { dz, run, warnings } = boot();
  dz.setState('play'); dz.loadLevel('hub');
  const worlds = dz.L.doors.map(d => String(d.world)).sort();
  assert.equal(JSON.stringify(worlds), JSON.stringify(['1', '2', '3', '4', '5', '6', '7', '8', 'b0', 'b1', 'b2', 'b3']), 'alle Türen vorhanden');
  for (const n of [5, 6, 7, 8]) {
    dz.setState('play'); dz.loadLevel(n); run(30);
    assert.ok(dz.L.goal, `Welt ${n} hat ein Ziel`);
    assert.ok(dz.L.crystals.length >= 3 && dz.L.stars.length >= 2, `Welt ${n} hat Diamanten und Sterne`);
    assert.ok(dz.L.need > 0 && dz.L.timeLimit > 0, `Welt ${n} hat Punkteziel und Zeit`);
  }
  for (const n of [1, 2, 3, 4]) { dz.loadLevel(n); assert.ok(dz.L.w >= 360, `Welt ${n} ist größer geworden`); }
  dz.save.ab.double = true; dz.setState('play'); dz.loadLevel(5); dz.finishLevel();
  assert.equal(dz.save.done[5], true, 'Wipfelwald geschafft');
  assert.equal(JSON.stringify(Object.keys(dz.save.ab).filter(k => dz.save.ab[k])), JSON.stringify(['double']), 'keine neue Fähigkeit');
  assert.equal(warnings.length, 0, 'keine Fehler');
});

test('Weltnummern: Teil 1 und Teil 2 je Fähigkeitswelt, Summen aus allen Welten', () => {
  const { dz } = boot();
  assert.equal([1, 5, 2, 6, 3, 7, 4, 8].map(dz.WNO).join(' '), '1-1 1-2 2-1 2-2 3-1 3-2 4-1 4-2');
  const t = dz.totals();
  assert.equal(t.cr, Object.values(t.per).reduce((a, b) => a + b, 0), 'Gesamtsumme passt');
  assert.ok(t.per.hub >= 1, 'Hub-Diamant mitgezählt');
});

test('Boss-Tür öffnet erst nach Welt X-2', () => {
  const { dz, run } = boot();
  dz.save.ab.double = true; dz.save.done[1] = true;
  dz.setState('play'); dz.loadLevel('hub'); run(5);
  assert.ok(dz.map.go('b0') >= 0, 'Wespenkönigin auf der Karte'); dz.map.enter(); run(2);
  assert.equal(dz.L.id, 'hub', 'ohne 1-2 bleibt die Burg zu');
  dz.save.done[5] = true; dz.map.enter(); run(2);
  assert.equal(dz.L.id, 'b0', 'nach 1-2 geht es zur Wespenkönigin');
});

test('Hubwelt als Landkarte: Punkte in Reihenfolge, Laufen, Kronentor, Rückkehr, Geheimdiamant', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  dz.save.tutorialDone = true;
  dz.setState('play'); dz.loadLevel('hub'); run(5);
  assert.equal(dz.map.nodes.map(n => n.key).join(' '), 'home 1 5 b0 bonus1 g-b0 2 6 b2 bonus2 g-b2 3 7 b1 bonus3 g-b1 4 8 secret b3', 'Reihenfolge auf der Karte');
  assert.equal(dz.map.i, 0, 'Start bei der Übungswiese');
  key('ArrowRight', 1); for (let i = 0; i < 400; i++) run(1); key('ArrowRight', 0); for (let i = 0; i < 120; i++) run(1);
  assert.equal(dz.map.nodes[dz.map.i].key, 'g-b0', 'Kronentor der Wespenkönigin hält Sam auf');
  dz.map.go(1); dz.map.enter(); run(2); assert.equal(dz.L.id, 1, 'Springen betritt 1-1');
  dz.loadLevel('hub', 1); assert.equal(dz.map.nodes[dz.map.i].key, 1, 'zurück auf dem Punkt der Welt');
  dz.save.bosses.b0 = true; dz.loadLevel('hub', 'b0'); run(5);
  key('ArrowRight', 1); for (let i = 0; i < 60; i++) run(1); key('ArrowRight', 0); for (let i = 0; i < 120; i++) run(1);
  assert.ok(dz.map.i > dz.map.nodes.findIndex(n => n.key === 'g-b0'), 'nach dem Sieg geht es durch das Tor');
  // Antippen: Sam läuft selbst über den Weg zum Punkt, aber nicht durch ein geschlossenes Tor
  dz.map.go(1); dz.map.walkTo(6); for (let i = 0; i < 600 && dz.map.nodes[dz.map.i].key !== 6; i++) run(1);
  assert.equal(dz.map.nodes[dz.map.i].key, 6, 'Sam läuft zum angetippten Punkt');
  dz.map.walkTo('b3'); for (let i = 0; i < 900; i++) run(1);
  assert.equal(dz.map.nodes[dz.map.i].key, 'g-b2', 'vor dem geschlossenen Kronentor ist Schluss');
  // Geheimdiamant braucht Gleiten
  dz.map.go('secret'); dz.map.enter(); assert.ok(!dz.L.crystals[0].known, 'ohne Gleiten nichts');
  dz.save.ab.glide = true; dz.map.enter(); assert.ok(dz.save.crystals[dz.L.crystals[0].id], 'mit Gleiten gefunden');
  delete dz.save.crystals[dz.L.crystals[0].id];
});

test('Archiv: alte Fassungen von 1-1 und 1-2 bleiben erhalten, zählen aber nicht mit', () => {
  const { dz, run } = boot();
  for (const id of ['archiv1', 'archiv5']) { dz.setState('play'); dz.loadLevel(id); run(10); assert.ok(dz.L.goal && dz.L.crystals.length >= 3, `${id} ladbar`); }
  dz.setState('play'); dz.loadLevel('hub');
  assert.ok(!dz.L.doors.some(d => String(d.world).startsWith('archiv')), 'keine Tür in der Hubwelt');
  assert.equal(dz.totals().per.archiv1, undefined, 'nicht in den Summen');
});

test('Leveleditor: jede Welt übersetzt sich verlustfrei in Daten und zurück', () => {
  const { dz } = boot();
  const E = dz.editor;
  const sig = L => JSON.stringify({ g: L.grid.map(r => r.join('')), b: L.back.map(r => r.join()), u: L.up.map(r => r.join()),
    co: L.coins.map(k => [k.x, k.y]), cr: L.crystals.map(k => [k.id, k.x, k.y]), st: L.stars.map(k => [k.id, k.x, k.y]),
    en: L.enemies.map(e => [e.type, e.spawn.x, e.spawn.y, e.spawn.range]), sp: L.springs.map(s => [s.x, s.top]), cp: L.checkpoints.map(c => [c.x, c.bottom]),
    mv: L.movers.map(m => [m.x0, m.y0, m.x1, m.y1, m.w, m.period]), dr: L.doors.map(d => [d.x, d.bottom, d.world, d.need]), s: [L.start.x, L.start.y], go: L.goal && [L.goal.x, L.goal.bottom], need: L.need });
  for (const id of E.EDITABLE) {
    dz.setState('play'); dz.loadLevel(id); const a = sig(dz.L);
    const D = JSON.parse(JSON.stringify(E.levelData(id)));
    assert.equal(D.v, 1); assert.equal(D.grid.length, D.h); assert.equal(D.grid[0].length, D.w);
    assert.equal(sig(E.load(D, [])), a, `Welt ${id}: Daten ergeben dasselbe Level`);
  }
});

test('Leveleditor: ein geänderter Entwurf wird gespielt, ohne den Spielstand zu verändern', () => {
  const { dz, run } = boot();
  const E = dz.editor, D = JSON.parse(JSON.stringify(E.levelData(1)));
  D.grid[10] = D.grid[10].slice(0, 30) + '=====' + D.grid[10].slice(35);
  D.objs.push({ k: 'crystal', c: 32, r: 9 });
  const L = E.load(D, ['double']); run(10);
  assert.equal(L.grid[10][32], '=', 'neue Plattform im Spiel');
  assert.equal(L.crystals.length, 6, 'zusätzlicher Diamant im Spiel');
  assert.equal(dz.save.ab.double, true, 'Probespiel mit gewählten Fähigkeiten');
});

const levelSig = L => JSON.stringify({ g: L.grid.map(r => r.join('')), b: L.back.map(r => r.join()), u: L.up.map(r => r.join()),
  co: L.coins.map(k => [k.x, k.y]), cr: L.crystals.map(k => [k.x, k.y]), st: L.stars.map(k => [k.x, k.y]),
  en: L.enemies.map(e => [e.type, e.spawn.x, e.spawn.y]), sp: L.springs.map(s => [s.x, s.top]), s: [L.start.x, L.start.y] });

function playLevel(dz, listeners, run, id) {
  dz.setState('play'); dz.loadLevel(id);
  listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
  for (let k = 0; k < 25; k++) { run(10); listeners.keydown({ key: ' ', preventDefault() {} }); run(3); listeners.keyup({ key: ' ' }); }
  listeners.keyup({ key: 'ArrowRight' });
  assert.ok(Number.isFinite(dz.P.x) && Number.isFinite(dz.P.y), `Welt ${id}: Position ist eine Zahl`);
}

test('Editor-Levels in levels/: jede Datei ist gültig, gehört zu einer Welt und ist spielbar', () => {
  const files = readLevels(LEVELS_DIR), ids = Object.keys(files);
  const { dz, listeners, run } = boot(scriptOf(inlineLevels(html, LEVELS_DIR).html));
  Object.assign(dz.save.ab, { double: true, wall: true, dash: true, glide: true });
  for (const key of ids) {
    const id = dz.editor.EDITABLE.find(x => String(x) === key);
    assert.notEqual(id, undefined, `levels/: Welt ${key} gibt es im Spiel nicht`);
    playLevel(dz, listeners, run, id);
    assert.equal(dz.L.grid.length, files[key].h, `Welt ${key}: Level aus der Datei wird gespielt`);
  }
});

test('Editor-Levels: eine veröffentlichte Datei ersetzt die Welt, eine fehlerhafte stoppt den Build', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'supersam-levels-'));
  try {
    const { dz } = boot();
    const D = JSON.parse(JSON.stringify(dz.editor.levelData(1)));
    D.grid[10] = D.grid[10].slice(0, 30) + '=====' + D.grid[10].slice(35);
    writeFileSync(resolve(dir, 'supersam-level-1.json'), JSON.stringify(D));
    const b = boot(scriptOf(inlineLevels(html, dir).html));
    b.dz.setState('play'); b.dz.loadLevel(1);
    assert.equal(b.dz.L.grid[10][32], '=', 'Welt 1-1 kommt aus der Datei');
    assert.equal(levelSig(b.dz.editor.load(JSON.parse(JSON.stringify(b.dz.editor.levelData(1))), [])), levelSig((b.dz.setState('play'), b.dz.loadLevel(1), b.dz.L)), 'Original im Editor = veröffentlichte Fassung');
    playLevel(b.dz, b.listeners, b.run, 1);
    const ohneStart = { ...D, objs: D.objs.filter(o => o.k !== 'start') };
    writeFileSync(resolve(dir, 'supersam-level-1.json'), JSON.stringify(ohneStart));
    assert.throws(() => readLevels(dir), /kein Start/);
    writeFileSync(resolve(dir, 'supersam-level-1.json'), JSON.stringify({ ...D, grid: D.grid.slice(1) }));
    assert.throws(() => readLevels(dir), /Raster/);
    writeFileSync(resolve(dir, 'supersam-level-1.json'), '{ kaputt');
    assert.throws(() => readLevels(dir), /kein gültiges JSON/);
    writeFileSync(resolve(dir, 'supersam-level-1.json'), JSON.stringify(D));
    writeFileSync(resolve(dir, 'zweite.json'), JSON.stringify(D));
    assert.throws(() => readLevels(dir), /gibt es schon/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Steg (-): von unten durchspringen, oben stehen und darauf laufen, Gegner drehen an der Kante um', () => {
  const { dz } = boot(), E = dz.editor;
  const D = JSON.parse(JSON.stringify(E.levelData(1)));
  const st = D.objs.find(o => o.k === 'start'), r = D.top - 3, c0 = st.c + 2, c1 = st.c + 12;
  D.objs = D.objs.filter(o => o.k === 'start' || o.k === 'goal' || o.c < c0 - 3 || o.c > c1 + 3);
  for (let rr = 0; rr < D.top; rr++) D.grid[rr] = D.grid[rr].slice(0, c0 - 3) + ' '.repeat(c1 - c0 + 7) + D.grid[rr].slice(c1 + 4);
  for (let rr = D.top; rr < D.h; rr++) D.grid[rr] = D.grid[rr].slice(0, c0 - 3) + '#'.repeat(c1 - c0 + 7) + D.grid[rr].slice(c1 + 4);
  D.grid[r] = D.grid[r].slice(0, c0) + '-'.repeat(c1 - c0 + 1) + D.grid[r].slice(c1 + 1);
  D.objs.push({ k: 'enemy', t: 'beetle', c: c0 + 1, r: r - 1, range: 3 });
  const L = E.load(D, []), P = E.P, TS = E.TS;
  Object.assign(P, { x: (c0 + 4) * TS, y: D.top * TS - P.h, vx: 0, vy: 0, ground: true });
  for (let i = 0; i < 10; i++) E.tick(1 / 60);
  let top = 1e9; E.keys(false, false, true);
  for (let i = 0; i < 90; i++) { E.tick(1 / 60); top = Math.min(top, P.y + P.h); if (i === 20) E.keys(false, false, false); }
  assert.ok(top < r * TS, 'Sam springt durch den Steg nach oben');
  assert.ok(P.ground && Math.abs(P.y + P.h - r * TS) < .6, `Sam landet oben auf dem Steg (Füße ${P.y + P.h}, Steg ${r * TS})`);
  E.keys(false, true, false); for (let i = 0; i < 20; i++) E.tick(1 / 60); E.keys(false, false, false);
  for (let i = 0; i < 30; i++) E.tick(1 / 60);
  assert.ok(P.ground && Math.abs(P.y + P.h - r * TS) < .6, 'Sam läuft auf dem Steg und fällt nicht durch');
  const e = E.L.enemies.find(x => x.type === 'beetle' && Math.round(x.spawn.x / TS) === c0 + 1); assert.ok(e, 'Käfer da: ' + JSON.stringify(E.L.enemies.map(x => [x.type, x.spawn.x / TS, x.spawn.y])) + ' c0 ' + c0);
  for (let i = 0; i < 600; i++) E.tick(1 / 60);
  assert.ok(e.alive === false || Math.abs(e.y + e.h - r * TS) < 1, `Käfer bleibt auf dem Steg (${e.alive} ${e.x/TS} ${e.y + e.h} ${r * TS} sp ${e.spawn.y})`);
});

test('Kamera bleibt oben, wenn der Weg über einen Schacht auf gleicher Höhe weitergeht, und folgt erst beim Hinuntergehen', () => {
  const { dz, listeners, run } = boot();
  dz.setState('play'); dz.loadLevel('archiv1'); dz.L.enemies.length = 0;
  const shaft = 244, ground = 19;
  assert.equal(dz.L.grid[ground][shaft], ' ', 'Schacht bei Spalte 244');
  dz.P.x = (shaft - 4) * 16; dz.P.y = ground * 16 - 14; dz.P.face = 1; run(240);
  const c = dz.cam;
  assert.ok(c.camY + c.viewH < 27 * 16, `Kamera rahmt nicht bis zum Höhlenboden (Unterkante ${((c.camY + c.viewH) / 16).toFixed(1)})`);
  assert.ok(ground * 16 - c.camY >= 16 * 5.4,   // vorher nur 3 Kacheln
    `oben genug Sicht (${((ground * 16 - c.camY) / 16).toFixed(1)} Kacheln)`);
  // hineinlaufen: Kamera folgt nach unten
  listeners.keydown({ key: 'ArrowRight', preventDefault() {} }); run(30); listeners.keyup({ key: 'ArrowRight' }); run(150);
  assert.ok(dz.P.y > 22 * 16, 'Sam ist in die Höhle gefallen');
  assert.ok(dz.P.y + 14 <= dz.cam.camY + dz.cam.viewH && dz.P.y >= dz.cam.camY, 'Kamera folgt in die Höhle');
});

test('Grafikstil Pixel 3D: zeichnet jede Welt ohne Fehler, Gelände und Figuren sind nicht leer, G wechselt den Stil', () => {
  const { dz, listeners, warnings, run } = boot(script.replace("let SKIN='klassik';", "let SKIN='pixel3d';"));
  assert.equal(dz.skin, 'pixel3d');
  dz.setState('play');
  Object.assign(dz.save.ab, { double: true, wall: true, dash: true, glide: true });
  for (const id of ['uebung', 'hub', 1, 3, 'b0']) {
    dz.loadLevel(id);
    listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
    for (let k = 0; k < 6; k++) { run(8); listeners.keydown({ key: ' ', preventDefault() {} }); run(3); listeners.keyup({ key: ' ' }); }
    listeners.keyup({ key: 'ArrowRight' });
    assert.ok(Number.isFinite(dz.P.x), `Welt ${id}`);
  }
  assert.deepEqual(warnings, []);
  dz.loadLevel('uebung');
  const opaque = img => { let n = 0; for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) n++; return n; };
  const g = dz.p3d.groundTile(3, dz.L.grid.findIndex(row => row[3] === '#'));
  assert.ok(opaque(g) > g.w * g.h * 0.5, 'Bodenkachel ist gefüllt');
  const h = dz.p3d.hero();
  assert.ok(opaque(h) > 200, 'Sam ist sichtbar');
  assert.equal(boot().dz.skin, 'klassik', 'Grafik ist fest klassisch');
});

test('Deko aus dem Editor: von Hand gesetzt, exportiert, automatische Deko abschaltbar', () => {
  const { dz } = boot(); const E = dz.editor, D = JSON.parse(JSON.stringify(E.levelData(1)));
  const st = D.objs.find(o => o.k === 'start');
  D.objs.push({ k: 'deco', n: 'apple', c: st.c + 3, r: st.r }, { k: 'deco', n: 'vine', c: st.c + 5, r: 2, len: 14 }, { k: 'deco', n: 'fly', c: st.c + 6, r: st.r - 1 });
  let L = E.load(D, []);
  const man = L.decor.filter(d => d.man);
  assert.equal(man.length, 2, 'Apfelbaum und Ranke');
  assert.ok(man.some(d => d.k === 'dkp' && d.n === 'apple' && d.y === (st.r + 1) * E.TS), 'Apfelbaum steht auf dem Boden');
  assert.ok(man.some(d => d.k === 'dkh' && d.len === 14), 'Ranke mit eigener Länge');
  assert.ok(L.critters.some(k => k.man), 'Schmetterling');
  const auto = L.decor.filter(d => d.cl && !d.man).length; assert.ok(auto > 20, 'automatische Deko vorhanden');
  // Abschalten
  L = E.load({ ...D, noDeco: true }, []);
  assert.equal(L.decor.filter(d => d.cl && !d.man).length, 0, 'keine automatische Deko');
  assert.equal(L.decor.filter(d => d.man).length, 2, 'von Hand gesetzte bleibt');
  // Bilder für die Editor-Palette
  for (const [n] of E.deco.list) assert.ok(E.deco.icon(n).w > 0, n);
  assert.equal(new Set(E.deco.list.map(d => d[0])).size, E.deco.list.length, 'Namen eindeutig');
});

test('Leben: bei 0 Punkten ist ein Leben weg, nach dem dritten Game Over mit zurückgesetztem Spielstand', () => {
  const { dz, run } = boot();
  assert.equal(dz.save.lives, 3, 'anfangs 3 Leben');
  dz.save.crystals['1-0'] = true; dz.save.ab.double = true; dz.save.tutorialDone = true;
  const toZero = () => { dz.setState('play'); dz.loadLevel(1); run(80); assert.equal(dz.editor.state, 'play');
    for (let i = 0; i < 12 && dz.score() > 0; i++) dz.die(); run(3); };
  toZero(); assert.equal(dz.editor.state, 'lost', 'Level unterbrochen'); assert.equal(dz.save.lives, 2);
  toZero(); assert.equal(dz.save.lives, 1);
  assert.ok(dz.save.crystals['1-0'], 'Fortschritt bleibt, solange noch Leben da sind');
  toZero(); assert.equal(dz.editor.state, 'lost');
  assert.equal(dz.save.lives, 3, 'nach Game Over wieder 3 Leben');
  assert.equal(Object.keys(dz.save.crystals).length, 0, 'Diamanten zurückgesetzt'); assert.equal(dz.save.ab.double, false, 'Fähigkeiten zurückgesetzt');
  assert.equal(dz.save.tutorialDone, true, 'Einführung bleibt gesehen');
  // In Welten ohne Punkteziel und im Probespiel aus dem Editor gibt es keinen Lebensverlust
  dz.setState('play'); dz.loadLevel('hub'); run(80); assert.equal(dz.editor.state, 'play');
  const E = dz.editor, D = JSON.parse(JSON.stringify(E.levelData(1))); const L = E.load(D, []); L.timeLimit = 240;
  run(80); for (let i = 0; i < 12; i++) dz.die(); run(3); assert.equal(E.state, 'play', 'Probespiel ohne Leben');
});

test('Endgegner: 300 Punkte, jeder Treffer kostet 100, bei 0 ist ein Leben weg', () => {
  const { dz, run } = boot();
  dz.setState('play'); dz.loadLevel('b0'); run(80);
  assert.equal(dz.save.lives, 3);
  dz.die(); run(3); dz.die(); run(3); assert.equal(dz.editor.state, 'play', 'nach zwei Treffern noch im Kampf (100 Punkte)');
  dz.die(); run(3); assert.equal(dz.editor.state, 'lost', 'dritter Treffer: 0 Punkte'); assert.equal(dz.save.lives, 2);
  dz.setState('play'); dz.loadLevel('b0'); run(80); dz.die(); run(3); assert.equal(dz.editor.state, 'play', 'neuer Versuch beginnt wieder mit 300');
});

test('Übungswiese: erste Welt, gedrosseltes Tempo bis zu den schnellen Schuhen im letzten Drittel', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  dz.setState('play'); dz.loadLevel('uebung'); dz.L.enemies.length = 0; run(10);
  const sh = dz.L.shoesItem; assert.ok(sh && !sh.got, 'Schuhe liegen bereit');
  assert.ok(sh.x / 16 > dz.L.w * 0.6 && sh.x / 16 < dz.L.w * 0.75, 'am Anfang des letzten Drittels');
  const P = dz.P, speed = () => { P.x = 6 * 16; P.y = 17 * 16 - P.h; P.vx = 0; P.vy = 0; key('ArrowRight', 1); run(60); const v = Math.abs(P.vx); key('ArrowRight', 0); run(30); return v; };
  const slow = speed(); assert.ok(slow < dz.PH.max * 0.7 && slow > dz.PH.max * 0.6, `ohne Schuhe langsamer (${Math.round(slow)})`);
  P.x = sh.x - P.w / 2; P.y = sh.y - P.h / 2; run(2); assert.ok(sh.got, 'aufgesammelt');
  const fast = speed(); assert.ok(fast >= dz.PH.max * 0.95, `mit Schuhen volles Tempo (${Math.round(fast)})`);
  // In anderen Welten ist das Tempo nie gedrosselt
  dz.loadLevel(1); dz.L.enemies.length = 0; assert.equal(dz.L.shoesItem, undefined);
  // erste Welt: 1-1 öffnet erst nach der Übungswiese
  dz.save.tutorialDone = false; delete dz.save.done.uebung; dz.loadLevel('hub'); run(3);
  dz.map.go(1); dz.map.enter(); run(2); assert.equal(dz.L.id, 'hub', '1-1 noch zu');
  dz.save.done.uebung = true; dz.map.enter(); run(2); assert.equal(dz.L.id, 1, 'nach der Übungswiese offen');
});

test('Bonuswelten: Diamanten-Schranke auf der Karte, Extraleben beim ersten Schaffen, Hinweise nach Fähigkeit', () => {
  const { dz, run } = boot();
  const s = dz.save; s.tutorialDone = true; s.done.uebung = true;
  dz.setState('play'); dz.loadLevel('hub'); run(3);
  for (const w of ['bonus1', 'bonus2', 'bonus3']) assert.ok(dz.map.nodes.some(n => n.key === w), `${w} auf der Karte`);
  dz.map.go('bonus1'); dz.map.enter(); run(2); assert.equal(dz.L.id, 'hub', 'ohne Diamanten zu');
  for (let i = 0; i < 6; i++) s.crystals['t' + i] = true;
  dz.map.enter(); run(2); assert.equal(dz.L.id, 'bonus1', 'mit 6 Diamanten offen');
  assert.equal(dz.L.need || 0, 0, 'kein Punkteziel'); assert.ok(dz.L.goal, 'hat ein Ziel');
  const before = s.lives; dz.map.finish(); assert.equal(s.lives, before + 1, 'Extraleben');
  dz.setState('play'); dz.loadLevel('bonus1'); dz.map.finish(); assert.equal(s.lives, before + 1, 'nur beim ersten Mal');
  // Hinweise: zählen fehlende Sammelstücke und sortieren sie nach Fähigkeit
  const h = dz.map.hints(1); assert.ok(h.missing > 0 && h.now + Object.values(h.later).reduce((a, b) => a + b, 0) <= h.missing);
});

test('Medaillen: Bronze fürs Schaffen, Silber für alles Gesammelte, Gold für die Zielzeit', () => {
  const { dz } = boot();
  const s = dz.save, gold = dz.map.gold(1);
  assert.ok(gold >= 30 && gold <= 200, `Goldzeit 1-1 sinnvoll (${gold} s)`);
  let m = dz.map.medals(1); assert.ok(!m.b && !m.s && !m.g, 'anfangs keine');
  s.done[1] = true; s.best[1] = { time: gold + 20 }; m = dz.map.medals(1); assert.ok(m.b && !m.g, 'Bronze, noch kein Gold');
  s.best[1].time = gold - 1; assert.ok(dz.map.medals(1).g, 'Gold unter der Zielzeit');
  dz.setState('play'); dz.loadLevel(1); for (const k of dz.L.crystals) s.crystals[k.id] = true; for (const k of dz.L.stars) s.stars[k.id] = true;
  assert.ok(dz.map.medals(1).s, 'Silber mit allen Diamanten und Sternen');
  const D = JSON.parse(JSON.stringify(dz.editor.levelData(1))); D.gold = 42; dz.editor.load(D, []);
  assert.equal(dz.editor.levelData(1).gold, undefined, 'Original ohne eigene Goldzeit');
});
