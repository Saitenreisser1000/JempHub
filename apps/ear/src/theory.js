// Musiktheorie für EarJemp: richtig geschriebene Töne, Intervalle und Akkorde.
// Ein Ton: { l: Buchstabe 0–6 (C D E F G A H/B), a: Vorzeichen -2..2, o: Oktave (C4 = eingestrichenes c) }

export const SEMI = [0, 2, 4, 5, 7, 9, 11]

export const midiOf = (n) => 12 * (n.o + 1) + SEMI[n.l] + n.a
export const stepOf = (n) => n.o * 7 + n.l

export function fromStep(step, midi) {
  const o = Math.floor(step / 7)
  const l = ((step % 7) + 7) % 7
  return { l, o, a: midi - (12 * (o + 1) + SEMI[l]) }
}

// Ton um (Halbtöne, Stammtonschritte) verschieben; dir = 1 aufwärts, -1 abwärts.
export function transpose(n, semis, steps, dir = 1) {
  return fromStep(stepOf(n) + dir * steps, midiOf(n) + dir * semis)
}

// ---------------------------------------------------------------- Namen

const LETTERS_DE = ['C', 'D', 'E', 'F', 'G', 'A', 'H']
const LETTERS_EN = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function noteLabel(n, lang) {
  if (lang === 'de') {
    const l = LETTERS_DE[n.l]
    if (n.a === 0) return l
    if (n.a === 1) return l + 'is'
    if (n.a === 2) return l + 'isis'
    if (n.a === -1) return l === 'H' ? 'B' : l === 'E' ? 'Es' : l === 'A' ? 'As' : l + 'es'
    return l === 'H' ? 'Heses' : l === 'E' ? 'Eses' : l === 'A' ? 'Ases' : l + 'eses'
  }
  return LETTERS_EN[n.l] + (n.a > 0 ? '♯'.repeat(n.a) : n.a < 0 ? '♭'.repeat(-n.a) : '')
}

// ---------------------------------------------------------------- Intervalle

export const INTERVALS = [
  { id: 'm2', semis: 1, steps: 1, de: ['kleine Sekunde', 'k2'], en: ['minor 2nd', 'm2'] },
  { id: 'M2', semis: 2, steps: 1, de: ['große Sekunde', 'g2'], en: ['major 2nd', 'M2'] },
  { id: 'm3', semis: 3, steps: 2, de: ['kleine Terz', 'k3'], en: ['minor 3rd', 'm3'] },
  { id: 'M3', semis: 4, steps: 2, de: ['große Terz', 'g3'], en: ['major 3rd', 'M3'] },
  { id: 'P4', semis: 5, steps: 3, de: ['reine Quarte', 'r4'], en: ['perfect 4th', 'P4'] },
  { id: 'TT', semis: 6, steps: 3, de: ['Tritonus', 'TT'], en: ['tritone', 'TT'] },
  { id: 'P5', semis: 7, steps: 4, de: ['reine Quinte', 'r5'], en: ['perfect 5th', 'P5'] },
  { id: 'm6', semis: 8, steps: 5, de: ['kleine Sexte', 'k6'], en: ['minor 6th', 'm6'] },
  { id: 'M6', semis: 9, steps: 5, de: ['große Sexte', 'g6'], en: ['major 6th', 'M6'] },
  { id: 'm7', semis: 10, steps: 6, de: ['kleine Septime', 'k7'], en: ['minor 7th', 'm7'] },
  { id: 'M7', semis: 11, steps: 6, de: ['große Septime', 'g7'], en: ['major 7th', 'M7'] },
  { id: 'P8', semis: 12, steps: 7, de: ['Oktave', 'r8'], en: ['octave', 'P8'] },
  { id: 'm9', semis: 13, steps: 8, de: ['kleine None', 'k9'], en: ['minor 9th', 'm9'] },
  { id: 'M9', semis: 14, steps: 8, de: ['große None', 'g9'], en: ['major 9th', 'M9'] },
]
export const INTERVAL = Object.fromEntries(INTERVALS.map((i) => [i.id, i]))

export const INTERVAL_PRESETS = {
  1: ['M3', 'P4', 'P5', 'P8'],
  2: ['M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'],
  3: ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'],
  4: INTERVALS.map((i) => i.id),
}

// ---------------------------------------------------------------- Akkorde
// tones: [Halbtöne, Stammtonschritte, Stufenbezeichnung] ab Grundton

export const CHORDS = [
  { id: 'maj', tones: [[0, 0, '1'], [4, 2, '3'], [7, 4, '5']], de: ['Dur', ''], en: ['major', ''] },
  { id: 'min', tones: [[0, 0, '1'], [3, 2, '♭3'], [7, 4, '5']], de: ['Moll', 'm'], en: ['minor', 'm'] },
  { id: 'dim', tones: [[0, 0, '1'], [3, 2, '♭3'], [6, 4, '♭5']], de: ['vermindert', '°'], en: ['diminished', '°'] },
  { id: 'aug', tones: [[0, 0, '1'], [4, 2, '3'], [8, 4, '♯5']], de: ['übermäßig', '+'], en: ['augmented', '+'] },
  { id: 'sus2', tones: [[0, 0, '1'], [2, 1, '2'], [7, 4, '5']], de: ['sus2', 'sus2'], en: ['sus2', 'sus2'] },
  { id: 'sus4', tones: [[0, 0, '1'], [5, 3, '4'], [7, 4, '5']], de: ['sus4', 'sus4'], en: ['sus4', 'sus4'] },
  { id: 'dom7', tones: [[0, 0, '1'], [4, 2, '3'], [7, 4, '5'], [10, 6, '♭7']], de: ['Dominantseptakkord', '7'], en: ['dominant 7th', '7'] },
  { id: 'maj7', tones: [[0, 0, '1'], [4, 2, '3'], [7, 4, '5'], [11, 6, '7']], de: ['großer Septakkord', 'maj7'], en: ['major 7th', 'maj7'] },
  { id: 'min7', tones: [[0, 0, '1'], [3, 2, '♭3'], [7, 4, '5'], [10, 6, '♭7']], de: ['Moll-Septakkord', 'm7'], en: ['minor 7th', 'm7'] },
  { id: 'minmaj7', tones: [[0, 0, '1'], [3, 2, '♭3'], [7, 4, '5'], [11, 6, '7']], de: ['Moll mit großer Septime', 'm(maj7)'], en: ['minor-major 7th', 'm(maj7)'] },
  { id: 'm7b5', tones: [[0, 0, '1'], [3, 2, '♭3'], [6, 4, '♭5'], [10, 6, '♭7']], de: ['halbvermindert', 'm7♭5'], en: ['half-diminished', 'm7♭5'] },
  { id: 'dim7', tones: [[0, 0, '1'], [3, 2, '♭3'], [6, 4, '♭5'], [9, 6, '𝄫7']], de: ['verminderter Septakkord', '°7'], en: ['diminished 7th', '°7'] },
  { id: 'aug7', tones: [[0, 0, '1'], [4, 2, '3'], [8, 4, '♯5'], [10, 6, '♭7']], de: ['übermäßiger Septakkord', '+7'], en: ['augmented 7th', '+7'] },
]
export const CHORD = Object.fromEntries(CHORDS.map((c) => [c.id, c]))

export const CHORD_PRESETS = {
  1: ['maj', 'min'],
  2: ['maj', 'min', 'dim', 'aug'],
  3: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'],
  4: ['dom7', 'maj7', 'min7', 'm7b5', 'dim7'],
  5: CHORDS.map((c) => c.id),
}

export function chordNotes(root, chord) {
  return chord.tones.map(([semis, steps]) => transpose(root, semis, steps, 1))
}

// ---------------------------------------------------------------- Umkehrungen

const POS_DE = ['Grundstellung', '1. Umkehrung', '2. Umkehrung', '3. Umkehrung']
const POS_EN = ['root position', '1st inversion', '2nd inversion', '3rd inversion']
const FIGURES = { 3: ['', '6', '6/4'], 4: ['7', '6/5', '4/3', '2'] }
const INV_BASE = { maj: ['Dur', 'major'], min: ['Moll', 'minor'], dom7: ['Dom7', 'dom7'] }

export const INVERSIONS = Object.entries(INV_BASE).flatMap(([chord, [de, en]]) =>
  CHORD[chord].tones.map((_, inv) => ({
    id: `${chord}-${inv}`, chord, inv,
    de: [`${de}, ${POS_DE[inv]}`, FIGURES[CHORD[chord].tones.length][inv]],
    en: [`${en}, ${POS_EN[inv]}`, FIGURES[CHORD[chord].tones.length][inv]],
  })))
export const INVERSION = Object.fromEntries(INVERSIONS.map((i) => [i.id, i]))

export const INVERSION_PRESETS = {
  1: ['maj-0', 'maj-1', 'maj-2'],
  2: ['maj-0', 'maj-1', 'maj-2', 'min-0', 'min-1', 'min-2'],
  3: ['dom7-0', 'dom7-1', 'dom7-2', 'dom7-3'],
  4: INVERSIONS.map((i) => i.id),
}

// Akkordtöne von unten nach oben; die untersten inv Töne wandern eine Oktave hinauf.
export function invertNotes(notes, inv) {
  return notes.slice(inv).concat(notes.slice(0, inv).map((n) => transpose(n, 12, 7, 1)))
}
// Stufen in der Reihenfolge der umgekehrten Töne
export const inversionDegrees = (item) => {
  const d = CHORD[item.chord].tones.map((t) => t[2])
  return d.slice(item.inv).concat(d.slice(0, item.inv))
}

// ---------------------------------------------------------------- Tonleitern
// steps: [Halbtöne, Stammtonschritte] je Schritt

const hepta = (semis) => semis.map((x) => [x, 1])
export const SCALES = [
  { id: 'ion', steps: hepta([2, 2, 1, 2, 2, 2, 1]), de: ['Dur', 'ionisch'], en: ['major', 'Ionian'] },
  { id: 'aeo', steps: hepta([2, 1, 2, 2, 1, 2, 2]), de: ['Moll', 'äolisch'], en: ['minor', 'Aeolian'] },
  { id: 'harm', steps: hepta([2, 1, 2, 2, 1, 3, 1]), de: ['harmonisch Moll', ''], en: ['harmonic minor', ''] },
  { id: 'mel', steps: hepta([2, 1, 2, 2, 2, 2, 1]), de: ['melodisch Moll', ''], en: ['melodic minor', ''] },
  { id: 'dor', steps: hepta([2, 1, 2, 2, 2, 1, 2]), de: ['dorisch', ''], en: ['Dorian', ''] },
  { id: 'phr', steps: hepta([1, 2, 2, 2, 1, 2, 2]), de: ['phrygisch', ''], en: ['Phrygian', ''] },
  { id: 'lyd', steps: hepta([2, 2, 2, 1, 2, 2, 1]), de: ['lydisch', ''], en: ['Lydian', ''] },
  { id: 'mix', steps: hepta([2, 2, 1, 2, 2, 1, 2]), de: ['mixolydisch', ''], en: ['Mixolydian', ''] },
  { id: 'loc', steps: hepta([1, 2, 2, 1, 2, 2, 2]), de: ['lokrisch', ''], en: ['Locrian', ''] },
  { id: 'pmaj', steps: [[2, 1], [2, 1], [3, 2], [2, 1], [3, 2]], de: ['Dur-Pentatonik', ''], en: ['major pentatonic', ''] },
  { id: 'pmin', steps: [[3, 2], [2, 1], [2, 1], [3, 2], [2, 1]], de: ['Moll-Pentatonik', ''], en: ['minor pentatonic', ''] },
]
export const SCALE = Object.fromEntries(SCALES.map((s) => [s.id, s]))

export const SCALE_PRESETS = {
  1: ['ion', 'aeo'],
  2: ['ion', 'aeo', 'harm', 'mel'],
  3: ['ion', 'aeo', 'dor', 'phr', 'mix', 'pmaj', 'pmin'],
  4: ['ion', 'aeo', 'dor', 'phr', 'lyd', 'mix', 'loc', 'pmaj', 'pmin'],
  5: SCALES.map((s) => s.id),
}

// Töne der Tonleiter aufwärts, mit Grundton oben
export function scaleNotes(root, scale) {
  const out = [root]
  let semis = 0, steps = 0
  for (const [h, l] of scale.steps) {
    semis += h
    steps += l
    out.push(transpose(root, semis, steps, 1))
  }
  return out
}

// Stufe eines Tons über dem Grundton, z. B. '♭3', '♯4'
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
export function degreeLabel(root, note) {
  const steps = stepOf(note) - stepOf(root)
  const k = ((steps % 7) + 7) % 7
  const diff = midiOf(note) - midiOf(root) - 12 * Math.floor(steps / 7) - MAJOR[k]
  return (diff < 0 ? '♭'.repeat(-diff) : '♯'.repeat(diff)) + (k + 1)
}

// ---------------------------------------------------------------- Einzeltöne

// Gebräuchliche Schreibweise eines MIDI-Tons: Cis, Es, Fis, As, B
const SPELL = [[0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]]
export function spellMidi(midi) {
  const [l, a] = SPELL[((midi % 12) + 12) % 12]
  return { l, a, o: Math.floor(midi / 12) - 1 }
}
export const isNatural = (midi) => SPELL[((midi % 12) + 12) % 12][1] === 0

// ---------------------------------------------------------------- Grundtöne

// Grundtöne zwischen lowMidi und highMidi; naturalsOnly: nur Stammtöne.
export function rootPool(lowMidi, highMidi, naturalsOnly) {
  const out = []
  for (let o = 1; o <= 6; o++)
    for (let l = 0; l < 7; l++)
      for (const a of naturalsOnly ? [0] : [-1, 0, 1]) {
        const n = { l, a, o }
        const m = midiOf(n)
        if (m < lowMidi || m > highMidi) continue
        // nur gebräuchliche Schreibweisen (kein Eis, His, Ces, Fes)
        if ((a === 1 && (l === 2 || l === 6)) || (a === -1 && (l === 0 || l === 3))) continue
        out.push(n)
      }
  return out
}

export const readable = (notes) => notes.every((n) => Math.abs(n.a) <= 1)

// ---------------------------------------------------------------- Notensystem

export const CLEF_BOTTOM = { treble: 30, bass: 18 } // Stammtonschritt der untersten Linie (E4 bzw. G2)

export function clefFor(notes) {
  const avg = notes.reduce((s, n) => s + midiOf(n), 0) / notes.length
  return avg >= 57 ? 'treble' : 'bass'
}

export const staffPos = (n, clef) => stepOf(n) - CLEF_BOTTOM[clef]

// ---------------------------------------------------------------- Gitarre

export const GUITAR = [64, 59, 55, 50, 45, 40] // klingende Tonhöhen, hohe e-Saite zuerst

export function guitarPositions(midi, maxFret = 12) {
  const out = []
  GUITAR.forEach((open, s) => {
    const f = midi - open
    if (f >= 0 && f <= maxFret) out.push({ s, f })
  })
  return out
}
