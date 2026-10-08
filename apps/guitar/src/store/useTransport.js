import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readJson } from '@/infra/storage/jsonStorage'
import { persistRefs } from '@/infra/pinia/persistRefs'

const STORAGE_KEY = 'guitarjemp.transport.v1'

export const useTransportStore = defineStore('transport', () => {
  const stored = readJson(STORAGE_KEY) ?? {}

  const tempo = ref(Number.isFinite(stored.tempo) ? stored.tempo : 120)
  const playState = ref(stored.playState === 'playing' ? 'playing' : 'stopped')

  // Current timeline playhead position in milliseconds.
  // Not persisted: it's UI state.
  const playheadMs = ref(0)

  function setTempo(t) {
    const n = Number(t)
    tempo.value = Number.isFinite(n) ? n : 120
  }

  function setPlayState(s) {
    playState.value = s === 'playing' ? 'playing' : 'stopped'
  }

  function setPlayheadMs(tMs) {
    const t = Number(tMs)
    playheadMs.value = Number.isFinite(t) && t >= 0 ? t : 0
  }

  persistRefs(STORAGE_KEY, { tempo, playState })

  return { tempo, playState, playheadMs, setTempo, setPlayState, setPlayheadMs }
})
