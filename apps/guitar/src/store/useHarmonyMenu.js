import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useInstrumentStore } from '@/store/useInstrument'
import { getTuning } from '@/domain/music/tunings'

const NOTE_TO_PC = {
  C: 0,
  Db: 1,
  'C#': 1,
  D: 2,
  Eb: 3,
  'D#': 3,
  Fb: 4,
  E: 4,
  'E#': 5,
  F: 5,
  Gb: 6,
  'F#': 6,
  G: 7,
  Ab: 8,
  'G#': 8,
  A: 9,
  Bb: 10,
  'A#': 10,
  Cb: 11,
  B: 11,
}

const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  'dominant 7': [0, 4, 7, 10],
  'major 7': [0, 4, 7, 11],
  'minor 7': [0, 3, 7, 10],
  'half-diminished 7': [0, 3, 6, 10],
  'diminished 7': [0, 3, 6, 9],
  add9: [0, 4, 7, 14],
  'major 6': [0, 4, 7, 9],
  'minor 6': [0, 3, 7, 9],
}

const SCALE_INTERVALS = {
  'major (ionian)': [0, 2, 4, 5, 7, 9, 11],
  'natural minor (aeolian)': [0, 2, 3, 5, 7, 8, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'major pentatonic': [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'whole tone': [0, 2, 4, 6, 8, 10],
  'diminished (whole-half)': [0, 2, 3, 5, 6, 8, 9, 11],
}

function toPitchClassSet(rootName, intervals) {
  const root = NOTE_TO_PC[String(rootName ?? '')]
  if (!Number.isFinite(root) || !Array.isArray(intervals) || !intervals.length) return new Set()
  return new Set(intervals.map((i) => ((root + Number(i)) % 12 + 12) % 12))
}

function startFretFromPosition(label) {
  const text = String(label ?? '').trim()
  if (!text) return 0
  if (text.toLowerCase() === 'open') return 0
  const n = Number.parseInt(text, 10)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function patternOffsets(patternLabel) {
  const p = String(patternLabel ?? '')
  if (p.startsWith('CAGED ')) {
    const n = Number.parseInt(p.slice(6), 10)
    const index = Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 1
    const start = (index - 1) * 2
    return { fromOffset: start, toOffset: start + 4 }
  }
  if (p === '3 Notes Per String') return { fromOffset: 0, toOffset: 5 }
  if (p === 'Box Pattern 1') return { fromOffset: 0, toOffset: 3 }
  if (p === 'Box Pattern 2') return { fromOffset: 3, toOffset: 6 }
  if (p === 'Box Pattern 3') return { fromOffset: 6, toOffset: 9 }
  return { fromOffset: 0, toOffset: 4 }
}

const CHORD_SHAPE_TEMPLATES = {
  major: [
    { id: 'open-c', label: 'Open C', rootName: 'C', rootString: 5, frets: [0, 1, 0, 2, 3, null] },
    { id: 'open-a', label: 'Open A', rootName: 'A', rootString: 5, frets: [0, 2, 2, 2, 0, null] },
    { id: 'open-g', label: 'Open G', rootName: 'G', rootString: 6, frets: [3, 0, 0, 0, 2, 3] },
    { id: 'open-e', label: 'Open E', rootName: 'E', rootString: 6, frets: [0, 0, 1, 2, 2, 0] },
    { id: 'open-d', label: 'Open D', rootName: 'D', rootString: 4, frets: [2, 3, 2, 0, null, null] },
    { id: 'e-shape', label: 'E Shape', rootString: 6, offsets: [0, 0, 1, 2, 2, 0] },
    { id: 'a-shape', label: 'A Shape', rootString: 5, offsets: [0, 2, 2, 2, 0, null] },
    { id: 'd-shape', label: 'D Shape', rootString: 4, offsets: [2, 3, 2, 0, null, null] },
  ],
  minor: [
    { id: 'open-am', label: 'Open Am', rootName: 'A', rootString: 5, frets: [0, 1, 2, 2, 0, null] },
    { id: 'open-em', label: 'Open Em', rootName: 'E', rootString: 6, frets: [0, 0, 0, 2, 2, 0] },
    { id: 'open-dm', label: 'Open Dm', rootName: 'D', rootString: 4, frets: [1, 3, 2, 0, null, null] },
    { id: 'e-shape', label: 'E Shape', rootString: 6, offsets: [0, 0, 0, 2, 2, 0] },
    { id: 'a-shape', label: 'A Shape', rootString: 5, offsets: [0, 1, 2, 2, 0, null] },
    { id: 'dm-shape', label: 'Dm Shape', rootString: 4, offsets: [1, 3, 2, 0, null, null] },
  ],
  'dominant 7': [
    { id: 'open-e7', label: 'Open E7', rootName: 'E', rootString: 6, frets: [0, 0, 1, 0, 2, 0] },
    { id: 'open-a7', label: 'Open A7', rootName: 'A', rootString: 5, frets: [0, 2, 0, 2, 0, null] },
    { id: 'open-d7', label: 'Open D7', rootName: 'D', rootString: 4, frets: [2, 1, 2, 0, null, null] },
    { id: 'open-c7', label: 'Open C7', rootName: 'C', rootString: 5, frets: [0, 1, 3, 2, 3, null] },
    { id: 'open-g7', label: 'Open G7', rootName: 'G', rootString: 6, frets: [1, 0, 0, 0, 2, 3] },
    { id: 'e7-shape', label: 'E7 Shape', rootString: 6, offsets: [0, 0, 1, 0, 2, 0] },
    { id: 'a7-shape', label: 'A7 Shape', rootString: 5, offsets: [0, 2, 0, 2, 0, null] },
    { id: 'd7-shape', label: 'D7 Shape', rootString: 4, offsets: [2, 1, 2, 0, null, null] },
  ],
  'major 7': [
    { id: 'open-cmaj7', label: 'Open Cmaj7', rootName: 'C', rootString: 5, frets: [0, 0, 0, 2, 3, null] },
    { id: 'open-amaj7', label: 'Open Amaj7', rootName: 'A', rootString: 5, frets: [0, 2, 1, 2, 0, null] },
    { id: 'open-emaj7', label: 'Open Emaj7', rootName: 'E', rootString: 6, frets: [0, 0, 1, 1, 2, 0] },
    { id: 'open-dmaj7', label: 'Open Dmaj7', rootName: 'D', rootString: 4, frets: [2, 2, 2, 0, null, null] },
    { id: 'open-gmaj7', label: 'Open Gmaj7', rootName: 'G', rootString: 6, frets: [2, 0, 0, 0, 2, 3] },
    { id: 'maj7-a-shape', label: 'Amaj7 Shape', rootString: 5, offsets: [0, 2, 1, 2, 0, null] },
    { id: 'maj7-e-shape', label: 'Emaj7 Shape', rootString: 6, offsets: [0, 0, 1, 2, 3, 0] },
    { id: 'maj7-d-shape', label: 'Dmaj7 Shape', rootString: 4, offsets: [2, 2, 2, 0, null, null] },
  ],
  'minor 7': [
    { id: 'open-am7', label: 'Open Am7', rootName: 'A', rootString: 5, frets: [0, 1, 0, 2, 0, null] },
    { id: 'open-em7', label: 'Open Em7', rootName: 'E', rootString: 6, frets: [0, 0, 0, 0, 2, 0] },
    { id: 'open-dm7', label: 'Open Dm7', rootName: 'D', rootString: 4, frets: [1, 1, 2, 0, null, null] },
    { id: 'm7-e-shape', label: 'Em7 Shape', rootString: 6, offsets: [0, 0, 0, 0, 2, 0] },
    { id: 'm7-a-shape', label: 'Am7 Shape', rootString: 5, offsets: [0, 1, 0, 2, 0, null] },
    { id: 'm7-d-shape', label: 'Dm7 Shape', rootString: 4, offsets: [1, 1, 2, 0, null, null] },
  ],
}

const ROOT_STRING_OPTIONS = {
  'string-e': 6,
  'string-a': 5,
  'string-d': 4,
}

function notePc(name) {
  const pc = NOTE_TO_PC[String(name ?? '').trim().toUpperCase()]
  return Number.isFinite(pc) ? pc : null
}

function stringPitchClass(openMidi, stringNumber) {
  const midi = Number(openMidi?.[Number(stringNumber) - 1])
  if (!Number.isFinite(midi)) return null
  return ((midi % 12) + 12) % 12
}

function rootFretsForString(rootName, rootString, openMidi, maxFret = 15) {
  const rootPc = notePc(rootName)
  const openPc = stringPitchClass(openMidi, rootString)
  if (!Number.isFinite(rootPc) || !Number.isFinite(openPc)) return []
  const base = ((rootPc - openPc) % 12 + 12) % 12
  const out = []
  for (let fret = base; fret <= maxFret; fret += 12) out.push(fret)
  return out
}

function shapeMinFret(offsets, rootFret) {
  let min = Infinity
  for (const offset of offsets) {
    if (offset == null) continue
    min = Math.min(min, rootFret + Number(offset))
  }
  return Number.isFinite(min) ? min : rootFret
}

function shapeMaxFret(offsets, rootFret) {
  let max = -Infinity
  for (const offset of offsets) {
    if (offset == null) continue
    max = Math.max(max, rootFret + Number(offset))
  }
  return Number.isFinite(max) ? max : rootFret
}

function shapeScore({ rootFret, offsets, positionLabel }) {
  const target = startFretFromPosition(positionLabel)
  const minFret = shapeMinFret(offsets, rootFret)
  const maxFret = shapeMaxFret(offsets, rootFret)
  const spanPenalty = Math.max(0, maxFret - minFret - 4) * 3
  if (String(positionLabel || '').trim().toLowerCase() === 'open') {
    return minFret + spanPenalty + (rootFret > 5 ? 12 : 0)
  }
  return Math.abs(minFret - target) + spanPenalty
}

function buildChordShape(rootName, template, positionLabel, openMidi) {
  if (Array.isArray(template?.frets)) {
    const isOpenPosition = String(positionLabel || '').trim().toLowerCase() === 'open'
    if (!isOpenPosition) return null
    if (String(rootName || '').trim().toUpperCase() !== String(template?.rootName || '').trim().toUpperCase()) {
      return null
    }
    const positions = []
    for (let index = 0; index < template.frets.length; index += 1) {
      const fret = template.frets[index]
      if (fret == null) continue
      positions.push({
        string: index + 1,
        fret: Number(fret),
        isRoot: false,
      })
    }
    return {
      id: String(template.id || ''),
      label: String(template.label || ''),
      rootFret: 0,
      positions,
      score: 0,
    }
  }

  const candidates = rootFretsForString(rootName, template?.rootString, openMidi)
  let best = null
  for (const rootFret of candidates) {
    const positions = []
    let valid = true
    for (let index = 0; index < template.offsets.length; index += 1) {
      const offset = template.offsets[index]
      if (offset == null) continue
      const fret = rootFret + Number(offset)
      if (!Number.isFinite(fret) || fret < 0) {
        valid = false
        break
      }
      positions.push({
        string: index + 1,
        fret,
        isRoot: index + 1 === template.rootString && Number(offset) === 0,
      })
    }
    if (!valid || !positions.length) continue
    const score = shapeScore({ rootFret, offsets: template.offsets, positionLabel })
    const candidate = {
      id: String(template.id || ''),
      label: String(template.label || ''),
      rootFret,
      positions,
      score,
    }
    if (!best || candidate.score < best.score) best = candidate
  }
  return best
}

export const useHarmonyMenuStore = defineStore('harmonyMenu', () => {
  const instrument = useInstrumentStore()
  const chordRoot = ref('C')
  const chordType = ref('major')
  const showChord = ref(false)
  const chordPosition = ref('Open')
  const chordRootString = ref('string-e')

  const scaleRoot = ref('C')
  const scaleType = ref('major (ionian)')
  const showScale = ref(false)

  const position = ref('Open')
  const pattern = ref('CAGED 1')

  const chordPitchClasses = computed(() => {
    const intervals = CHORD_INTERVALS[String(chordType.value ?? '')] ?? null
    return toPitchClassSet(chordRoot.value, intervals)
  })

  const scalePitchClasses = computed(() => {
    const intervals = SCALE_INTERVALS[String(scaleType.value ?? '')] ?? null
    return toPitchClassSet(scaleRoot.value, intervals)
  })

  const patternFretRange = computed(() => {
    const startFret = startFretFromPosition(position.value)
    const { fromOffset, toOffset } = patternOffsets(pattern.value)
    return {
      fromFret: Math.max(0, startFret + fromOffset),
      toFret: Math.max(0, startFret + toOffset),
    }
  })

  const chordShapeOpenMidi = computed(() => {
    const tuning = getTuning(instrument.tuningId)
    const openMidi = Array.isArray(tuning?.openMidi) ? tuning.openMidi : []
    return openMidi.length >= 6 ? openMidi : []
  })

  const chordShapeOptions = computed(() => {
    const shapes = CHORD_SHAPE_TEMPLATES[String(chordType.value ?? '')] ?? []
    const isOpenPosition = String(chordPosition.value || '').trim().toLowerCase() === 'open'
    const preferredString = Number(ROOT_STRING_OPTIONS[String(chordRootString.value || '')] || 0)
    const matchingOpenShapes = isOpenPosition
      ? shapes.filter((shape) => Array.isArray(shape?.frets) && String(shape?.rootName || '').trim().toUpperCase() === String(chordRoot.value || '').trim().toUpperCase())
      : []
    const candidateShapes = matchingOpenShapes.length
      ? matchingOpenShapes
      : shapes.filter((shape) => isOpenPosition || !preferredString || Number(shape?.rootString) === preferredString)
    return candidateShapes
      .map((shape) => ({
        title: String(shape.label || shape.id || 'Shape'),
        value: String(shape.id || ''),
      }))
  })

  const activeChordShape = computed(() => {
    const shapes = CHORD_SHAPE_TEMPLATES[String(chordType.value ?? '')] ?? []
    if (!shapes.length) return null

    const openMidi = chordShapeOpenMidi.value
    if (!Array.isArray(openMidi) || openMidi.length < 6) return null
    const isOpenPosition = String(chordPosition.value || '').trim().toLowerCase() === 'open'
    const preferredString = Number(ROOT_STRING_OPTIONS[String(chordRootString.value || '')] || 0)
    const matchingOpenShapes = isOpenPosition
      ? shapes.filter((shape) => Array.isArray(shape?.frets) && String(shape?.rootName || '').trim().toUpperCase() === String(chordRoot.value || '').trim().toUpperCase())
      : []
    const filteredShapes = matchingOpenShapes.length
      ? matchingOpenShapes
      : isOpenPosition
      ? shapes
      : preferredString
      ? shapes.filter((shape) => Number(shape?.rootString) === preferredString)
      : shapes

    let best = null
    for (const template of filteredShapes) {
      const candidate = buildChordShape(chordRoot.value, template, chordPosition.value, openMidi)
      if (!candidate) continue
      if (!best || candidate.score < best.score) best = candidate
    }
    return best
  })

  return {
    chordRoot,
    chordType,
    showChord,
    chordPosition,
    chordRootString,
    scaleRoot,
    scaleType,
    showScale,
    position,
    pattern,
    chordPitchClasses,
    scalePitchClasses,
    patternFretRange,
    chordShapeOptions,
    activeChordShape,
  }
})
