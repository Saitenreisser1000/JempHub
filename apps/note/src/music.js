// Notennamen, Schlüssel und Notenwerte (deutsche Bezeichnungen).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H']
const LETTER_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

export const rand = (n) => Math.floor(Math.random() * n)
export const pick = (arr) => arr[rand(arr.length)]
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Gewichtete Zufallsauswahl: weight(item) >= 0
export function weightedPick(items, weight) {
  const ws = items.map((it) => Math.max(0, weight(it)))
  const sum = ws.reduce((a, b) => a + b, 0)
  if (!sum) return pick(items)
  let r = Math.random() * sum
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]
    if (r < 0) return items[i]
  }
  return items[items.length - 1]
}

// Deutsche Notennamen: Cis, Des, Es, As, B (= H♭)
export function noteName(letterIdx, acc = 0) {
  const l = LETTERS[letterIdx]
  if (acc === 0) return l
  if (acc > 0) return l + 'is'
  if (l === 'H') return 'B'
  if (l === 'E') return 'Es'
  if (l === 'A') return 'As'
  return l + 'es'
}

// Oktavbezeichnungen nach deutscher Schreibweise (Helmholtz mit Ziffern).
// Wissenschaftliche Oktave 4 (C4 = eingestrichenes c) -> c1, 5 -> c2, 3 -> c, 2 -> C, 1 -> C1, 0 -> C2
export const OCTAVE_NAMES = {
  0: 'Subkontra-Oktave', 1: 'Kontra-Oktave', 2: 'Große Oktave', 3: 'Kleine Oktave',
  4: 'Eingestrichene Oktave', 5: 'Zweigestrichene Oktave', 6: 'Dreigestrichene Oktave', 7: 'Viergestrichene Oktave',
}
export const OCTAVE_SHORT = { 0: 'Subkontra', 1: 'Kontra', 2: 'Groß', 3: 'Klein', 4: '1-gestr.', 5: '2-gestr.', 6: '3-gestr.', 7: '4-gestr.' }

export function germanName(letterIdx, acc, octave) {
  const base = noteName(letterIdx, acc)
  if (octave >= 3) {
    const low = base.toLowerCase()
    return octave === 3 ? low : low + (octave - 3)
  }
  const up = base[0].toUpperCase() + base.slice(1).toLowerCase()
  return octave === 2 ? up : up + (2 - octave)
}

// pos 0 = unterste Notenlinie, jede Stufe ein halber Linienabstand.
// bottomStep: diatonische Stufe der untersten Linie (C0 = 0).
export const CLEFS = {
  treble: { label: 'Violinschlüssel', short: 'Violin', bottomStep: 30 }, // E4
  bass: { label: 'Bassschlüssel', short: 'Bass', bottomStep: 18 }, // G2
}

export const SHARPABLE = [0, 1, 3, 4, 5] // C D F G A
export const FLATTABLE = [1, 2, 4, 5, 6] // D E G A H

export function letterOf(clef, pos) {
  return (((CLEFS[clef].bottomStep + pos) % 7) + 7) % 7
}

export function octaveOf(clef, pos) {
  return Math.floor((CLEFS[clef].bottomStep + pos) / 7)
}

// Klingende Tonhöhe als MIDI-Nummer (C4 = 60)
export function midiOf(clef, pos, acc = 0) {
  return 12 * (octaveOf(clef, pos) + 1) + LETTER_SEMITONES[letterOf(clef, pos)] + acc
}

// Notenwerte in Sechzehnteln
export const BASES = {
  16: { name: 'Ganze', beats: 4 },
  8: { name: 'Halbe', beats: 2 },
  4: { name: 'Viertel', beats: 1 },
  2: { name: 'Achtel', beats: 0.5 },
  1: { name: 'Sechzehntel', beats: 0.25 },
}

export const durOf = (base, dots = 0) => (dots ? base * 1.5 : base)

export function valueLabel(base, dots, kind) {
  const word = kind === 'rest' ? 'Pause' : 'Note'
  const name = BASES[base].name
  const core = base >= 8 ? `${name} ${word}` : `${name}${word.toLowerCase()}`
  return dots ? `Punktierte ${core}` : core
}

export function beatsText(base, dots) {
  const v = BASES[base].beats * (dots ? 1.5 : 1)
  const s = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1.5: '1½', 3: '3' }[v] ?? String(v)
  return `${s} ${v <= 1 ? 'Schlag' : 'Schläge'}`
}

// Dauer (in Sechzehnteln) -> Notenwert
export const VALUE_OF_DUR = {
  16: { base: 16, dots: 0 },
  12: { base: 8, dots: 1 },
  8: { base: 8, dots: 0 },
  6: { base: 4, dots: 1 },
  4: { base: 4, dots: 0 },
  3: { base: 2, dots: 1 },
  2: { base: 2, dots: 0 },
  1: { base: 1, dots: 0 },
}

// Takt in Sechzehnteln
export const METERS = { '2/4': 8, '3/4': 12, '4/4': 16, '6/8': 12, '3/8': 6 }

// Wo eine Tonhöhe auf einem Saiteninstrument liegt. Gitarre und Bass werden
// eine Oktave höher notiert, als sie klingen.
export const INSTRUMENTS = {
  guitar: { name: 'Gitarre', tuning: [64, 59, 55, 50, 45, 40], strings: ['e', 'H', 'G', 'D', 'A', 'E'] },
  bass: { name: 'E-Bass', tuning: [43, 38, 33, 28], strings: ['G', 'D', 'A', 'E'] },
}

export function fretPositions(writtenMidi, instrument, maxFret = 12) {
  const { tuning } = INSTRUMENTS[instrument]
  const sounding = writtenMidi - 12
  const out = []
  tuning.forEach((open, s) => {
    const f = sounding - open
    if (f >= 0 && f <= maxFret) out.push({ s, f })
  })
  return out
}
