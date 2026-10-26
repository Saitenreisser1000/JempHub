// Aufgaben für Intervalle und Akkorde. Reine Funktionen, gewichtet nach Schwächen.
import { INTERVAL, INTERVAL_PRESETS, CHORD, CHORD_PRESETS, transpose, chordNotes, rootPool, readable, midiOf } from './theory.js'

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

export const check = (q, answerId) => answerId === q.id
