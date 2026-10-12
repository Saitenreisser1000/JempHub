import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePlayback } from './usePlayback'

const ctx = vi.hoisted(() => ({ currentTime: 10, state: 'running' }))
vi.mock('@/domain/audio/audioContext', () => ({ getSharedAudioContext: () => ctx }))
beforeEach(() => { vi.useFakeTimers(); ctx.currentTime = 10; ctx.state = 'running' })
afterEach(() => vi.useRealTimers())

it('schedules before the first deadline and advances using audio time, not timer time', () => {
  const tick = vi.fn()
  const player = usePlayback({ onTick: tick })
  player.start(4000, 120)
  expect(tick).toHaveBeenLastCalledWith(0)
  expect(player.audioTimeFor(500)).toBeCloseTo(10.54)
  vi.advanceTimersByTime(1000)
  expect(player.playhead.value).toBe(0)
  ctx.currentTime = 10.1
  vi.advanceTimersByTime(25)
  expect(player.playhead.value).toBeCloseTo(60)
  player.stop()
})

it('shares a fixed count-in origin and applies tempo to note deadlines', () => {
  const player = usePlayback()
  player.start(4000, 60, { delayMs: 4000, startAt: 10.04 })
  expect(player.audioTimeFor(0)).toBeCloseTo(14.04)
  expect(player.audioTimeFor(500)).toBeCloseTo(15.04)
  player.stop()
})

it('pauses on a large scheduler interruption instead of catching up in a burst', () => {
  const tick = vi.fn()
  const interrupted = vi.fn()
  const invalidate = vi.fn()
  const player = usePlayback({ onTick: tick, onInterrupted: interrupted, onInvalidate: invalidate })
  player.start(4000)
  tick.mockClear()
  ctx.currentTime = 12
  vi.advanceTimersByTime(25)
  expect(player.isPlaying.value).toBe(false)
  expect(tick).not.toHaveBeenCalled()
  expect(interrupted).toHaveBeenCalledOnce()
  expect(invalidate).toHaveBeenCalledOnce()
})

it('invalidates audio on pause and seek; a subsequent start has no old timer', () => {
  const invalidate = vi.fn()
  const tick = vi.fn()
  const player = usePlayback({ onTick: tick, onInvalidate: invalidate })
  player.start(4000)
  player.pause()
  player.seek(500, { emitTick: false })
  expect(invalidate).toHaveBeenCalledTimes(2)
  player.start(4000)
  expect(player.audioTimeFor(500)).toBeCloseTo(10.04)
  tick.mockClear()
  vi.advanceTimersByTime(25)
  expect(tick).toHaveBeenCalledOnce()
  player.stop()
})

it('preserves the exact audio boundary across loop seeks', () => {
  const player = usePlayback()
  player.start(4000)
  const boundary = player.audioTimeFor(2000)
  player.seek(500, { startAt: boundary, emitTick: false })
  expect(player.audioTimeFor(500)).toBe(boundary)
  expect(player.audioTimeFor(1000)).toBeCloseTo(boundary + 0.5)
  player.stop()
})

it('pauses if the browser suspends audio', () => {
  const player = usePlayback()
  player.start(4000)
  ctx.state = 'suspended'
  vi.advanceTimersByTime(25)
  expect(player.isPlaying.value).toBe(false)
})
