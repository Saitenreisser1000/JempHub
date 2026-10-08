import { defineStore } from 'pinia'
import { ref } from 'vue'
import { defaultTuningIdForInstrument, getTuning } from '@/domain/music/tunings'
import { readJson } from '@/infra/storage/jsonStorage'
import { persistRefs } from '@/infra/pinia/persistRefs'

const STORAGE_KEY = 'guitarjemp.instrument.v1'

export const useInstrumentStore = defineStore('instrument', () => {
  const stored = readJson(STORAGE_KEY) ?? {}
  const numStrings = ref(Number.isFinite(stored.numStrings) ? stored.numStrings : 6)
  const instrumentType = ref(
    stored.instrumentType === 'bass' || stored.instrumentType === 'ukulele'
      ? stored.instrumentType
      : 'guitar',
  )
  const tuningId = ref(
    typeof stored.tuningId === 'string'
      ? stored.tuningId
      : defaultTuningIdForInstrument(instrumentType.value),
  )

  function stringsForInstrument(type) {
    switch (type) {
      case 'bass':
        return 4
      case 'ukulele':
        return 4
      case 'guitar':
      default:
        return 6
    }
  }

  function setNumStrings(n) {
    const v = Number.parseInt(n, 10)
    numStrings.value = Number.isFinite(v) && v > 0 ? v : 6
  }

  function setInstrumentType(type) {
    const t = type === 'bass' || type === 'ukulele' ? type : 'guitar'
    instrumentType.value = t
    numStrings.value = stringsForInstrument(t)
    tuningId.value = defaultTuningIdForInstrument(t)
  }

  function setTuningId(id) {
    const next = String(id)
    const tuning = getTuning(next)
    if (!tuning) return
    tuningId.value = next
    numStrings.value = tuning.openMidi.length
    instrumentType.value = tuning.instrumentType
  }

  persistRefs(STORAGE_KEY, { numStrings, instrumentType, tuningId })

  return { numStrings, instrumentType, tuningId, setNumStrings, setInstrumentType, setTuningId }
})
