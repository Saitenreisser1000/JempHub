import { ref } from 'vue'
import { getSharedAudioContext } from '@/domain/audio/audioContext'

export function useCountInOverlay({
  pickupEnabled,
  pickupBeats,
  clickEnabled,
  playMetronomeClick,
}) {
  const countInVisible = ref(false)
  const countInBeat = ref(0)
  let countInTimerId = null

  function clearCountInOverlay() {
    if (countInTimerId) {
      clearInterval(countInTimerId)
      countInTimerId = null
    }
    countInVisible.value = false
    countInBeat.value = 0
  }

  function startCountInOverlay(tempoValue, beatsPerBar, { startAt, signal } = {}) {
    clearCountInOverlay()
    const beatMs = Math.max(1, 60000 / (Number(tempoValue) || 120))
    const beats = Math.max(1, Number.parseInt(String(beatsPerBar), 10) || 4)
    countInVisible.value = true
    const pickupRaw = Number.parseInt(String(pickupBeats.value), 10)
    const pickup = Number.isFinite(pickupRaw)
      ? Math.max(1, Math.min(Math.max(1, beats - 1), pickupRaw))
      : 1
    const startBeat = pickupEnabled.value ? beats - pickup + 1 : 1

    const sequence = []
    for (let i = 0; i < beats; i += 1) {
      sequence.push(((startBeat - 1 + i) % beats) + 1)
    }

    const origin = Number.isFinite(startAt) ? startAt : getSharedAudioContext().currentTime
    if (clickEnabled.value) {
      sequence.forEach((beat, index) => {
        void playMetronomeClick({ accent: beat === 1, startAt: origin + index * beatMs / 1000, signal })
      })
    }
    const update = () => {
      const idx = Math.max(0, Math.floor((getSharedAudioContext().currentTime - origin) * 1000 / beatMs))
      if (signal?.aborted || idx >= sequence.length) {
        clearCountInOverlay()
        return
      }
      countInBeat.value = sequence[idx]
    }
    update()
    countInTimerId = setInterval(update, 25)
  }

  return {
    countInVisible,
    countInBeat,
    clearCountInOverlay,
    startCountInOverlay,
  }
}
