import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { INTERVALS, INTERVAL, CHORDS, CHORD, transpose, chordNotes, midiOf, noteLabel, rootPool, clefFor, staffPos, guitarPositions, invertNotes } from './theory.js'
import { INTERVAL_DEFAULTS, CHORD_DEFAULTS, genInterval, genChord, intervalChoices, check, intervalKey } from './quiz.js'
import { createStore } from './stats.js'

const C4 = { l: 0, a: 0, o: 4 }
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) } }

describe('spelling', () => {
  it('spells intervals with the right letters', () => {
    const up = (id) => noteLabel(transpose(C4, INTERVAL[id].semis, INTERVAL[id].steps), 'de')
    assert.deepEqual(['m2', 'm3', 'TT', 'm6', 'm7', 'P8', 'M9'].map(up), ['Des', 'Es', 'Fis', 'As', 'B', 'C', 'D'])
    assert.equal(noteLabel(transpose({ l: 4, a: 0, o: 4 }, 3, 2, -1), 'en'), 'E') // kleine Terz unter G
    assert.equal(noteLabel(transpose({ l: 6, a: -1, o: 3 }, 4, 2), 'de'), 'D') // große Terz über B
  })
  it('keeps the pitch distance', () => {
    for (const iv of INTERVALS) {
      assert.equal(midiOf(transpose(C4, iv.semis, iv.steps)) - 60, iv.semis)
      assert.equal(60 - midiOf(transpose(C4, iv.semis, iv.steps, -1)), iv.semis)
    }
  })
  it('builds chords from stacked thirds', () => {
    const names = (id, root = C4) => chordNotes(root, CHORD[id]).map((n) => noteLabel(n, 'de')).join(' ')
    assert.equal(names('maj'), 'C E G')
    assert.equal(names('min'), 'C Es G')
    assert.equal(names('dim7'), 'C Es Ges Heses')
    assert.equal(names('dom7', { l: 4, a: 0, o: 3 }), 'G H D F')
    assert.equal(names('m7b5', { l: 6, a: 0, o: 3 }), 'H D F A')
    for (const c of CHORDS) assert.equal(new Set(c.tones.map((t) => t[0])).size, c.tones.length)
  })
  it('offers common roots only', () => {
    const roots = rootPool(48, 72, false).map((n) => noteLabel(n, 'en'))
    assert.ok(roots.includes('B♭') && roots.includes('F♯'))
    assert.ok(!roots.includes('E♯') && !roots.includes('C♭'))
    assert.ok(rootPool(48, 72, true).every((n) => n.a === 0))
  })
  it('places notes on the staff and on the guitar', () => {
    assert.equal(staffPos({ l: 2, a: 0, o: 4 }, 'treble'), 0)
    assert.equal(staffPos({ l: 4, a: 0, o: 2 }, 'bass'), 0)
    assert.equal(clefFor([C4, { l: 4, a: 0, o: 4 }]), 'treble')
    assert.equal(clefFor([{ l: 0, a: 0, o: 3 }, { l: 4, a: 0, o: 3 }]), 'bass')
    assert.deepEqual(guitarPositions(60).map((p) => `${p.s}:${p.f}`), ['1:1', '2:5', '3:10'])
  })
})

describe('quiz', () => {
  it('generates readable intervals in range in every direction', () => {
    const settings = { ...INTERVAL_DEFAULTS, selected: INTERVALS.map((i) => i.id), dirs: ['up', 'down', 'harmonic'], roots: 'all' }
    let prev = null
    for (let i = 0; i < 400; i++) {
      const q = genInterval(settings, prev)
      const iv = INTERVAL[q.id]
      const [a, b] = q.notes.map(midiOf)
      assert.equal(Math.abs(b - a), iv.semis)
      if (q.dir === 'down') assert.ok(b < a)
      else assert.ok(b > a)
      assert.ok(Math.min(a, b) >= 48 && Math.max(a, b) <= 76)
      assert.ok(q.notes.every((n) => Math.abs(n.a) <= 1))
      assert.ok(check(q, q.id))
      if (prev) assert.notEqual(q.id, prev.id)
      prev = q
    }
  })
  it('falls back to a usable selection', () => {
    assert.ok(intervalChoices({ selected: ['P5'] }).length >= 2)
  })
  it('generates chords with natural roots by default', () => {
    for (let i = 0; i < 200; i++) {
      const q = genChord({ ...CHORD_DEFAULTS, selected: CHORDS.map((c) => c.id) }, null)
      assert.equal(q.root.a, 0)
      assert.equal(q.notes.length, CHORD[q.id].tones.length)
      assert.ok(midiOf(q.notes[q.notes.length - 1]) <= 76)
    }
  })
  it('focuses on weak intervals', () => {
    let hits = 0
    for (let i = 0; i < 1000; i++) if (genInterval(INTERVAL_DEFAULTS, null, (k) => (k === intervalKey('M6') ? 30 : 1)).id === 'M6') hits++
    assert.ok(hits > 500, 'got ' + hits)
  })
})

describe('inversions and scales', () => {
  it('inverts chords and names the degrees', async () => {
    const { INVERSION, inversionDegrees } = await import('./theory.js')
    const names = (id) => { const it = INVERSION[id]; return invertNotes(chordNotes(C4, CHORD[it.chord]), it.inv).map((n) => noteLabel(n, 'de') + n.o).join(' ') }
    assert.equal(names('maj-1'), 'E4 G4 C5')
    assert.equal(names('min-2'), 'G4 C5 Es5')
    assert.equal(names('dom7-3'), 'B4 C5 E5 G5')
    assert.deepEqual(inversionDegrees(INVERSION['dom7-3']), ['♭7', '1', '3', '5'])
    assert.equal(INVERSION['maj-2'].de[1], '6/4')
  })
  it('generates inversions in range with the bass first', async () => {
    const { genInversion, INVERSION_DEFAULTS } = await import('./quiz.js')
    const { INVERSIONS } = await import('./theory.js')
    for (let i = 0; i < 300; i++) {
      const q = genInversion({ ...INVERSION_DEFAULTS, selected: INVERSIONS.map((x) => x.id), roots: 'all' }, null)
      const ms = q.notes.map(midiOf)
      assert.ok(ms.every((m, k) => k === 0 || m > ms[k - 1]))
      assert.ok(ms[0] >= 48 && ms[ms.length - 1] <= 79)
      assert.ok(q.notes.every((n) => Math.abs(n.a) <= 1))
    }
  })
  it('spells scales and their degrees', async () => {
    const { SCALE, SCALES, scaleNotes, degreeLabel } = await import('./theory.js')
    const de = (id, root = C4) => scaleNotes(root, SCALE[id]).map((n) => noteLabel(n, 'de')).join(' ')
    assert.equal(de('harm'), 'C D Es F G As H C')
    assert.equal(de('lyd', { l: 3, a: 0, o: 4 }), 'F G A H C D E F')
    assert.equal(de('pmin', { l: 5, a: 0, o: 3 }), 'A C D E G A')
    assert.equal(scaleNotes(C4, SCALE.loc).map((n) => degreeLabel(C4, n)).join(' '), '1 ♭2 ♭3 4 ♭5 ♭6 ♭7 1')
    for (const s of SCALES) assert.equal(s.steps.reduce((a, [h]) => a + h, 0), 12)
  })
  it('generates scales in every direction', async () => {
    const { genScale, SCALE_DEFAULTS } = await import('./quiz.js')
    const { SCALES } = await import('./theory.js')
    for (let i = 0; i < 300; i++) {
      const q = genScale({ ...SCALE_DEFAULTS, selected: SCALES.map((x) => x.id), dirs: ['up', 'down', 'updown'], roots: 'all' }, null)
      assert.ok(q.notes.every((n) => Math.abs(n.a) <= 1))
      assert.equal(midiOf(q.notes[q.notes.length - 1]) - midiOf(q.notes[0]), 12)
      assert.equal(q.seq.length, q.dir === 'updown' ? q.notes.length * 2 - 1 : q.notes.length)
      assert.ok(midiOf(q.notes[q.notes.length - 1]) <= 76)
    }
  })
})

describe('melody', () => {
  it('stays in the level range with limited leaps', async () => {
    const { genMelody, MELODY_LEVELS, melodyHits } = await import('./quiz.js')
    for (const level of [1, 2, 3, 4]) {
      const L = MELODY_LEVELS[level]
      for (let i = 0; i < 200; i++) {
        const q = genMelody({ level, notes: 8 })
        assert.equal(q.midis.length, 8)
        q.midis.forEach((m, k) => {
          assert.ok(m >= L.low && m <= L.high)
          if (!L.chromatic) assert.equal(q.notes[k].a, 0)
          if (k) assert.ok(Math.abs(m - q.midis[k - 1]) <= L.leap)
          if (k > 1) assert.ok(!(m === q.midis[k - 1] && m === q.midis[k - 2]))
          assert.equal(midiOf(q.notes[k]), m)
        })
      }
    }
    const q = { midis: [60, 62, 64] }
    assert.deepEqual(melodyHits(q, [60, 63, 64]), [true, false, true])
  })
  it('draws a keyboard with disabled black keys', async () => {
    const { keyboardHTML } = await import('./keyboard.js')
    const html = keyboardHTML({ low: 60, high: 67, enabled: (m) => [0, 2, 4, 5, 7, 9, 11].includes(m % 12) })
    assert.equal((html.match(/key white/g) || []).length, 5)
    assert.equal((html.match(/key black[^"]*" data-key="\d+" style="[^"]*" disabled/g) || []).length, 3)
    assert.ok(html.includes('c<sub>1</sub>'))
  })
})

describe('intonation', () => {
  it('offers one clean and two detuned versions', async () => {
    const { genIntonation, INTONATION_DEFAULTS, INTONATION_PRESETS, targetCents, check } = await import('./quiz.js')
    const seen = new Set()
    for (let i = 0; i < 300; i++) {
      const q = genIntonation({ ...INTONATION_DEFAULTS, selected: INTONATION_PRESETS[4], cents: 15, roots: 'all' }, null)
      assert.deepEqual([...q.offsets].sort((a, b) => a - b), [-15, 0, 15])
      assert.equal(q.offsets[Number(q.correct) - 1], 0)
      assert.ok(check(q, q.correct) && !check(q, q.correct === '1' ? '2' : '1'))
      assert.ok(midiOf(q.other) <= 72 && midiOf(q.root) >= 48)
      seen.add(q.correct)
    }
    assert.equal(seen.size, 3)
    assert.equal(targetCents('P5', 'equal'), 700)
    assert.ok(Math.abs(targetCents('M3', 'just') - 386.31) < 0.01)
  })
})

describe('store', () => {
  it('records confusions', () => {
    const s = createStore(memory())
    s.recordConfusion('i:M6', 'i:P5')
    s.recordConfusion('i:M6', 'i:P5')
    s.recordConfusion('c:maj', 'c:aug')
    assert.deepEqual(s.topConfusions('i:'), [{ actual: 'i:M6', chosen: 'i:P5', n: 2 }])
    s.reset()
    assert.deepEqual(s.topConfusions(''), [])
  })
})

describe('texts and notation', () => {
  it('has every text in German and English', async () => {
    const { hasAllKeys, setLang, t } = await import('./i18n.js')
    assert.ok(hasAllKeys('de') && hasAllKeys('en'))
    setLang('en')
    assert.equal(t('right', { x: 'P5' }), 'Right: P5')
    setLang('de')
    assert.equal(t('right', { x: 'r5' }), 'Richtig: r5')
  })
  it('draws stacked notes with offset seconds and accidentals', async () => {
    const { staffSVG } = await import('./staff.js')
    const svg = staffSVG({ clef: 'treble', columns: [{ notes: [{ pos: 2, acc: 0 }, { pos: 3, acc: -1 }] }, { gap: true }] })
    assert.ok(svg.includes('&#xe050;') && svg.includes('&#xe260;') && svg.includes('class="gap"'))
    assert.equal((svg.match(/&#xe0a2;/g) || []).length, 2)
  })
  it('draws guitar positions with degree labels', async () => {
    const { fretboardSVG } = await import('./fretboard.js')
    const svg = fretboardSVG([{ midi: 60, label: '1', color: '#7cc4f2' }, { midi: 64, label: '3', color: '#f2c46d' }])
    assert.equal((svg.match(/class="f-deg"/g) || []).length + (svg.match(/class="f-deg" fill/g) || []).length >= 5, true)
  })
})
