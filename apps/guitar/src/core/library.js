// Library records = exercise content + bookkeeping about where it lives.
//
//   origin  'example' (built-in, local only) | 'mine' (yours, synced when signed in)
//           | 'shared' (someone shared it with you, read-only)
//   synced  the cloud has had a version of this record
//   dirty   there are local changes the cloud has not seen yet
import { sanitizeExercise, isId } from './sanitize.js'

const META = ['id', 'origin', 'synced', 'dirty', 'owner', 'ownerName', 'updatedAt']

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 15) | 64
  b[8] = (b[8] & 63) | 128
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20)
}

export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export function content(rec) {
  const out = {}
  for (const k of Object.keys(rec)) if (!META.includes(k)) out[k] = rec[k]
  return out
}

export function makeRecord(exercise, meta) {
  const clean = sanitizeExercise(exercise)
  if (!clean) return null
  return Object.assign(clean, {
    id: meta.id,
    origin: meta.origin,
    synced: !!meta.synced,
    dirty: !!meta.dirty,
    owner: meta.owner || null,
    ownerName: meta.ownerName || null,
    updatedAt: meta.updatedAt || null,
  })
}

// Records stored in this browser, including data saved before cloud support existed.
export function fromStorage(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((r) => {
      if (!r || typeof r !== 'object') return null
      const legacyExample = !r.origin && typeof r.id === 'string' && /^ex\d+$/.test(r.id)
      const origin = r.origin === 'shared' || r.origin === 'example' || r.origin === 'mine' ? r.origin : legacyExample ? 'example' : 'mine'
      const id = origin === 'mine' ? (isUuid(r.id) ? r.id : uuid()) : isId(r.id) ? r.id : uuid()
      return makeRecord(r, { ...r, id, origin })
    })
    .filter(Boolean)
}

export function toCloudRow(rec) {
  const data = content(rec)
  return { id: rec.id, title: rec.title, data }
}

export function fromCloudRow(row, userId, names = {}) {
  const mine = row.owner === userId
  return makeRecord(row.data, {
    id: row.id,
    origin: mine ? 'mine' : 'shared',
    synced: true,
    dirty: false,
    owner: row.owner,
    ownerName: mine ? null : names[row.owner] || null,
    updatedAt: row.updated_at || null,
  })
}

// Combine the local library with what the cloud returned after signing in or refreshing.
// Returns the new library and the records that still need uploading.
export function mergeLibrary(local, rows, userId, names = {}) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const examples = local.filter((r) => r.origin === 'example')
  const localMine = local.filter((r) => r.origin === 'mine')
  const mine = []
  const upload = []
  for (const r of localMine) {
    const row = byId.get(r.id)
    if (row && row.owner === userId) {
      if (r.dirty) {
        mine.push(r)
        upload.push(r)
      } else {
        const rec = fromCloudRow(row, userId, names)
        if (rec) mine.push(rec)
      }
      byId.delete(r.id)
    } else if (!r.synced || r.dirty) {
      // Never uploaded, or changed offline after its cloud copy disappeared: keep and upload.
      mine.push(r)
      upload.push(r)
    }
    // synced, unchanged and gone from the cloud: deleted elsewhere, drop it.
  }
  const shared = []
  for (const row of byId.values()) {
    const rec = fromCloudRow(row, userId, names)
    if (!rec) continue
    if (rec.origin === 'mine') mine.push(rec)
    else shared.push(rec)
  }
  return { library: examples.concat(mine, shared), upload }
}

// On sign-out the cloud copies leave this browser; unsynced work stays.
export function libraryAfterSignOut(local) {
  return local.filter((r) => r.origin === 'example' || (r.origin === 'mine' && !r.synced))
}
