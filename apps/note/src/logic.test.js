import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { noteName, midiOf, letterOf, fretPositions, valueLabel, beatsText, weightedPick, METERS, durOf, VALUE_OF_DUR } from './music.js'
import {
  NOTE_DEFAULTS, VALUE_DEFAULTS, MEASURE_DEFAULTS, noteCandidates, genNote, checkNote, noteKey,
  valueCandidates, genValue, checkValue, genMeasure, checkMeasure,
} from './quiz.js'
import { createStore } from './stats.js'
import { staffSVG } from './staff.js'

function memoryStorage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }
}

describe('music', () => {
  it('spells German note names', () => {
    assert.deepEqual([noteName(0, 1), noteName(1, -1), noteName(2, -1), noteName(5, -1), noteName(6, -1), noteName(6, 0)], ['Cis', 'Des', 'Es', 'As', 'B', 'H'])
  })
  it('maps staff positions to pitches', () => {
    assert.equal(midiOf('treble', 0), 64) // E4 auf der untersten Linie
    assert.equal(midiOf('treble', -2), 60) // C4 mit Hilfslinie
    assert.equal(midiOf('bass', 0), 43) // G2
    assert.equal(midiOf('bass', 10), 60) // C4 über dem Bassschlüssel
    assert.equal(midiOf('treble', 3, 1), 70) // Ais4
    assert.equal(letterOf('treble', 4), 6) // H auf der mittleren Linie
  })
  it('finds guitar and bass positions for written notes', () => {
    // geschriebenes E4 klingt E3: offene D-Saite +2, A-Saite +7, E-Saite +12
    assert.deepEqual(fretPositions(64, 'guitar').map((p) => `${p.s}:${p.f}`), ['3:2', '4:7', '5:12'])
    // geschriebenes G2 im Bassschlüssel klingt G1: tiefste Bass-Saite Bund 3
    assert.deepEqual(fretPositions(43, 'bass'), [{ s: 3, f: 3 }])
  })
  it('labels values', () => {
    assert.equal(valueLabel(4, 1, 'note'), 'Punktierte Viertelnote')
    assert.equal(valueLabel(16, 0, 'rest'), 'Ganze Pause')
    assert.equal(beatsText(8, 1), '3 Schläge')
  })
  it('weightedPick never picks zero-weight items', () => {
    for (let i = 0; i < 200; i++) assert.notEqual(weightedPick([1, 2, 3], (x) => (x === 2 ? 0 : 1)), 2)
  })
})

describe('note quiz', () => {
  it('offers accidentals only where they exist', () => {
    const c = noteCandidates({ ...NOTE_DEFAULTS, accidentals: true })
    assert.ok(c.some((x) => x.acc === 1))
    assert.ok(!c.some((x) => x.letter === 2 && x.acc === 1)) // kein Eis
    assert.ok(!c.some((x) => x.letter === 0 && x.acc === -1)) // kein Ces
  })
  it('never repeats the same position twice in a row and checks answers', () => {
    let prev = null
    for (let i = 0; i < 300; i++) {
      const q = genNote({ ...NOTE_DEFAULTS, clef: 'both', range: 2, accidentals: true }, prev)
      if (prev) assert.ok(!(q.clef === prev.clef && q.pos === prev.pos))
      assert.ok(checkNote(q, { letter: q.letter, acc: q.acc }))
      assert.ok(!checkNote(q, { letter: (q.letter + 1) % 7, acc: q.acc }))
      prev = q
    }
  })
  it('focuses on weak notes', () => {
    const settings = { ...NOTE_DEFAULTS, range: 0 }
    const weak = 'n:treble:4:0'
    let hits = 0
    for (let i = 0; i < 1000; i++) if (noteKey(genNote(settings, null, (k) => (k === weak ? 20 : 1))) === weak) hits++
    assert.ok(hits > 400, 'weak note should dominate, got ' + hits)
  })
})

describe('value quiz', () => {
  it('builds candidates from settings', () => {
    assert.equal(valueCandidates({ ...VALUE_DEFAULTS, kind: 'note', level: 0 }).length, 3)
    assert.ok(valueCandidates({ ...VALUE_DEFAULTS, dotted: true }).some((c) => c.dots))
  })
  it('checks base and dot', () => {
    const q = genValue({ ...VALUE_DEFAULTS, dotted: true }, null)
    assert.ok(checkValue(q, { base: q.base, dots: q.dots }))
    assert.ok(!checkValue(q, { base: q.base, dots: q.dots ? 0 : 1 }))
  })
})

describe('measure quiz', () => {
  it('always produces complete bars in every meter and level', () => {
    for (const meter of Object.keys(METERS))
      for (const level of [0, 1, 2])
        for (const missing of ['note', 'rest', 'both'])
          for (let i = 0; i < 20; i++) {
            const q = genMeasure({ ...MEASURE_DEFAULTS, meter, level, missing }, null)
            const sum = q.elements.reduce((a, e) => a + durOf(e.base, e.dots), 0) + q.missing
            assert.equal(sum, METERS[meter], `${meter} level ${level}`)
            assert.ok(q.options.includes(q.missing))
            assert.equal(new Set(q.options).size, q.options.length)
            assert.ok(VALUE_OF_DUR[q.missing])
            assert.ok(checkMeasure(q, { dur: q.missing }))
          }
  })
})

describe('store', () => {
  it('records answers, weights weak items and keeps the old stats format', () => {
    const st = memoryStorage()
    st.setItem('notejemp:stats', JSON.stringify({ notes: { answered: 10, correct: 8, rounds: 1, best: 8 } }))
    const s = createStore(st)
    assert.equal(s.totals.notes.correct, 8)
    s.recordAnswer('notes', 'n:treble:0:0', false)
    s.recordAnswer('notes', 'n:treble:2:0', true)
    assert.equal(s.totals.notes.answered, 12)
    assert.ok(s.weight('n:treble:0:0') > s.weight('n:treble:2:0'))
    assert.equal(s.weight('never-seen'), 2)
    s.recordRound('notes', 18, 20)
    assert.equal(s.totals.notes.best, 9)
    const again = createStore(st)
    assert.equal(again.accuracy('n:treble:2:0'), 1)
    again.reset()
    assert.deepEqual(again.totals, {})
  })
  it('survives missing or broken storage', () => {
    const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
    const s = createStore(broken)
    s.recordAnswer('values', 'x', true)
    assert.equal(s.totals.values.answered, 1)
  })
})

describe('staff', () => {
  it('renders clef, notes, ledger lines and gaps', () => {
    const svg = staffSVG({ clef: 'treble', items: [{ type: 'note', pos: -2, base: 4, acc: 1 }] })
    assert.ok(svg.startsWith('<svg'))
    assert.ok(svg.includes('&#xe050;')) // Violinschlüssel
    assert.ok(svg.includes('&#xe262;')) // Kreuz
    assert.equal((svg.match(/stroke-width="1.3"/g) || []).length, 1) // eine Hilfslinie
    const gap = staffSVG({ timeSig: [3, 4], items: [{ type: 'gap', dur: 4 }], bar: true })
    assert.ok(gap.includes('class="gap"') && gap.includes('&#xe083;'))
  })
})

describe('octave names', () => {
  it('uses German octave designations', async () => {
    const { germanName } = await import('./music.js')
    assert.deepEqual(
      [germanName(0, 0, 4), germanName(0, 0, 5), germanName(0, 0, 3), germanName(0, 0, 2), germanName(0, 0, 1), germanName(6, 0, 1), germanName(0, 1, 5), germanName(6, -1, 4), germanName(2, -1, 2), germanName(5, -1, 6)],
      ['c1', 'c2', 'c', 'C', 'C1', 'H1', 'cis2', 'b1', 'Es', 'as3'],
    )
  })
  it('asks octaves that fit the clef and checks them', async () => {
    const { noteOctaves } = await import('./quiz.js')
    assert.deepEqual(noteOctaves({ ...NOTE_DEFAULTS, range: 0 }, 'treble'), [4, 5])
    assert.deepEqual(noteOctaves({ ...NOTE_DEFAULTS, range: 2 }, 'bass'), [1, 2, 3, 4])
    const q = genNote({ ...NOTE_DEFAULTS, octaves: true }, null)
    assert.ok(checkNote(q, { letter: q.letter, acc: q.acc, oct: q.octave }))
    assert.ok(!checkNote(q, { letter: q.letter, acc: q.acc, oct: q.octave + 1 }))
    assert.ok(checkNote(q, { letter: q.letter, acc: q.acc }))
    // e auf der untersten Linie im Violinschlüssel ist e1
    assert.equal(genNote({ ...NOTE_DEFAULTS, range: 0 }, null, (k) => (k === 'n:treble:0:0' ? 1e9 : 0)).fullName, 'e1')
  })
})
