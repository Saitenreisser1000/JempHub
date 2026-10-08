import { describe, expect, it } from 'vitest'
import { defaultLengthBlocksForMode, nextGridIndexFromNotes } from './timelinePlacement'

describe('domain/timelinePlacement', () => {
  it('maps modes to length blocks', () => {
    expect(defaultLengthBlocksForMode('1/16')).toBe(0.25)
    expect(defaultLengthBlocksForMode('1/8')).toBe(0.5)
    expect(defaultLengthBlocksForMode('1/4')).toBe(1)
    expect(defaultLengthBlocksForMode('1/2')).toBe(2)
    expect(defaultLengthBlocksForMode('1')).toBe(4)
    expect(defaultLengthBlocksForMode('unknown')).toBe(1)
  })

  it('computes next grid index after the last note', () => {
    const notes = [{ gridIndex: 3, lengthBlocks: 2 }]
    expect(nextGridIndexFromNotes(notes, { mode: '1/4' })).toBe(5)
  })

  it('keeps grid index in sim mode', () => {
    const notes = [{ gridIndex: 3, lengthBlocks: 2 }]
    expect(nextGridIndexFromNotes(notes, { mode: 'sim' })).toBe(3)
  })

  it('handles empty/invalid notes', () => {
    expect(nextGridIndexFromNotes([], { mode: '1/4' })).toBe(1)
    expect(nextGridIndexFromNotes(null, { mode: '1/4' })).toBe(1)
  })
})
