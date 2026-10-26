// Aufgaben für Intervalle und Akkorde. Reine Funktionen, gewichtet nach Schwächen.
import { spellMidi, isNatural, INTERVAL, INTERVAL_PRESETS, CHORD, CHORD_PRESETS, INVERSION, INVERSION_PRESETS, SCALE, SCALE_PRESETS, transpose, chordNotes, invertNotes, scaleNotes, rootPool, readable, midiOf } from './theory.js'

const rand = (n) => Math.floor(Math.random() * n)
const pick = (arr) => arr[rand(arr.length)]

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

const flat = () => 1

// ---------------------------------------------------------------- Intervalle

export const INTERVAL_DEFAULTS = { preset: 2, selected: INTERVAL_PRESETS[2], dirs: ['up'], roots: 'natural', length: 10, focus: true, fretboard: false }
export const intervalKey = (id) => `i:${id}`

export function intervalChoices(settings) {
  const ids = (settings.selected || []).filter((id) => INTERVAL[id])
  return ids.length >= 2 ? ids : INTERVAL_PRESETS[1]
}

export function genInterval(settings, prev, weight = flat) {
  const choices = intervalChoices(settings)
  const dirs = settings.dirs && settings.dirs.length ? settings.dirs : ['up']
  const pool = prev && choices.length > 2 ? choices.filter((id) => id !== prev.id) : choices
  const id = weightedPick(pool, (x) => weight(intervalKey(x)))
  const iv = INTERVAL[id]
  const dir = pick(dirs)
  const naturals = settings.roots !== 'all'
  // Grundtöne so, dass beide Töne im gut klingenden Bereich (C3 bis E5) liegen
  const candidates = rootPool(48, 72, naturals).filter((root) => {
    const other = transpose(root, iv.semis, iv.steps, dir === 'down' ? -1 : 1)
    const lo = Math.min(midiOf(root), midiOf(other))
    const hi = Math.max(midiOf(root), midiOf(other))
    return lo >= 48 && hi <= 76 && readable([root, other])
  })
  const root = pick(candidates.length ? candidates : rootPool(55, 60, true))
  const other = transpose(root, iv.semis, iv.steps, dir === 'down' ? -1 : 1)
  return { type: 'interval', id, dir, root, other, notes: [root, other] }
}

// ---------------------------------------------------------------- Akkorde

export const CHORD_DEFAULTS = { preset: 1, selected: CHORD_PRESETS[1], play: 'block', roots: 'natural', length: 10, focus: true, fretboard: false }
export const chordKey = (id) => `c:${id}`

export function chordChoices(settings) {
  const ids = (settings.selected || []).filter((id) => CHORD[id])
  return ids.length >= 2 ? ids : CHORD_PRESETS[1]
}

export function genChord(settings, prev, weight = flat) {
  const choices = chordChoices(settings)
  const pool = prev && choices.length > 2 ? choices.filter((id) => id !== prev.id) : choices
  const id = weightedPick(pool, (x) => weight(chordKey(x)))
  const chord = CHORD[id]
  const naturals = settings.roots !== 'all'
  const candidates = rootPool(48, 64, naturals).filter((root) => {
    const notes = chordNotes(root, chord)
    return readable(notes) && midiOf(notes[notes.length - 1]) <= 76
  })
  const root = pick(candidates.length ? candidates : rootPool(48, 55, true))
  return { type: 'chord', id, root, notes: chordNotes(root, chord) }
}

// ---------------------------------------------------------------- Umkehrungen

export const INVERSION_DEFAULTS = { preset: 2, selected: INVERSION_PRESETS[2], play: 'block', roots: 'natural', length: 10, focus: true, fretboard: false }
export const inversionKey = (id) => `v:${id}`

export function inversionChoices(settings) {
  const ids = (settings.selected || []).filter((id) => INVERSION[id])
  return ids.length >= 2 ? ids : INVERSION_PRESETS[1]
}

export function genInversion(settings, prev, weight = flat) {
  const choices = inversionChoices(settings)
  const pool = prev && choices.length > 2 ? choices.filter((id) => id !== prev.id) : choices
  const id = weightedPick(pool, (x) => weight(inversionKey(x)))
  const item = INVERSION[id]
  const chord = CHORD[item.chord]
  const naturals = settings.roots !== 'all'
  // Basston zwischen C3 und G4, oberster Ton höchstens G5
  const build = (root) => invertNotes(chordNotes(root, chord), item.inv)
  const candidates = rootPool(36, 67, naturals).filter((root) => {
    const notes = build(root)
    const lo = midiOf(notes[0]), hi = midiOf(notes[notes.length - 1])
    return readable(notes) && lo >= 48 && lo <= 67 && hi <= 79
  })
  const root = pick(candidates.length ? candidates : rootPool(48, 55, true))
  return { type: 'inversion', id, root, notes: build(root) }
}

// ---------------------------------------------------------------- Tonleitern

export const SCALE_DEFAULTS = { preset: 1, selected: SCALE_PRESETS[1], dirs: ['up'], tempo: 'mid', roots: 'natural', length: 10, focus: true, fretboard: false }
export const scaleKey = (id) => `s:${id}`
export const SCALE_TEMPO = { slow: 0.55, mid: 0.38, fast: 0.24 }

export function scaleChoices(settings) {
  const ids = (settings.selected || []).filter((id) => SCALE[id])
  return ids.length >= 2 ? ids : SCALE_PRESETS[1]
}

export function genScale(settings, prev, weight = flat) {
  const choices = scaleChoices(settings)
  const dirs = settings.dirs && settings.dirs.length ? settings.dirs : ['up']
  const pool = prev && choices.length > 2 ? choices.filter((id) => id !== prev.id) : choices
  const id = weightedPick(pool, (x) => weight(scaleKey(x)))
  const naturals = settings.roots !== 'all'
  const candidates = rootPool(48, 62, naturals).filter((root) => readable(scaleNotes(root, SCALE[id])))
  const root = pick(candidates.length ? candidates : rootPool(48, 55, true))
  const notes = scaleNotes(root, SCALE[id])
  const dir = pick(dirs)
  // Reihenfolge beim Abspielen
  const seq = dir === 'down' ? [...notes].reverse() : dir === 'updown' ? notes.concat(notes.slice(0, -1).reverse()) : notes
  return { type: 'scale', id, dir, root, notes, seq }
}

// ---------------------------------------------------------------- Melodiediktat

// Tonvorrat und größter Sprung (Halbtöne) je Stufe
export const MELODY_LEVELS = {
  1: { low: 60, high: 67, chromatic: false, leap: 4 },
  2: { low: 60, high: 72, chromatic: false, leap: 7 },
  3: { low: 60, high: 72, chromatic: true, leap: 7 },
  4: { low: 57, high: 76, chromatic: true, leap: 12 },
}
export const MELODY_DEFAULTS = { level: 1, notes: 5, bpm: 80, hint: true, length: 10 }
export const melodyKey = (id) => `m:${id}`

export function melodyPool(level) {
  const L = MELODY_LEVELS[level] || MELODY_LEVELS[1]
  const out = []
  for (let m = L.low; m <= L.high; m++) if (L.chromatic || isNatural(m)) out.push(m)
  return out
}

export function genMelody(settings) {
  const level = MELODY_LEVELS[settings.level] ? Number(settings.level) : 1
  const L = MELODY_LEVELS[level]
  const pool = melodyPool(level)
  const count = Math.max(3, Math.min(12, Number(settings.notes) || 5))
  // Anfang eher in der Mitte, dann vorwiegend kleine Schritte
  const mid = pool.filter((m) => Math.abs(m - (L.low + L.high) / 2) <= 5)
  const midis = [pick(mid.length ? mid : pool)]
  while (midis.length < count) {
    const last = midis[midis.length - 1]
    const twice = midis.length > 1 && midis[midis.length - 2] === last
    const next = weightedPick(pool.filter((m) => Math.abs(m - last) <= L.leap && !(twice && m === last)), (m) => {
      const d = Math.abs(m - last)
      return d === 0 ? 0.35 : 1 / d
    })
    midis.push(next)
  }
  return { type: 'melody', id: String(level), midis, notes: midis.map(spellMidi) }
}

// Anzahl richtiger Töne (Tonhöhe zählt, Schreibweise nicht)
export const melodyHits = (q, entry) => q.midis.map((m, k) => entry[k] === m)

export const check = (q, answerId) => answerId === q.id
