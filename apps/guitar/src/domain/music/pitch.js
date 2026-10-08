import { parseFretStringKey } from '@/domain/note'

export function midiForFretString({ fret, string }, tuning) {
  const t = tuning
  if (!t) return null

  const stringIdx = Number(string) - 1
  const open = t.openMidi?.[stringIdx]
  if (!Number.isFinite(Number(open))) return null

  const f = Number.isFinite(Number(fret)) ? Number(fret) : 0
  return Number(open) + f
}

export function midiForNote(note, tuning) {
  if (!note) return null
  return midiForFretString({ fret: note.fret, string: note.string }, tuning)
}

export function midiForFretStringKey(key, tuning) {
  const { fret, string } = parseFretStringKey(key)
  return midiForFretString({ fret, string }, tuning)
}
