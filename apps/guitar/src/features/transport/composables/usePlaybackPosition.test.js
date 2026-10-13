import { effectScope, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import { formatPlaybackTime, usePlaybackPosition } from './usePlaybackPosition'

it('formats real elapsed time at the selected tempo, including long songs', () => {
  expect(formatPlaybackTime(65000)).toBe('1:05')
  expect(formatPlaybackTime(65000, 60)).toBe('2:10')
  expect(formatPlaybackTime(65000, 240)).toBe('0:32')
  expect(formatPlaybackTime(3600000)).toBe('60:00')
  expect(formatPlaybackTime(NaN)).toBe('0:00')
  expect(formatPlaybackTime(-500)).toBe('0:00')
  expect(formatPlaybackTime(1000, Infinity)).toBe('0:01')
})

it('previews without seeking on every pointer move or being overwritten by playback', () => {
  const scope = effectScope()
  const head = ref(1000)
  const total = ref(10000)
  const seek = vi.fn()
  const input = scope.run(() => usePlaybackPosition(() => head.value, () => total.value, seek))
  input.preview('4500')
  head.value = 2000
  expect(input.position.value).toBe(4500)
  expect(seek).not.toHaveBeenCalled()
  input.commit()
  expect(seek).toHaveBeenCalledExactlyOnceWith(4500)
  input.preview(7000)
  input.cancel()
  expect(input.position.value).toBe(2000)
  input.commit()
  expect(seek).toHaveBeenCalledTimes(1)
  input.preview(9000)
  total.value = 3000
  expect(input.position.value).toBe(2000)
  input.commit(10000)
  expect(seek).toHaveBeenLastCalledWith(3000)
  input.commit(NaN)
  total.value = 0
  input.commit(1000)
  expect(seek).toHaveBeenCalledTimes(2)
  scope.stop()
})
