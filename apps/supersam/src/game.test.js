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
    style: {}, hidden: false, textContent: '', innerHTML: '', getContext: () => stub(), width: 16, height: 16,
  });
  const ctx = {
    document: { getElementById: element, createElement: element, documentElement: {}, addEventListener() {} },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    innerWidth: 844, innerHeight: 390, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: () => null, setItem() {} },
    performance: { now: () => time },
    requestAnimationFrame: fn => { frame = fn; },
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
  dz.setState('play'); dz.loadLevel('hub'); dz.P.x = 20 * 16; dz.P.y = 23 * 16 - 14; run(90);
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < 300; i++) { if (i % 40 === 0) key(' ', 1); if (i % 40 === 4) key(' ', 0); run(1); mn = Math.min(mn, dz.cam.cy); mx = Math.max(mx, dz.cam.cy); }
  assert.ok(mx - mn < 1, `Kamera bewegte sich bei kurzen Hüpfern um ${(mx - mn).toFixed(1)} px`);
  dz.setState('play'); dz.loadLevel(2); dz.L.enemies.length = 0; dz.P.x = 146 * 16; dz.P.y = 19 * 16 - 14; run(90);
  const ys = []; key('ArrowRight', 1); for (let i = 0; i < 120; i++) { run(1); ys.push(dz.cam.cy); } key('ArrowRight', 0);
  let jerk = 0; for (let i = 2; i < ys.length; i++) jerk = Math.max(jerk, Math.abs((ys[i] - ys[i - 1]) - (ys[i - 1] - ys[i - 2])));
  assert.ok(jerk < 1, `Ruck auf der Rampe ${jerk.toFixed(2)}`);
});
