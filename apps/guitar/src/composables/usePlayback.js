import { ref } from 'vue'
import { getSharedAudioContext } from '@/domain/audio/audioContext'

// Timers only replenish the queue. Musical time comes exclusively from Web Audio.
export function usePlayback({ onTick, onInvalidate, onInterrupted } = {}) {
  const isPlaying = ref(false)
  const playhead = ref(0)
  const loopEnabled = ref(false)
  let timer = null
  let origin = 0
  let baseTime = 0
  let rate = 1
  let lastClock = 0
  let duration = 0
  const clock = () => getSharedAudioContext()?.currentTime ?? 0

  function audioTimeFor(tMs) {
    return origin + (tMs - baseTime) / (1000 * rate)
  }

  function tick() {
    if (!isPlaying.value) return
    const ctx = getSharedAudioContext()
    const now = clock()
    if (ctx?.state !== 'running' || now - lastClock > 0.25) {
      pause()
      onInterrupted?.()
      return
    }
    lastClock = now
    const elapsed = baseTime + Math.max(0, now - origin) * 1000 * rate
    playhead.value = elapsed
    onTick?.(elapsed)
    if (!loopEnabled.value && elapsed >= duration && isPlaying.value) stop()
  }

  function start(totalDuration, tempo = 120, { delayMs = 0, startAt } = {}) {
    if (isPlaying.value) return
    rate = Math.max(1, Number(tempo) || 120) / 120
    duration = Math.max(0, Number(totalDuration) || 0)
    baseTime = playhead.value
    lastClock = clock()
    origin = (Number.isFinite(startAt) ? startAt : lastClock + 0.04)
      + Math.max(0, Number(delayMs) || 0) / 1000
    isPlaying.value = true
    timer = setInterval(tick, 25)
    tick() // Schedule the first notes before their audio deadline, including count-in.
  }

  function setLoop(value) { loopEnabled.value = Boolean(value) }

  function seek(tMs, { emitTick = true, startAt } = {}) {
    onInvalidate?.()
    const t = Math.max(0, Number(tMs) || 0)
    playhead.value = t
    baseTime = t
    lastClock = clock()
    origin = Number.isFinite(startAt) ? startAt : lastClock + 0.04
    if (emitTick) onTick?.(t)
  }

  function pause() {
    isPlaying.value = false
    clearInterval(timer)
    timer = null
    onInvalidate?.()
  }

  function stop() {
    pause()
    playhead.value = 0
    baseTime = 0
  }

  return { isPlaying, playhead, loopEnabled, setLoop, start, pause, stop, seek, audioTimeFor }
}
