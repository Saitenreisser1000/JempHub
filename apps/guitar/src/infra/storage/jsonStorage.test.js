import { describe, expect, it } from 'vitest'
import { readJson, writeJson } from './jsonStorage'

describe('infra/storage/jsonStorage', () => {
  it('returns null when localStorage is unavailable', () => {
    const original = globalThis.localStorage
    // ensure "unavailable"
     
    delete globalThis.localStorage

    expect(readJson('k')).toBeNull()
    expect(() => writeJson('k', { a: 1 })).not.toThrow()

    globalThis.localStorage = original
  })

  it('reads and writes JSON via localStorage', () => {
    const original = globalThis.localStorage

    const store = new Map()
    globalThis.localStorage = {
      getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
      setItem: (k, v) => store.set(String(k), String(v)),
    }

    writeJson('x', { ok: true, n: 3 })
    expect(readJson('x')).toEqual({ ok: true, n: 3 })

    globalThis.localStorage = original
  })

  it('returns null for invalid JSON', () => {
    const original = globalThis.localStorage

    globalThis.localStorage = {
      getItem: () => '{not-json',
      setItem: () => {},
    }

    expect(readJson('bad')).toBeNull()

    globalThis.localStorage = original
  })
})
