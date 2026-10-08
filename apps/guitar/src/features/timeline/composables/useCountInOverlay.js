import { ref } from 'vue'

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

  function startCountInOverlay(tempoValue, beatsPerBar) {
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

    let idx = 0
    const playCountInClick = (beatNumber) => {
      if (!clickEnabled.value) return
      void playMetronomeClick({ accent: Number(beatNumber) === 1 })
    }
    countInBeat.value = sequence[idx]
    playCountInClick(countInBeat.value)
    countInTimerId = setInterval(() => {
      idx += 1
      if (idx >= sequence.length) {
        clearCountInOverlay()
        return
      }
      countInBeat.value = sequence[idx]
      playCountInClick(countInBeat.value)
    }, beatMs)
  }

  return {
    countInVisible,
    countInBeat,
    clearCountInOverlay,
    startCountInOverlay,
  }
}
