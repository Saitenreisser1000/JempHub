import { describe, expect, it } from 'vitest'
import {
  buildPastedNotes,
  clampResizeLength,
  computePasteRange,
  freshToneGroupColor,
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

  it('reverse-pastes note events into the original chronological slots', () => {
    const items = [
      { fret: 3, string: 1, gridIndex: 2, lengthBlocks: 0.5, color: '#111' },
      { fret: 5, string: 2, gridIndex: 4, lengthBlocks: 1, color: '#222' },
      { fret: 7, string: 3, gridIndex: 5, lengthBlocks: 2, color: '#333' },
    ]
    const out = buildPastedNotes(items, {
      baseGridIndex: 10,
      safeMinGrid: 2,
      createKey: (() => {
        let i = 0
        return () => `reverse-${++i}`
      })(),
      nowMs: 456,
      reverseOrder: true,
    })

    expect(out.map(({ fret, string, gridIndex, lengthBlocks, color }) => ({
      fret,
      string,
      gridIndex,
      lengthBlocks,
      color,
    }))).toEqual([
      { fret: 7, string: 3, gridIndex: 10, lengthBlocks: 2, color: '#333' },
      { fret: 5, string: 2, gridIndex: 12, lengthBlocks: 1, color: '#222' },
      { fret: 3, string: 1, gridIndex: 13, lengthBlocks: 0.5, color: '#111' },
    ])
  })

  it('overrides every pasted note with one fresh tone-group color', () => {
    const color = freshToneGroupColor(['#FF6B6B'], ['#FF6B6B', '#4ECDC4'])
    expect(color).toBe('#4ECDC4')

    const out = buildPastedNotes(
      [
        { fret: 1, string: 1, gridIndex: 1, color: '#111' },
        { fret: 2, string: 2, gridIndex: 2, color: '#222' },
      ],
      { colorOverride: color },
    )
    expect(out.map((note) => note.color)).toEqual(['#4ECDC4', '#4ECDC4'])
    expect(freshToneGroupColor(['#a'], ['#A'])).toMatch(/^hsl\(/)
  })
})
