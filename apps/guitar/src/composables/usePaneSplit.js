import { ref, watch } from 'vue'
import { readJson, writeJson } from '@/infra/storage/jsonStorage'

const STORAGE_KEY = 'guitarjemp.layout.splitRatio'
const MIN_RATIO = 0.2
const MAX_RATIO = 0.8

export function usePaneSplit() {
  const clampRatio = (value) => Math.max(MIN_RATIO, Math.min(MAX_RATIO, value))
  const stored = readJson(STORAGE_KEY)
  const splitRatio = ref(Number.isFinite(stored) ? clampRatio(stored) : 0.5)
  watch(splitRatio, (value) => writeJson(STORAGE_KEY, value))

  function resetSplit() { splitRatio.value = 0.5 }
  function onDividerKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const step = event.shiftKey ? 0.1 : 0.02
    const targets = {
      ArrowUp: splitRatio.value - step,
      ArrowDown: splitRatio.value + step,
      Home: MIN_RATIO,
      End: MAX_RATIO,
      Enter: 0.5,
    }
    if (!Object.hasOwn(targets, event.key)) return
    event.preventDefault()
    splitRatio.value = clampRatio(targets[event.key])
  }

  return { splitRatio, clampRatio, onDividerKeyDown, resetSplit }
}
