import { afterEach, expect, it, vi } from 'vitest'
import { useViewportMode } from './useViewportMode'

afterEach(() => vi.unstubAllGlobals())

it.each([
  [393, 852, true, true],
  [915, 412, true, true],
  [1280, 800, false, false],
  [800, 600, false, false],
])('detects mobile at %ix%i with coarse pointer %s', (width, height, coarse, expected) => {
  vi.stubGlobal('window', {
    matchMedia: (query) => ({
      matches: query === '(pointer: coarse)' ? coarse : query.split(',').some((part) => {
        const match = part.match(/max-(width|height): (\d+)px/)
        return match && (match[1] === 'width' ? width : height) <= Number(match[2])
      }),
    }),
  })
  expect(useViewportMode().shouldDefaultToPhoneView()).toBe(expected)
})
