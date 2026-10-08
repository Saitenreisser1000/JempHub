import { describe, expect, it } from 'vitest'
import {
  buildPastedNotes,
  clampResizeLength,
  computePasteRange,
  lengthVisualScale,
  snapStepBlocksForMode,
  visualLengthBlocks,
} from './timelineInteractions'

describe('domain/timelineInteractions', () => {
  it('scales visual length by 1.5 in dotted mode only', () => {
    expect(lengthVisualScale('dotted')).toBe(1.5)
    expect(lengthVisualScale('3')).toBe(1)
    expect(visualLengthBlocks(2, 'dotted')).toBe(3)
    expect(visualLengthBlocks(2, '')).toBe(2)
  })

  it('reduces snap step to triplet resolution in 3-mode', () => {
    expect(snapStepBlocksForMode('')).toBe(0.25)
    expect(snapStepBlocksForMode('dotted')).toBe(0.25)
    expect(snapStepBlocksForMode('3')).toBeCloseTo(0.0833333333)
  })

  it('clamps resize minimum to 0.01 when snap is disabled', () => {
    const next = clampResizeLength({
      startLength: 1,
      deltaBlocks: -10,
      startGridIndex: 2,
      totalBlocks: 16,
      snapEnabled: false,
    })
    expect(next).toBe(0.01)
  })

  it('keeps note offsets and lengths when building pasted notes', () => {
    const items = [
      { fret: 5, string: 1, gridIndex: 3, lengthBlocks: 1, color: '#abc', subdivision: 3 },
      { fret: 7, string: 2, gridIndex: 5, lengthBlocks: 0.5 },
    ]
    const { safeMinGrid, endEdge } = computePasteRange(items)
    expect(safeMinGrid).toBe(3)
    expect(endEdge).toBe(2.5)

    const out = buildPastedNotes(items, {
      baseGridIndex: 10,
      safeMinGrid,
      createKey: (() => {
        let i = 0
        return () => `k${++i}`
      })(),
      nowMs: 123,
    })

    expect(out).toEqual([
      {
        key: 'k1',
        fret: 5,
        string: 1,
        color: '#abc',
        gridIndex: 10,
        lengthBlocks: 1,
        subdivision: 3,
        placedAtMs: 123,
      },
      {
        key: 'k2',
        fret: 7,
        string: 2,
        gridIndex: 12,
        lengthBlocks: 0.5,
        subdivision: 2,
        placedAtMs: 123,
      },
    ])
  })
})
