import { defineStore } from 'pinia'
import { ref } from 'vue'
import { COMMENT_COLORS, DEFAULT_COMMENT_COLOR } from 'jemp-design-system/design-constants'

let nextTextId = 1
const NORMALIZED_COMMENT_COLORS = Object.freeze(COMMENT_COLORS.map((color) => String(color).toLowerCase()))

function clampPercent(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function clampSizePercent(v, { min = 6, max = 80 } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function normalizeCommentColor(value) {
  const raw = String(value || '').trim().toLowerCase()
  return NORMALIZED_COMMENT_COLORS.includes(raw) ? raw : String(DEFAULT_COMMENT_COLOR).toLowerCase()
}

export const useFretboardOverlayStore = defineStore('fretboardOverlay', () => {
  const textItems = ref([])

  function addTextItem({
    xPct,
    yPct,
    text = '',
    gridIndex = 1,
    lengthBlocks = 4,
    color,
    widthPct = 32,
    heightPct = 18,
  } = {}) {
    const item = {
      id: `txt_${nextTextId++}`,
      xPct: clampPercent(xPct),
      yPct: clampPercent(yPct),
      widthPct: clampSizePercent(widthPct, { min: 14, max: 70 }),
      heightPct: clampSizePercent(heightPct, { min: 10, max: 48 }),
      text: String(text ?? ''),
      color: normalizeCommentColor(color),
      gridIndex: Number.isFinite(Number(gridIndex)) && Number(gridIndex) > 0 ? Number(gridIndex) : 1,
      lengthBlocks:
        Number.isFinite(Number(lengthBlocks)) && Number(lengthBlocks) > 0 ? Number(lengthBlocks) : 4,
    }
    textItems.value.push(item)
    return item
  }

  function setTextItems(items) {
    textItems.value = Array.isArray(items)
      ? items.map((item) => ({
        id: String(item?.id || `txt_${nextTextId++}`),
        xPct: clampPercent(item?.xPct),
        yPct: clampPercent(item?.yPct),
        widthPct: clampSizePercent(item?.widthPct, { min: 14, max: 70 }),
        heightPct: clampSizePercent(item?.heightPct, { min: 10, max: 48 }),
        text: String(item?.text ?? ''),
        color: normalizeCommentColor(item?.color),
        gridIndex:
          Number.isFinite(Number(item?.gridIndex)) && Number(item?.gridIndex) > 0
            ? Number(item.gridIndex)
            : 1,
        lengthBlocks:
          Number.isFinite(Number(item?.lengthBlocks)) && Number(item?.lengthBlocks) > 0
            ? Number(item.lengthBlocks)
            : 4,
      }))
      : []
  }

  function updateTextItemPosition(id, { xPct, yPct } = {}) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    textItems.value[idx].xPct = clampPercent(xPct)
    textItems.value[idx].yPct = clampPercent(yPct)
  }

  function updateTextItemSize(id, { widthPct, heightPct } = {}) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    if (widthPct != null) textItems.value[idx].widthPct = clampSizePercent(widthPct, { min: 14, max: 70 })
    if (heightPct != null) textItems.value[idx].heightPct = clampSizePercent(heightPct, { min: 10, max: 48 })
  }

  function updateTextItemText(id, text) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    textItems.value[idx].text = String(text ?? '')
  }

  function updateTextItemColor(id, color) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    textItems.value[idx].color = normalizeCommentColor(color)
  }

  function updateTextItemTiming(id, { gridIndex, lengthBlocks } = {}) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    if (gridIndex != null) {
      const nextGrid = Number(gridIndex)
      textItems.value[idx].gridIndex =
        Number.isFinite(nextGrid) && nextGrid > 0 ? nextGrid : textItems.value[idx].gridIndex
    }
    if (lengthBlocks != null) {
      const nextLength = Number(lengthBlocks)
      textItems.value[idx].lengthBlocks =
        Number.isFinite(nextLength) && nextLength > 0 ? nextLength : textItems.value[idx].lengthBlocks
    }
  }

  function removeTextItem(id) {
    const key = String(id || '')
    if (!key) return
    textItems.value = textItems.value.filter((x) => String(x?.id) !== key)
  }

  return {
    textItems,
    COMMENT_COLORS,
    DEFAULT_COMMENT_COLOR,
    addTextItem,
    setTextItems,
    updateTextItemPosition,
    updateTextItemSize,
    updateTextItemText,
    updateTextItemColor,
    updateTextItemTiming,
    removeTextItem,
  }
})
