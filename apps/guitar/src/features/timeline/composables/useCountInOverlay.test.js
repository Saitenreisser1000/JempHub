import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useCountInOverlay } from './useCountInOverlay'

const ctx = vi.hoisted(() => ({ currentTime: 10 }))
vi.mock('@/domain/audio/audioContext', () => ({ getSharedAudioContext: () => ctx }))
beforeEach(() => { vi.useFakeTimers(); ctx.currentTime = 10 })
afterEach(() => vi.useRealTimers())

it('schedules the whole count-in on the audio clock without timer-driven late clicks', () => {
  const click = vi.fn()
  const run = new AbortController()
  const overlay = useCountInOverlay({
    pickupEnabled: ref(false), pickupBeats: ref(1), clickEnabled: ref(true), playMetronomeClick: click,
  })
  overlay.startCountInOverlay(120, 4, { startAt: 10.04, signal: run.signal })
  expect(click.mock.calls.map(([options]) => options.startAt)).toEqual([10.04, 10.54, 11.04, 11.54])
  expect(click.mock.calls.every(([options]) => options.signal === run.signal)).toBe(true)
  ctx.currentTime = 11.1
  vi.advanceTimersByTime(25)
  expect(overlay.countInBeat.value).toBe(3)
  expect(click).toHaveBeenCalledTimes(4)
  run.abort()
  vi.advanceTimersByTime(25)
  expect(overlay.countInVisible.value).toBe(false)
})
