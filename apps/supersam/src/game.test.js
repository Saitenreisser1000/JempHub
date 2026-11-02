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
