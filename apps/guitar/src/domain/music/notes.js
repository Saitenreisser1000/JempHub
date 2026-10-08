const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteName(midi, { includeOctave = false } = {}) {
  const n = Number(midi)
  if (!Number.isFinite(n)) return ''
  const idx = ((Math.round(n) % 12) + 12) % 12
  const name = NOTE_NAMES_SHARP[idx]
  if (!includeOctave) return name
  const octave = Math.floor(Math.round(n) / 12) - 1
  return `${name}${octave}`
}
