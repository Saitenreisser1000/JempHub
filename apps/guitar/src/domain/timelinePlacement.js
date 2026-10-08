const DEFAULT_LENGTH_BLOCKS = 1

export function defaultLengthBlocksForMode(mode) {
  switch (mode) {
    case '1/16':
      return 0.25
    case '1/8':
      return 0.5
    case '1/4':
      return 1
    case '1/2':
      return 2
    case '1':
      return 4
    default:
      return DEFAULT_LENGTH_BLOCKS
  }
}

export function nextGridIndexFromNotes(notes, { mode } = {}) {
  if (!Array.isArray(notes) || notes.length === 0) return 1

  const last = notes[notes.length - 1]
  const lastGridIndexRaw = Number(last?.gridIndex)
  const lastLengthRaw = Number(last?.lengthBlocks)

  const lastGridIndex = Number.isFinite(lastGridIndexRaw) && lastGridIndexRaw > 0 ? lastGridIndexRaw : 1
  const lastLength = Number.isFinite(lastLengthRaw) && lastLengthRaw > 0 ? lastLengthRaw : DEFAULT_LENGTH_BLOCKS

  if (mode === 'sim') return lastGridIndex
  return lastGridIndex + lastLength
}
