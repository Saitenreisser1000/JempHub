import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PLAYBACK_VISUALS_PULSE_HISTORY_LIMIT } from '@/features/timeline/config/playbackVisuals'

export const usePlaybackVisualsStore = defineStore('playbackVisuals', () => {
  // Public, reactive list of highlighted note keys (currently "active" / playing)
  const highlightedNoteKeys = ref([])

  // Public, reactive pulse start timestamps (wall-clock) per note key.
  // Consumers can animate for a short duration after startedAtMs.
  const pulseStarts = ref([])
  const directionPreview = ref({
    noteKeys: [],
    startedAtMs: 0,
    durationMs: 1500,
  })

  // Internal (non-reactive) time-indexed store
  const activeUntilByKey = new Map()

  function syncKeys() {
    highlightedNoteKeys.value = [...activeUntilByKey.keys()]
  }

  function highlight(noteKey, untilMs) {
    if (!noteKey) return
    const t = Number(untilMs)
    if (!Number.isFinite(t)) return

    const prev = activeUntilByKey.get(noteKey)
    if (prev == null || t > prev) {
      activeUntilByKey.set(noteKey, t)
      syncKeys()
    }

    // Trigger a pulse whenever the note is (re)activated.
    const startedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
    pulseStarts.value = [
      { key: noteKey, startedAtMs },
      ...pulseStarts.value.filter((p) => p?.key !== noteKey),
    ].slice(0, PLAYBACK_VISUALS_PULSE_HISTORY_LIMIT)
  }

  function prune(nowMs) {
    const t = Number(nowMs)
    if (!Number.isFinite(t)) return

    let changed = false
    for (const [key, until] of activeUntilByKey.entries()) {
      if (!(until > t)) {
        activeUntilByKey.delete(key)
        changed = true
      }
    }

    if (changed) syncKeys()
  }

  function clear() {
    if (activeUntilByKey.size === 0) return
    activeUntilByKey.clear()
    syncKeys()
    pulseStarts.value = []
  }

  function triggerDirectionPreview(noteKeys, { durationMs = 1500 } = {}) {
    const keys = Array.isArray(noteKeys)
      ? noteKeys.map((k) => String(k || '')).filter(Boolean)
      : []
    if (keys.length < 2) return
    const dur = Number(durationMs)
    directionPreview.value = {
      noteKeys: keys,
      startedAtMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      durationMs: Number.isFinite(dur) && dur > 0 ? dur : 1500,
    }
  }

  return {
    highlightedNoteKeys,
    pulseStarts,
    directionPreview,
    highlight,
    prune,
    clear,
    triggerDirectionPreview,
  }
})
