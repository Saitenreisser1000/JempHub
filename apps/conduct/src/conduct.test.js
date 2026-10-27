import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createBeatTracker, createTempo, dynamicsFrom, dynamicLabel, figureOk, isDownbeat, FIGURES } from './conduct.js'
import { PIECES, notesInBeat, ode } from './score.js'

let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// Simulierte Hand: fährt zwischen den Schlagpunkten der Figur in Bögen (60 Bilder/s)
export function simulate(meter, bpm, bars, { size = 0.3, fps = 60, jitter = 0 } = {}) {
  const pts = FIGURES[meter].points.map(([x, y]) => [0.5 + (x - 0.5) * size / 0.4, 0.5 + (y - 0.6) * size / 0.4])
  const beat = 60 / bpm
  const out = []
  const total = bars * meter + 1 // Auftakt + Takte
  for (let i = 0; i < total * beat * fps; i++) {
    const t = i / fps
    const k = Math.floor(t / beat), f = (t / beat) % 1
    const a = pts[(k + meter - 1) % meter], b = pts[k % meter]
    // von a nach b mit Bogen nach oben (Rückprall), Tiefpunkt bei f = 0 bzw. 1
    const x = a[0] + (b[0] - a[0]) * f
    const y = a[1] + (b[1] - a[1]) * f - Math.sin(Math.PI * f) * size * 0.5
    out.push([x + (rnd() - 0.5) * jitter, y + (rnd() - 0.5) * jitter, t])
  }
  return out
}

function run(meter, bpm, bars, opts, unit) {
  seed = 7
  const tr = createBeatTracker(), tempo = createTempo()
  const beats = []
  for (const [x, y, t] of simulate(meter, bpm, bars, opts)) {
    const b = tr.push(x, y, t, unit)
    if (b) { beats.push(b); tempo.beat(b.t); tr.setInterval(tempo.interval) }
  }
  return { beats, tempo }
}

describe('beat detection', () => {
  for (const meter of [2, 3, 4]) {
    it(`finds every beat in ${meter}/4 and the tempo`, () => {
      const { beats, tempo } = run(meter, 90, 4, { jitter: 0.004 })
      assert.ok(Math.abs(beats.length - (4 * meter + 1)) <= 1, `beats ${beats.length}`)
      assert.ok(Math.abs(tempo.bpm - 90) < 4, `bpm ${tempo.bpm}`)
    })
  }
  it('finds small gestures far from the camera (30 fps, noise)', () => {
    for (const meter of [2, 3, 4]) for (const bpm of [60, 100, 140]) {
      const { beats } = run(meter, bpm, 4, { size: 0.12, fps: 30, jitter: 0.012 }, 0.05)
      assert.ok(Math.abs(beats.length - 4 * meter) <= 1, `${meter}/4 ${bpm}: ${beats.length}`)
    }
  })
  it('does not invent beats from a shaky resting hand', () => {
    const tr = createBeatTracker()
    let n = 0
    for (let i = 0; i < 300; i++) if (tr.push(0.5 + (rnd() - 0.5) * 0.01, 0.5 + (rnd() - 0.5) * 0.01, i / 30)) n++
    assert.equal(n, 0)
  })
  it('recognises a big downbeat after a missed beat', () => {
    assert.equal(isDownbeat(0.5, [0.2, 0.18, 0.25, 0.22]), true)
    assert.equal(isDownbeat(0.26, [0.2, 0.18, 0.25, 0.22]), false)
    assert.equal(isDownbeat(0.5, [0.2]), false)
  })
  it('follows an accelerando', () => {
    const tempo = createTempo()
    let t = 0, d = 0.8
    for (let i = 0; i < 16; i++) { tempo.beat(t); t += d; d *= 0.95 }
    assert.ok(tempo.interval < 0.5 && tempo.interval > 0.36, String(tempo.interval))
  })
  it('ignores a single outlier', () => {
    const tempo = createTempo()
    ;[0, 0.6, 1.2, 1.8, 1.95, 2.4, 3.0].forEach((t) => tempo.beat(t))
    assert.ok(Math.abs(tempo.interval - 0.6) < 0.08, String(tempo.interval))
  })
  it('checks the figure', () => {
    for (const meter of [2, 3, 4]) {
      const { beats } = run(meter, 80, 3)
      // Schlagnummer aus der Zeit (Simulation: Schlag k erreicht seinen Punkt bei t = (k + 1) · 0,75 s)
      const start = beats.findIndex((x) => (Math.round(x.t / 0.75) - 1 + meter) % meter === 0)
      const bar = beats.slice(start, start + meter)
      assert.equal(bar.length, meter)
      bar.forEach((b, k) => assert.ok(figureOk(meter, k, bar[0], b), `${meter}/4 beat ${k + 1}`))
    }
    assert.equal(figureOk(4, 1, { x: 0.5, y: 0.8 }, { x: 0.7, y: 0.78 }), false)
    // linke Hand: gespiegelt
    assert.equal(figureOk(4, 1, { x: 0.5, y: 0.8 }, { x: 0.7, y: 0.78 }, 0.2, true), true)
    assert.equal(figureOk(3, 1, { x: 0.5, y: 0.8 }, { x: 0.3, y: 0.78 }, 0.2, true), true)
  })
  it('maps size to dynamics', () => {
    assert.equal(dynamicLabel(dynamicsFrom(0.05)), 'pp')
    assert.equal(dynamicLabel(dynamicsFrom(0.5)), 'ff')
    assert.ok(dynamicsFrom(0.2) < dynamicsFrom(0.3))
  })
})

describe('score', () => {
  it('has complete pieces in 2/4, 3/4, 4/4 and 6/8', () => {
    for (const [id, meter, bars] of [['haenschen', 2, 16], ['walzer', 3, 16], ['ode', 4, 16], ['barcarole', 2, 8]]) {
      const p = PIECES[id]()
      assert.equal(p.meter, meter)
      assert.equal(p.beats, meter * bars)
      const mel = p.notes.filter((n) => n.mel)
      assert.ok(Math.abs(Math.max(...mel.map((n) => n.at + n.len)) - p.beats) < 1e-9, id)
      for (let b = 0; b < p.beats; b++) assert.ok(notesInBeat(p, b).length > 0, `${id} beat ${b}`)
      assert.ok(p.notes.every((n) => n.midi >= 41 && n.midi <= 74), id)
    }
  })
  it('has a complete Ode with 16 bars', () => {
    const p = ode()
    const melody = p.notes.filter((n) => n.vel === 1)
    const end = Math.max(...melody.map((n) => n.at + n.len))
    assert.equal(end, 64)
    for (let b = 0; b < 64; b++) assert.ok(notesInBeat(p, b).length > 0, `beat ${b}`)
    assert.ok(p.notes.every((n) => n.midi >= 41 && n.midi <= 74))
  })
  it('accents the downbeat in the exercises', () => {
    for (const m of [2, 3, 4]) {
      const p = PIECES['ex' + m]()
      assert.equal(p.meter, m)
      assert.ok(notesInBeat(p, 0).length > notesInBeat(p, 1).length)
    }
  })
})
