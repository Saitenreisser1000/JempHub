import { describe, expect, it, vi } from 'vitest'
import { createNoteKey, normalizeNote, parseFretStringKey } from './note'

describe('domain/note', () => {
  it('parses fret-string keys', () => {
    expect(parseFretStringKey('3-1')).toEqual({ fret: 3, string: 1 })
  })

  it('createNoteKey uses crypto.randomUUID when available', () => {
    const spy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-123')

    expect(createNoteKey()).toBe('uuid-123')
    spy.mockRestore()
  })

  it('normalizeNote accepts a legacy fret-string key', () => {
    const note = normalizeNote('7-2', { fallbackGridIndex: 5 })
    expect(note).toMatchObject({
      fret: 7,
      string: 2,
      gridIndex: 5,
      lengthBlocks: 1,
      subdivision: 2,
    })
    expect(typeof note.key).toBe('string')
    expect(typeof note.placedAtMs).toBe('number')
  })

  it('normalizeNote accepts note objects and normalizes invalid numbers', () => {
    const note = normalizeNote(
      {
        key: 'n1',
        fret: '4',
        string: '1',
        gridIndex: -1,
        lengthBlocks: 0,
        placedAtMs: 'not-a-number',
        color: '#abc',
        subdivision: 3,
      },
      { fallbackGridIndex: 9 },
    )

    expect(note).toMatchObject({
      key: 'n1',
      fret: 4,
      string: 1,
      gridIndex: 9,
      lengthBlocks: 1,
      color: '#abc',
      subdivision: 3,
    })
    expect(typeof note.placedAtMs).toBe('number')
  })
})
