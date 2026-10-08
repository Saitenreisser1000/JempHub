export function mapMidiToFretString(midi, openMidi, { maxFret = 24 } = {}) {
  const m = Number(midi)
  if (!Number.isFinite(m) || !Array.isArray(openMidi) || !openMidi.length) return null

  const candidates = []
  for (let i = 0; i < openMidi.length; i += 1) {
    const open = Number(openMidi[i])
    if (!Number.isFinite(open)) continue
    const fret = m - open
    if (fret < 0 || fret > maxFret) continue
    candidates.push({ string: i + 1, fret })
  }

  if (!candidates.length) return null
  candidates.sort((a, b) => {
    if (a.fret !== b.fret) return a.fret - b.fret
    return a.string - b.string
  })
  return candidates[0]
}
