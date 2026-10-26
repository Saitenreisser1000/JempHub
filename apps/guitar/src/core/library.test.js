import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeExercise } from './sanitize.js'
import { fromStorage, mergeLibrary, libraryAfterSignOut, toCloudRow, makeRecord, isUuid, content } from './library.js'
import { examples } from './exercises.js'

const base = () => ({ title: 'T', inst: 'guitar', tuning: [64, 59, 55, 50, 45, 40], ts: [4, 4], bpm: 80, moments: [{ dur: 12, dots: [{ s: 0, f: 3 }] }] })

describe('sanitizeExercise', () => {
  it('keeps every sample exercise unchanged', () => {
    for (const ex of examples()) {
      const clean = sanitizeExercise(ex)
      assert.deepEqual(clean.moments, ex.moments)
      assert.deepEqual(clean.tuning, ex.tuning)
      assert.equal(clean.title, ex.title)
    }
  })
  it('drops markup and invalid values from shared data', () => {
    const e = base()
    e.color = '"/><script>alert(1)</script>'
    e.moments.push({ dur: 12, dots: [{ s: 9, f: 3 }, { s: 1, f: 99 }], color: 'red" onload="x', note: 42 })
    e.moments.push({ dur: -5, dots: [] })
    e.bpm = 99999
    const c = sanitizeExercise(e)
    assert.equal(c.color, null)
    assert.equal(c.moments.length, 2)
    assert.deepEqual(c.moments[1].dots, [])
    assert.equal(c.moments[1].color, null)
    assert.equal(c.moments[1].note, null)
    assert.equal(c.bpm, 80)
  })
  it('allows only one dot per string in a moment', () => {
    const e = base()
    e.moments = [{ dur: 12, dots: [{ s: 2, f: 1 }, { s: 2, f: 5 }, { s: 3, f: 0 }] }]
    assert.deepEqual(sanitizeExercise(e).moments[0].dots.map((d) => [d.s, d.f]), [[2, 1], [3, 0]])
  })
  it('rejects data without a usable tuning', () => {
    assert.equal(sanitizeExercise({ moments: [], tuning: [1, 2] }), null)
    assert.equal(sanitizeExercise(null), null)
  })
})

describe('library records', () => {
  it('upgrades storage from before cloud support', () => {
    const recs = fromStorage([{ ...base(), id: 'ex0' }, { ...base(), id: 'u1700000000' }])
    assert.equal(recs[0].origin, 'example')
    assert.equal(recs[1].origin, 'mine')
    assert.ok(isUuid(recs[1].id))
    assert.equal(recs[1].synced, false)
  })
  it('sends only content to the cloud', () => {
    const r = makeRecord(base(), { id: 'a', origin: 'mine', synced: true, dirty: true })
    const row = toCloudRow(r)
    assert.equal(row.data.origin, undefined)
    assert.equal(row.data.dirty, undefined)
    assert.deepEqual(content(r), row.data)
  })
})

describe('mergeLibrary', () => {
  const me = 'me'
  const rec = (id, meta) => makeRecord({ ...base(), title: id }, { id, origin: 'mine', ...meta })
  const row = (id, owner, title = id) => ({ id, owner, updated_at: '2026-10-26T10:00:00Z', data: { ...base(), title } })

  it('uploads local work, takes cloud versions, adds shared items', () => {
    const local = [
      makeRecord(base(), { id: 'ex0', origin: 'example' }),
      rec('new', { synced: false }),
      rec('same', { synced: true }),
      rec('edited', { synced: true, dirty: true }),
      rec('gone', { synced: true }),
    ]
    const rows = [row('same', me, 'Same from cloud'), row('edited', me, 'Old cloud'), row('teach', 'teacher', 'From teacher'), row('other', me)]
    const { library, upload } = mergeLibrary(local, rows, me, { teacher: 'Anna' })
    const ids = library.map((r) => r.id)
    assert.deepEqual(ids, ['ex0', 'new', 'same', 'edited', 'other', 'teach'])
    assert.deepEqual(upload.map((r) => r.id), ['new', 'edited'])
    assert.equal(library.find((r) => r.id === 'same').title, 'Same from cloud')
    assert.equal(library.find((r) => r.id === 'edited').title, 'edited')
    const t = library.find((r) => r.id === 'teach')
    assert.equal(t.origin, 'shared')
    assert.equal(t.ownerName, 'Anna')
  })
  it('removes cloud copies on sign-out but keeps unsynced work', () => {
    const lib = [makeRecord(base(), { id: 'ex0', origin: 'example' }), rec('a', { synced: true }), rec('b', { synced: false }), makeRecord(base(), { id: 's', origin: 'shared', synced: true })]
    assert.deepEqual(libraryAfterSignOut(lib).map((r) => r.id), ['ex0', 'b'])
  })
})
