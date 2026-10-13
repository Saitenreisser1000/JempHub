import { ref, watch } from 'vue'

export const TEMPO_MIN = 30
export const TEMPO_MAX = 260

export function clampTempo(value) {
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(Number(value))))
}

// Keep partial input local: typing "120" must not immediately turn "1" into "30".
export function useTempoInput(getTempo, updateTempo) {
  const tempoDraft = ref(String(getTempo()))
  const editing = ref(false)
  watch(getTempo, (value) => {
    if (!editing.value) tempoDraft.value = String(value)
  })

  function beginTempoEdit() { editing.value = true }
  function cancelTempoEdit() {
    tempoDraft.value = String(getTempo())
    editing.value = false
  }
  function commitTempo() {
    const raw = String(tempoDraft.value ?? '').trim().replace(',', '.')
    const value = Number(raw)
    if (raw && Number.isFinite(value)) {
      const next = clampTempo(value)
      if (next !== getTempo()) updateTempo(next)
      tempoDraft.value = String(next)
    } else {
      tempoDraft.value = String(getTempo())
    }
    editing.value = false
  }

  return { tempoDraft, beginTempoEdit, commitTempo, cancelTempoEdit }
}
