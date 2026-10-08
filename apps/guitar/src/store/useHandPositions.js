import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHandPositionsStore = defineStore('handPositions', () => {
  const handPositions = ref([])

  function setHandPositions(items) {
    handPositions.value = Array.isArray(items) ? items.map((n) => ({ ...n })) : []
  }

  function addHandPosition(note) {
    if (!note || typeof note !== 'object') return
    handPositions.value.push({ ...note })
  }

  function setHandPositionGridIndex(key, gridIndex) {
    const idx = handPositions.value.findIndex((n) => String(n?.key ?? '') === String(key ?? ''))
    if (idx < 0) return
    const n = Number(gridIndex)
    if (!Number.isFinite(n)) return
    handPositions.value[idx].gridIndex = n > 0 ? Number(n.toFixed(2)) : 1
  }

  function setHandPositionLength(key, lengthBlocks) {
    const idx = handPositions.value.findIndex((n) => String(n?.key ?? '') === String(key ?? ''))
    if (idx < 0) return
    const n = Number(lengthBlocks)
    if (!Number.isFinite(n)) return
    handPositions.value[idx].lengthBlocks = n > 0 ? Number(n.toFixed(2)) : 0.01
  }

  function setHandPositionLabel(key, label) {
    const idx = handPositions.value.findIndex((n) => String(n?.key ?? '') === String(key ?? ''))
    if (idx < 0) return
    const text = String(label ?? '').trim()
    if (!text) return
    handPositions.value[idx].fret = text
  }

  return {
    handPositions,
    setHandPositions,
    addHandPosition,
    setHandPositionGridIndex,
    setHandPositionLength,
    setHandPositionLabel,
  }
})
