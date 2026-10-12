const APP_BASE = String(import.meta?.env?.BASE_URL || '/')
const NOTE_ICON_BASE = `${APP_BASE.replace(/\/+$/, '')}/assets/notes/bravura`

export const TRIAD_ICON = `${NOTE_ICON_BASE}/triad.svg`

export const NOTE_MODIFIER_ICONS = {
  dotted: `${NOTE_ICON_BASE}/dotted-quarter.svg`,
  triplet: `${NOTE_ICON_BASE}/triplet.svg`,
}

export const NOTE_VALUE_ITEMS = [
  {
    value: '1/16',
    icon: `${NOTE_ICON_BASE}/sixteenth.svg`,
    title: 'Sixteenth Note',
    label: '1/16',
    dotSymbol: '♬',
    fallbackSymbol: '♬',
    baseBlocks: 0.25,
  },
  {
    value: '1/8',
    icon: `${NOTE_ICON_BASE}/eighth.svg`,
    title: 'Eighth Note',
    label: '1/8',
    dotSymbol: '♪',
    fallbackSymbol: '♪',
    baseBlocks: 0.5,
  },
  {
    value: '1/4',
    icon: `${NOTE_ICON_BASE}/quarter.svg`,
    title: 'Quarter Note',
    label: '1/4',
    dotSymbol: '♩',
    fallbackSymbol: '♩',
    baseBlocks: 1,
  },
  {
    value: '1/2',
    icon: `${NOTE_ICON_BASE}/half.svg`,
    title: 'Half Note',
    label: '1/2',
    dotSymbol: '𝅗𝅥',
    fallbackSymbol: '𝅗𝅥',
    baseBlocks: 2,
  },
  {
    value: '1',
    icon: `${NOTE_ICON_BASE}/whole.svg`,
    title: 'Whole Note',
    label: '1',
    dotSymbol: '𝅝',
    fallbackSymbol: '𝅝',
    baseBlocks: 4,
  },
]

const NOTE_VALUE_SET = new Set(NOTE_VALUE_ITEMS.map((i) => String(i.value)))
const NOTE_VALUE_TO_ITEM = new Map(NOTE_VALUE_ITEMS.map((i) => [String(i.value), i]))

export function normalizeNoteValue(raw) {
  const v = String(raw ?? '').trim()
  return NOTE_VALUE_SET.has(v) ? v : ''
}

export function noteValueItem(value) {
  const v = normalizeNoteValue(value)
  return v ? (NOTE_VALUE_TO_ITEM.get(v) ?? null) : null
}

export function noteValueFallbackSymbol(value) {
  const item = noteValueItem(value)
  return item?.fallbackSymbol || item?.dotSymbol || item?.label || ''
}
