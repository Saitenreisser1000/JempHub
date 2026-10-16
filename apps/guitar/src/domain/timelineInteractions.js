import { TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'
import { normalizeNoteValue } from '@/config/noteValues'

function safePositiveNumber(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function lengthVisualScale(simGroupMode) {
  return simGroupMode === 'dotted' || simGroupMode === 'dot' ? 1.5 : 1
}

export function snapStepBlocksForMode(
  simGroupMode,
  baseStepBlocks = TIMELINE_SNAP_STEP_BLOCKS,
) {
  const base = safePositiveNumber(baseStepBlocks, TIMELINE_SNAP_STEP_BLOCKS)
  return simGroupMode === '3' ? base / 3 : base
}

export function visualLengthBlocks(lengthBlocks, simGroupMode) {
  const safeLen = safePositiveNumber(lengthBlocks, 1)
  return safeLen * lengthVisualScale(simGroupMode)
}

export function minResizableLength(snapEnabled, snapStepBlocks = TIMELINE_SNAP_STEP_BLOCKS) {
  return snapEnabled ? safePositiveNumber(snapStepBlocks, TIMELINE_SNAP_STEP_BLOCKS) : 0.01
}

export function clampResizeLength({
  startLength,
  deltaBlocks,
  startGridIndex,
  totalBlocks,
  snapEnabled,
  snapStepBlocks = TIMELINE_SNAP_STEP_BLOCKS,
} = {}) {
  const total = Math.max(1, safePositiveNumber(totalBlocks, 1))
  const safeStartGrid = safePositiveNumber(startGridIndex, 1)
  const minLen = minResizableLength(snapEnabled, snapStepBlocks)
  const maxLen = Math.max(minLen, total - (safeStartGrid - 1))
  const nextLen = safePositiveNumber(startLength, 1) + (Number(deltaBlocks) || 0)
  return Math.min(maxLen, Math.max(minLen, nextLen))
}

export function computePasteRange(items) {
  const safeItems = Array.isArray(items) ? items : []
  const minGrid = Math.min(...safeItems.map((n) => Number(n?.gridIndex)).filter(Number.isFinite))
  const safeMinGrid = Number.isFinite(minGrid) ? minGrid : 1

  const endEdge = Math.max(
    0,
    ...safeItems.map((n) => {
      const start = safePositiveNumber(n?.gridIndex, safeMinGrid)
      const len = safePositiveNumber(n?.lengthBlocks, 1)
      return start - safeMinGrid + len
    }),
  )

  return { safeMinGrid, endEdge }
}

export function buildPastedNotes(
  items,
  {
    baseGridIndex = 1,
    safeMinGrid = 1,
    createKey,
    nowMs = Date.now(),
    reverseOrder = false,
    colorOverride = '',
  } = {},
) {
  if (!Array.isArray(items) || !items.length) return []

  const base = safePositiveNumber(baseGridIndex, 1)
  const minGrid = safePositiveNumber(safeMinGrid, 1)
  const makeKey = typeof createKey === 'function' ? createKey : () => null
  const overrideColor = typeof colorOverride === 'string' ? colorOverride.trim() : ''
  const chronological = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const gridDelta = safePositiveNumber(a.item?.gridIndex, minGrid)
        - safePositiveNumber(b.item?.gridIndex, minGrid)
      return gridDelta || a.index - b.index
    })
  const sources = reverseOrder
    ? chronological.map(({ item }) => item).reverse()
    : chronological.map(({ item }) => item)

  return chronological.map(({ item: slot }, index) => {
    const src = sources[index]
    const offset = safePositiveNumber(slot?.gridIndex, minGrid) - minGrid
    const safeLen = safePositiveNumber(src?.lengthBlocks, 1)
    const subdivision = Number(src?.subdivision) === 3 ? 3 : 2
    const noteValue = normalizeNoteValue(src?.noteValue)
    const nextStart = base + offset
    return {
      key: makeKey(),
      fret: Number(src?.fret),
      string: Number(src?.string),
      ...(overrideColor
        ? { color: overrideColor }
        : typeof src?.color === 'string' && src.color
          ? { color: src.color }
          : {}),
      ...(noteValue ? { noteValue } : {}),
      gridIndex: Number(nextStart.toFixed(2)),
      lengthBlocks: Number(safeLen.toFixed(2)),
      subdivision,
      placedAtMs: nowMs,
    }
  })
}

export function freshToneGroupColor(existingColors, palette = []) {
  const used = new Set(
    (Array.isArray(existingColors) ? existingColors : [])
      .map((color) => String(color || '').trim().toLowerCase())
      .filter(Boolean),
  )
  const available = (Array.isArray(palette) ? palette : [])
    .map((color) => String(color || '').trim())
    .find((color) => color && !used.has(color.toLowerCase()))
  if (available) return available

  for (let hue = 17; hue < 360; hue += 29) {
    const candidate = `hsl(${hue} 72% 58%)`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
  return `hsl(${Date.now() % 360} 72% 58%)`
}
