import { normalizeNoteValue } from '@/config/noteValues'

export function fretStringKeyFor(fret, string) {
  return `${Number(fret)}-${Number(string)}`
}

export function parseFretStringKey(key) {
  const [fret, string] = String(key).split('-').map(Number)
  return { fret, string }
}

export function createNoteKey() {
  const uuid = globalThis?.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function looksLikeFretStringKey(key) {
  return /^\d+-\d+$/.test(String(key))
}

function normalizeSubdivision(raw) {
  const n = Number(raw)
  return n === 3 ? 3 : 2
}

export function normalizeNote(input, { fallbackGridIndex = 1 } = {}) {
  if (!input) return null

  if (typeof input === 'string') {
    const { fret, string } = parseFretStringKey(input)
    return {
      key: createNoteKey(),
      fret,
      string,
      gridIndex: fallbackGridIndex,
      lengthBlocks: 1,
      subdivision: 2,
      placedAtMs: Date.now(),
    }
  }

  if (typeof input === 'object') {
    const color = typeof input.color === 'string' ? input.color : null
    const rawKey = input.key
    const key = typeof rawKey === 'string' ? rawKey : createNoteKey()
    const noteValue = normalizeNoteValue(input.noteValue)

    let parsed = null
    if (input.fret != null && input.string != null) parsed = input
    else if (looksLikeFretStringKey(key)) parsed = parseFretStringKey(key)
    else return null

    const gridIndexRaw = Number(input.gridIndex)
    const gridIndex =
      Number.isFinite(gridIndexRaw) && gridIndexRaw > 0 ? gridIndexRaw : fallbackGridIndex

    const lengthRaw = Number(input.lengthBlocks)
    const lengthBlocks = Number.isFinite(lengthRaw) && lengthRaw > 0 ? lengthRaw : 1

    const subdivision = normalizeSubdivision(input.subdivision)

    const placedAtRaw = Number(input.placedAtMs)
    const placedAtMs = Number.isFinite(placedAtRaw) ? placedAtRaw : Date.now()

    return {
      key: String(key),
      fret: Number(parsed.fret),
      string: Number(parsed.string),
      ...(color ? { color } : {}),
      ...(noteValue ? { noteValue } : {}),
      gridIndex,
      lengthBlocks,
      subdivision,
      placedAtMs,
    }
  }

  return null
}
