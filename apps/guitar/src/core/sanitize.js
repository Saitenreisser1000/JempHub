// Exercises can arrive from other people (shared via the cloud) or from old
// browser storage. Everything is rebuilt from known fields with checked types,
// so nothing unexpected reaches the SVG markup or the app state.
import { TECH } from './constants.js'

export const MAX_FRET = 15
const HEX = /^#[0-9a-f]{6}$/i
const ID = /^[\w-]{1,64}$/

const str = (v, max, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback)
const optStr = (v, max) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null)
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null)
const color = (v) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : null)

export function sanitizeDot(d, strings) {
  if (!d || typeof d !== 'object') return null
  const s = int(d.s, 0, strings - 1)
  const f = int(d.f, 0, MAX_FRET)
  if (s === null || f === null) return null
  const fg = d.fg === 'T' ? 'T' : int(d.fg, 1, 4)
  const t = typeof d.t === 'string' && Object.hasOwn(TECH, d.t) ? d.t : null
  return { s, f, fg, t }
}

export function sanitizeMoment(m, strings) {
  if (!m || typeof m !== 'object') return null
  const dur = int(m.dur, 1, 384)
  if (dur === null) return null
  const dots = []
  const used = new Set()
  for (const raw of Array.isArray(m.dots) ? m.dots.slice(0, strings) : []) {
    const d = sanitizeDot(raw, strings)
    if (d && !used.has(d.s)) {
      used.add(d.s)
      dots.push(d)
    }
  }
  return {
    dur,
    dots,
    color: color(m.color),
    strum: m.strum === 'd' || m.strum === 'u' ? m.strum : null,
    note: optStr(m.note, 300),
  }
}

export function sanitizeExercise(e) {
  if (!e || typeof e !== 'object' || !Array.isArray(e.moments) || !Array.isArray(e.tuning)) return null
  const tuning = e.tuning.slice(0, 8).map((x) => int(x, 0, 127))
  if (tuning.length < 4 || tuning.some((x) => x === null)) return null
  const ts = Array.isArray(e.ts) ? e.ts : [4, 4]
  const num = int(ts[0], 1, 16)
  const den = [1, 2, 4, 8, 16].includes(ts[1]) ? ts[1] : null
  const key = e.key && typeof e.key === 'object' && int(e.key.r, 0, 11) !== null && (e.key.m === 'major' || e.key.m === 'minor')
    ? { r: e.key.r, m: e.key.m }
    : null
  return {
    title: str(e.title, 200, 'Untitled exercise') || 'Untitled exercise',
    type: str(e.type, 40, 'Custom'),
    tag: str(e.tag, 80, ''),
    desc: str(e.desc, 1000, ''),
    inst: e.inst === 'bass' ? 'bass' : 'guitar',
    tuning,
    tuningName: str(e.tuningName, 40, 'Custom'),
    key,
    bpm: int(e.bpm, 30, 260) ?? 80,
    ts: num && den ? [num, den] : [4, 4],
    color: color(e.color),
    moments: e.moments.slice(0, 4000).map((m) => sanitizeMoment(m, tuning.length)).filter(Boolean),
  }
}

export const isId = (v) => typeof v === 'string' && ID.test(v)
