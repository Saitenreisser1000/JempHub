import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { n, mo, onsets, barTicks, durFromSpec, decodeDur, posLabel, momentAt, nextSounding, prevSounding, setKey, isValidExercise, moveMoment, dropIndex, snapDur, canMoveDot, moveDot } from './model.js'
import { harmony, noteName, useFlats } from './music.js'
import { examples } from './exercises.js'
import { STD, DROPD } from './constants.js'

describe('time', () => {
  it('computes onsets and total length', () => {
    const on = onsets([mo(12, [n(0, 0)]), mo(24, []), mo(6, [n(1, 1)])])
    assert.deepEqual([...on], [0, 12, 36])
    assert.equal(on.total, 42)
  })
  it('handles dotted and triplet durations as whole ticks', () => {
    assert.equal(durFromSpec({ base: 6, dot: true, trip: false }), 9)
    assert.equal(durFromSpec({ base: 12, dot: false, trip: true }), 8)
    assert.deepEqual(decodeDur(36), { base: 24, dot: true, trip: false })
    assert.deepEqual(decodeDur(8), { base: 12, dot: false, trip: true })
  })
  it('labels bar and beat positions', () => {
    assert.equal(barTicks([4, 4]), 96)
    assert.equal(barTicks([6, 8]), 72)
    assert.equal(posLabel(0, [4, 4]), '1 · 1')
    assert.equal(posLabel(96 + 24 + 12, [4, 4]), '2 · 2&')
    assert.equal(posLabel(8, [4, 4]), '1 · 1trip')
  })
  it('finds the moment sounding at a tick', () => {
    const ms = [mo(12, [n(0, 0)]), mo(12, [])]
    const on = onsets(ms)
    assert.equal(momentAt(ms, on, 5), 0)
    assert.equal(momentAt(ms, on, 12), 1)
    assert.equal(momentAt(ms, on, 30), -1)
  })
})

describe('sequence', () => {
  const ms = [mo(12, [n(0, 0)]), mo(12, []), mo(12, [n(1, 1)])]
  const order = [0, 1, 2]
  it('skips rests when looking ahead and back', () => {
    assert.equal(nextSounding(ms, 0, order, false), 2)
    assert.equal(nextSounding(ms, 2, order, false), -1)
    assert.equal(nextSounding(ms, 2, order, true), 0)
    assert.equal(prevSounding(ms, 2, order, false), 0)
  })
  it('keeps repeated physical dots as separate occurrences', () => {
    const a = mo(12, [n(5, 0)])
    const b = mo(12, [n(5, 0)])
    assert.notEqual(a, b)
    assert.equal(setKey(a), setKey(b))
  })
})

describe('music', () => {
  it('names notes with the right spelling for the key', () => {
    assert.equal(noteName(n(4, 3), STD, false, true), 'C3')
    assert.equal(useFlats({ r: 5, m: 'major' }), true)
    assert.equal(noteName(n(5, 1), STD, true, false), 'F')
  })
  it('recognises chords, power chords and intervals', () => {
    assert.equal(harmony([n(4, 0), n(3, 2), n(2, 2), n(1, 1), n(0, 0)], STD, false).name, 'Am')
    assert.equal(harmony([n(5, 0), n(4, 0), n(3, 0)], DROPD, false).name, 'D5')
    assert.equal(harmony([n(2, 0), n(1, 1), n(0, 0)], STD, false).name, 'C/G')
    assert.deepEqual(harmony([n(2, 5), n(1, 5)], STD, false), { name: 'C + E', kind: 'major 3rd' })
  })
})

describe('sample exercises', () => {
  it('are valid and fill whole bars', () => {
    const exs = examples()
    assert.equal(exs.length, 8)
    for (const ex of exs) {
      assert.equal(isValidExercise(ex), true)
      assert.equal(onsets(ex.moments).total % barTicks(ex.ts), 0)
      for (const m of ex.moments) {
        const strings = m.dots.map((d) => d.s)
        assert.equal(new Set(strings).size, strings.length)
        for (const d of m.dots) assert.ok(d.s < ex.tuning.length)
      }
    }
  })
})

describe('strip editing', () => {
  const mk = () => [{ dur: 24, id: 'a' }, { dur: 12, id: 'b' }, { dur: 12, id: 'c' }, { dur: 48, id: 'd' }]
  it('moves a moment', () => {
    const ms = mk()
    assert.equal(moveMoment(ms, 0, 2), 2)
    assert.deepEqual(ms.map((m) => m.id), ['b', 'c', 'a', 'd'])
    moveMoment(ms, 3, 0)
    assert.deepEqual(ms.map((m) => m.id), ['d', 'b', 'c', 'a'])
    assert.equal(moveMoment(ms, 1, 99), 3)
  })
  it('finds the drop position', () => {
    const ms = mk(), on = [0, 24, 36, 48]
    assert.equal(dropIndex(ms, on, 5), 0)
    assert.equal(dropIndex(ms, on, 20), 1)
    assert.equal(dropIndex(ms, on, 31), 2)
    assert.equal(dropIndex(ms, on, 100), 4)
  })
  it('snaps lengths to sixteenths', () => {
    assert.equal(snapDur(2), 6)
    assert.equal(snapDur(25), 24)
    assert.equal(snapDur(29), 30)
    assert.equal(snapDur(500), 192)
  })
})

describe('moveDot', () => {
  const pat = () => [mo(12, [n(4, 3, 3)]), mo(12, [n(1, 1)]), mo(12, [n(4, 3, 3, 'h'), n(0, 0)])]
  it('moves the dot in every listed moment, keeping finger and technique', () => {
    const ms = pat()
    assert.equal(moveDot(ms, [0, 2], { s: 4, f: 3 }, { s: 3, f: 2 }), true)
    assert.deepEqual(ms[0].dots[0], { s: 3, f: 2, fg: 3, t: null })
    assert.deepEqual(ms[2].dots[0], { s: 3, f: 2, fg: 3, t: 'h' })
    assert.deepEqual(ms[1].dots[0], { s: 1, f: 1, fg: null, t: null })
  })
  it('allows a fret change on the same string', () => {
    const ms = pat()
    assert.equal(moveDot(ms, [0], { s: 4, f: 3 }, { s: 4, f: 5 }), true)
    assert.equal(ms[0].dots[0].f, 5)
  })
  it('refuses a string that is already taken in one of the moments', () => {
    const ms = pat()
    assert.equal(canMoveDot(ms, [0, 2], { s: 4, f: 3 }, { s: 0, f: 3 }), false)
    assert.equal(moveDot(ms, [0, 2], { s: 4, f: 3 }, { s: 0, f: 3 }), false)
    assert.equal(ms[0].dots[0].s, 4)
  })
  it('refuses a move onto the same spot', () => {
    assert.equal(canMoveDot(pat(), [0], { s: 4, f: 3 }, { s: 4, f: 3 }), false)
  })
})
