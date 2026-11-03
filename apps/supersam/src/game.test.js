// Rauchtest: lädt das Spielskript aus index.html mit Browser-Attrappen und spielt jede Welt kurz an.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const html = readFileSync(resolve(import.meta.dirname, '..', 'index.html'), 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

function stub() {
  const f = function () { return stub(); };
  return new Proxy(f, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : p === 'width' || p === 'height' ? 64 : stub()),
    set: () => true,
    apply: () => stub(),
  });
}

function boot() {
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
  vm.runInNewContext(script, ctx);
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
  for (const [lv, col, key, frames, minCols] of [[1, 3, 'ArrowRight', 260, 14], [1, 62, 'ArrowRight', 140, 7], [1, 147, 'ArrowLeft', 140, 6], [4, 31, 'ArrowRight', 160, 8]]) {
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
  dz.setState('play'); dz.loadLevel(1); dz.L.enemies.length = 0;
  dz.P.x = 31 * 16; dz.P.y = 19 * 16 - 14; run(60);
  const before = dz.cam.camY; let maxY = before;
  listeners.keydown({ key: 'ArrowRight', preventDefault() {} }); run(4);
  listeners.keydown({ key: ' ', preventDefault() {} });
  for (let i = 0; i < 120; i++) { run(1); maxY = Math.max(maxY, dz.cam.camY); if (i === 20) listeners.keyup({ key: 'ArrowRight' }); }
  assert.ok(dz.P.y < 15 * 16, 'Sam steht auf der Plattform');
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
      for (let i = 0; i < 120; i++) { run(1); moved = Math.max(moved, Math.abs(e.x - x0) + Math.abs(e.y - y0)); }
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
  setup(1, 174, 18); key('ArrowRight', 1); for (let i = 0; i < 200 && !dz.L.stars[0].got; i++) run(1); key('ArrowRight', 0);
  assert.ok(dz.L.reveal.size > 0 && dz.L.stars[0].got, 'Wald: Geheimgang unter dem Boden');
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

test('Endgegner: Tore brauchen Diamanten, Bosse brauchen Fähigkeiten', () => {
  const { dz, listeners, run } = boot();
  const key = (k, d) => d ? listeners.keydown({ key: k, preventDefault() {} }) : listeners.keyup({ key: k });
  dz.setState('play'); dz.loadLevel('hub');
  assert.equal(dz.L.coins.length, 0, 'keine Münzen in der Hubwelt');
  const gates = dz.L.doors.filter(d => d.need).map(d => [d.world, d.need]);
  assert.equal(JSON.stringify(gates), JSON.stringify([['b1', 7], ['b2', 10], ['b3', 12]]));
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
  dz.save.bosses.b1 = true; dz.save.bosses.b2 = true;
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

test('Bewegungstutorial beim ersten Start', () => {
  const { dz, listeners, run } = boot();
  const kd = key => listeners.keydown({ key, preventDefault() {} }), ku = key => listeners.keyup({ key });
  assert.equal(dz.save.tutorialDone, false, 'neuer Spielstand ohne Tutorial');
  dz.setState('play'); dz.loadLevel('hub'); dz.startTutorial(); run(20);
  const until = (n, max = 200) => { for (let i = 0; i < max && dz.TUT.i < n; i++) run(1); return dz.TUT.i >= n; };
  kd('ArrowRight'); assert.ok(until(1), 'Schritt 1: nach rechts laufen'); ku('ArrowRight');
  kd('ArrowLeft'); assert.ok(until(2), 'Schritt 2: zurück laufen'); ku('ArrowLeft'); run(10);
  kd('ArrowRight'); run(10); kd('ArrowLeft'); run(2); ku('ArrowLeft');
  assert.ok(until(3), 'Schritt 3: kurzer Sprung'); ku('ArrowRight'); run(30);
  kd('ArrowRight'); run(8); kd('ArrowLeft'); run(16); ku('ArrowLeft');
  assert.ok(until(4), 'Schritt 4: hoher Sprung'); ku('ArrowRight'); run(60);
  kd('ArrowLeft'); kd('ArrowRight'); run(14); ku('ArrowLeft');
  assert.ok(until(5), 'Schritt 5: senkrecht hoch'); ku('ArrowRight');
  run(320);
  assert.equal(dz.TUT.on, false, 'Tutorial beendet');
  assert.equal(dz.save.tutorialDone, true, 'nur beim ersten Start');
});
