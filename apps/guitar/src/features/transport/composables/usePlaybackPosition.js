import { computed, ref, watch } from 'vue'

function duration(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
}

// Timeline milliseconds use a fixed 120 BPM base; display real playback time.
export function formatPlaybackTime(milliseconds, tempo = 120) {
  const bpm = Number(tempo) > 0 && Number.isFinite(Number(tempo)) ? Number(tempo) : 120
  const seconds = Math.floor(duration(milliseconds) * 120 / bpm / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function usePlaybackPosition(getPlayhead, getDuration, seek) {
  const draft = ref(null)
  const total = computed(() => duration(getDuration()))
  const clamp = (value) => Math.min(total.value, duration(value))
  const position = computed(() => clamp(draft.value ?? getPlayhead()))
  function preview(value) { draft.value = clamp(value) }
  function cancel() { draft.value = null }
  function commit(value = draft.value) {
    if (value != null && total.value > 0 && Number.isFinite(Number(value))) seek(clamp(value))
    cancel()
  }
  watch(total, cancel, { flush: 'sync' })
  return { total, position, preview, commit, cancel }
}
