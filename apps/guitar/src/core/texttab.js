// Text-Tabs (wie auf Tab-Websites) in GuitarJemp-Momente umwandeln.
//
//   e|-----0-----|      Eine Zeile pro Saite, oben die höchste.
//   B|---1---1---|      Übereinanderstehende Zahlen werden ein Griff.
//   G|-2-------2-|      h p / \ s b ~ werden zu Techniken.
//
// Text-Tabs haben meist keinen Rhythmus. Die Länge eines Moments wird aus dem
// Abstand zur nächsten Zahl geschätzt (innerhalb eines Takts anteilig) und auf
// einen Notenwert gerundet; korrigieren lässt sie sich danach in der Zeitleiste.

import { STD, BASS4, TUNINGS } from './constants.js'

const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
// Notenwerte, auf die geschätzte Längen gerundet werden (Ticks, 24 je Viertel)
export const NICE_DURS = [6, 12, 18, 24, 36, 48, 72, 96]  // ohne Triolen: die lassen sich aus Abständen nicht erkennen

export function nearestDur(t) {
  if (!(t > 0)) return 12
  let best = NICE_DURS[0]
  for (const d of NICE_DURS) if (Math.abs(Math.log(d / t)) < Math.abs(Math.log(best / t))) best = d
  return best
}

const LABEL = /^\s*([A-Ga-g][#b♯♭]?)\s*(?=[|:\-\d])/
function isTabLine(line) {
  const body = line.replace(LABEL, '')
  if (!/^[\s|:\-\d hpbrstx/\\~()<>^v.*=+]*$/i.test(body)) return false
  const dashes = (body.match(/-/g) || []).length
  return dashes >= 4 && dashes >= body.trim().length * 0.2
}

function labelPc(line) {
  const m = line.match(LABEL)
  if (!m) return null
  const l = m[1]
  let pc = PC[l[0].toLowerCase()]
  if (/[#♯]/.test(l.slice(1))) pc += 1
  if (/[b♭]/.test(l.slice(1))) pc -= 1
  return (pc + 12) % 12
}

function guessTuning(pcs, n) {
  const fallback = n === 4 ? { notes: BASS4, name: 'Bass standard' } : { notes: STD.slice(0, n), name: 'Standard' }
  if (pcs.some((p) => p == null)) return { ...fallback, guessed: pcs.every((p) => p == null) ? false : true }
  const hit = TUNINGS.find((t) => t.notes.length === n && t.notes.every((m, i) => m % 12 === pcs[i]))
  if (hit) return { notes: hit.notes.slice(), name: hit.name }
  // Unbekannte Stimmung: jede Saite so nah wie möglich an der Standardstimmung
  const ref = n === 4 ? BASS4 : n === 6 ? STD : STD.slice(0, n)
  const notes = pcs.map((pc, i) => {
    const r = ref[Math.min(i, ref.length - 1)]
    for (let k = 0; k <= 6; k++) {
      if ((r - k) % 12 === pc) return r - k
      if ((r + k) % 12 === pc) return r + k
    }
    return r
  })
  return { notes, name: 'Custom' }
}

// Eine Gruppe aufeinanderfolgender Tab-Zeilen (ein "System") lesen.
function readSystem(lines) {
  const rows = lines.map((l) => l.replace(LABEL, '').replace(/^[|:]/, ''))
  const L = Math.max(...rows.map((r) => r.length))
  const pad = rows.map((r) => r.padEnd(L, '-'))
  const events = new Map() // Spalte -> [{s,f,t}]
  pad.forEach((row, s) => {
    for (let c = 0; c < L; c++) {
      if (!/\d/.test(row[c]) || (c > 0 && /\d/.test(row[c - 1]))) continue
      let e = c
      while (e + 1 < L && /\d/.test(row[e + 1]) && e - c < 1) e++
      const f = parseInt(row.slice(c, e + 1), 10)
      if (f > 24) continue
      const before = row[c - 1] || '-'
      const after = row[e + 1] || '-'
      let t = null
      if (/h/i.test(before)) t = 'h'
      else if (/p/i.test(before)) t = 'p'
      else if (/[/\\s]/.test(before)) t = 'sl'
      if (/b/i.test(after)) t = 'b'
      else if (/[~v]/.test(after)) t = '~'
      if (!events.has(c)) events.set(c, [])
      events.get(c).push({ s, f, t })
    }
  })
  // Zweistellige Zahlen sind manchmal rechtsbündig gesetzt: direkt benachbarte
  // Spalten ohne gemeinsame Saite zu einem Griff zusammenfassen.
  const cols = [...events.keys()].sort((a, b) => a - b)
  const merged = []
  for (const c of cols) {
    const prev = merged[merged.length - 1]
    const dots = events.get(c)
    if (prev && c - prev.c === 1 && !dots.some((d) => prev.dots.some((p) => p.s === d.s))) prev.dots.push(...dots)
    else merged.push({ c, dots: dots.slice() })
  }
  // Taktstriche: Spalten, in denen die meisten Zeilen einen | haben
  const bars = []
  for (let c = 0; c < L; c++) if (pad.filter((r) => r[c] === '|').length >= Math.ceil(pad.length / 2) && !pad.some((r) => /\d/.test(r[c]))) bars.push(c)
  return { events: merged, bars, width: L }
}

function durations(sys, barTicks) {
  const { events, bars, width } = sys
  const out = []
  if (!events.length) return out
  const edges = [0, ...bars.filter((b) => b > 0 && b < width - 1), width]
  const gaps = events.map((ev, i) => (i + 1 < events.length ? events[i + 1].c : width) - ev.c)
  if (bars.length) {
    for (let b = 0; b + 1 < edges.length; b++) {
      const inBar = events.map((ev, i) => [ev, i]).filter(([ev]) => ev.c >= edges[b] && ev.c < edges[b + 1])
      if (!inBar.length) continue
      const g = inBar.map(([ev, i]) => Math.min(gaps[i], edges[b + 1] - ev.c))
      const sum = g.reduce((a, x) => a + x, 0)
      inBar.forEach(([, i], k) => (out[i] = nearestDur((g[k] / sum) * barTicks)))
    }
  }
  // Ohne Taktstriche: der häufigste Abstand gilt als Achtel
  const sorted = gaps.slice().sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] || 1
  events.forEach((ev, i) => {
    if (out[i] == null) out[i] = nearestDur((gaps[i] / median) * 12)
  })
  return out
}

export function parseTextTab(text, { barTicks = 96 } = {}) {
  const lines = String(text || '').replace(/\r/g, '').replace(/\t/g, '    ').split('\n')
  const systems = []
  let cur = []
  for (const line of lines) {
    if (isTabLine(line)) cur.push(line)
    else {
      if (cur.length) systems.push(cur)
      cur = []
    }
  }
  if (cur.length) systems.push(cur)
  const usable = systems.filter((s) => s.length >= 4 && s.length <= 8)
  if (!usable.length) throw new Error('No tab found. Paste lines like  e|---0---3---|  one per string.')
  // Die häufigste Saitenzahl gewinnt; abweichende Blöcke werden übersprungen
  const counts = {}
  usable.forEach((s) => (counts[s.length] = (counts[s.length] || 0) + 1))
  const n = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  const blocks = usable.filter((s) => s.length === n)
  const warnings = []
  if (blocks.length < usable.length) warnings.push('Skipped ' + (usable.length - blocks.length) + ' block(s) with a different number of strings.')
  const tuning = guessTuning(blocks[0].map(labelPc), n)
  if (tuning.guessed) warnings.push('Could not read every string name; assumed ' + tuning.name + ' tuning.')
  const moments = []
  for (const b of blocks) {
    const sys = readSystem(b)
    const durs = durations(sys, barTicks)
    sys.events.forEach((ev, i) => {
      const dots = []
      ev.dots.forEach((d) => {
        if (!dots.some((q) => q.s === d.s)) dots.push({ s: d.s, f: d.f, fg: null, t: d.t })
      })
      moments.push({ dur: durs[i], dots, color: null, strum: null, note: null })
    })
  }
  if (!moments.length) throw new Error('The tab contains no fret numbers.')
  warnings.push('Rhythm was estimated from the spacing. Check the lengths in the time strip.')
  return { tuning: tuning.notes, tuningName: tuning.name, moments, warnings }
}
