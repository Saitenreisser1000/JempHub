import { TPQ, DUR_NAMES } from './constants.js'

// Dot: one physical position on the instrument (string + fret), plus optional
// finger (fg) and technique (t) for this occurrence.
export function n(s, f, fg, t) {
  return { s, f, fg: fg == null ? null : fg, t: t || null }
}

// Moment: one musical event in time. No dots = rest, one = single note,
// several = notes that sound together.
export function mo(dur, dots, color, o = {}) {
  return {
    dur,
    dots: (dots || []).map((d) => ({ ...d })),
    color: color || null,
    strum: o.st || null,
    note: o.n || null,
  }
}

// Identity of a moment's physical shape, independent of when it occurs.
export function setKey(m) {
  return m.dots.map((d) => d.s + ':' + d.f).sort().join(',')
}

export function onsets(moments) {
  const on = []
  let t = 0
  for (const m of moments) {
    on.push(t)
    t += m.dur
  }
  on.total = t
  return on
}

export function barTicks(ts) {
  return (ts[0] * TPQ * 4) / ts[1]
}

export function durName(t) {
  return DUR_NAMES[t] || t / TPQ + ' beats'
}

export function durFromSpec({ base, dot, trip }) {
  let t = base
  if (dot) t *= 1.5
  if (trip) t = (t * 2) / 3
  return Math.round(t)
}

export function decodeDur(t) {
  for (const b of [6, 12, 24, 48, 96]) {
    if (t === b) return { base: b, dot: false, trip: false }
    if (t === b * 1.5) return { base: b, dot: true, trip: false }
    if (Math.abs(t - (b * 2) / 3) < 0.01) return { base: b, dot: false, trip: true }
  }
  return null
}

const SUBS = { 0: '', 6: 'e', 12: '&', 18: 'a', 8: 'trip', 16: 'let' }
export function posLabel(t, ts) {
  const bt = barTicks(ts)
  const bar = Math.floor(t / bt) + 1
  const ib = t % bt
  const beat = Math.floor(ib / TPQ) + 1
  const sub = ib % TPQ
  return bar + ' · ' + beat + (sub ? (SUBS[sub] !== undefined ? SUBS[sub] : '+') : '')
}

export function momentAt(moments, on, t) {
  for (let i = 0; i < moments.length; i++) if (t >= on[i] && t < on[i] + moments[i].dur) return i
  return -1
}

// Next / previous moment that actually sounds (skips rests) within a play order.
export function nextSounding(moments, i, order, wrap) {
  const idx = order.indexOf(i)
  for (let k = 1; k <= order.length; k++) {
    let j = idx + k
    if (j >= order.length) {
      if (!wrap) return -1
      j -= order.length
    }
    if (moments[order[j]].dots.length) return order[j]
  }
  return -1
}

export function prevSounding(moments, i, order, wrap) {
  const idx = order.indexOf(i)
  for (let k = 1; k <= order.length; k++) {
    let j = idx - k
    if (j < 0) {
      if (!wrap) return -1
      j += order.length
    }
    if (moments[order[j]].dots.length) return order[j]
  }
  return -1
}

export function isValidExercise(e) {
  return !!e && Array.isArray(e.moments) && Array.isArray(e.tuning) && Array.isArray(e.ts)
}

// Moment von Position from an Position to verschieben (to = Index im Ergebnis). Gibt to zurück.
export function moveMoment(moments, from, to) {
  to = Math.max(0, Math.min(moments.length - 1, to))
  if (from === to || from < 0 || from >= moments.length) return from
  const [m] = moments.splice(from, 1)
  moments.splice(to, 0, m)
  return to
}

// Einfügestelle für einen gezogenen Moment an Zeitpunkt t (Ticks): vor dem Moment,
// dessen Mitte rechts von t liegt. Liefert den Index vor dem Entfernen des gezogenen Moments.
export function dropIndex(moments, on, t) {
  for (let i = 0; i < moments.length; i++) if (t < on[i] + moments[i].dur / 2) return i
  return moments.length
}

// Länge beim Ziehen am rechten Rand: auf Sechzehntel (6 Ticks) runden, 1/16 bis 2 ganze Takte
export function snapDur(ticks, grid = 6) {
  return Math.max(grid, Math.min(192, Math.round(ticks / grid) * grid))
}

// Can the dot at `from` move to `to` in every listed moment? A string holds
// only one note per moment, so the target string must be free (apart from the
// moving dot itself).
export function canMoveDot(moments, list, from, to) {
  if (from.s === to.s && from.f === to.f) return false
  return list.every((i) => {
    const m = moments[i]
    if (!m || !m.dots.some((d) => d.s === from.s && d.f === from.f)) return false
    return !m.dots.some((d) => d.s === to.s && !(d.s === from.s && d.f === from.f))
  })
}

// Move the dot at `from` to `to` in every listed moment (finger and technique
// travel with it). Returns false and changes nothing if the move is not allowed.
export function moveDot(moments, list, from, to) {
  if (!canMoveDot(moments, list, from, to)) return false
  for (const i of list) {
    const d = moments[i].dots.find((q) => q.s === from.s && q.f === from.f)
    d.s = to.s
    d.f = to.f
  }
  return true
}
