// Aufgaben-Generatoren der drei Übungen. Reine Funktionen: Einstellungen,
// vorige Aufgabe und eine Gewichtung rein, neue Aufgabe raus.
import {
  CLEFS, LETTERS, SHARPABLE, FLATTABLE, METERS, VALUE_OF_DUR,
  letterOf, midiOf, noteName, pick, rand, shuffle, weightedPick, valueLabel, beatsText,
} from './music.js'

const flat = () => 1

// ---------------------------------------------------------------- Noten bestimmen

export const NOTE_DEFAULTS = { clef: 'treble', range: 1, accidentals: false, length: 10, focus: true }
export const NOTE_RANGES = { 0: [0, 8], 1: [-2, 10], 2: [-5, 13] }

export const noteKey = (q) => `n:${q.clef}:${q.pos}:${q.acc}`

export function noteCandidates(settings) {
  const clefs = settings.clef === 'both' ? ['treble', 'bass'] : [settings.clef]
  const [lo, hi] = NOTE_RANGES[settings.range] ?? NOTE_RANGES[1]
  const out = []
  for (const clef of clefs) {
    for (let pos = lo; pos <= hi; pos++) {
      const letter = letterOf(clef, pos)
      out.push({ clef, pos, letter, acc: 0, share: 1 })
      if (settings.accidentals) {
        const accs = []
        if (SHARPABLE.includes(letter)) accs.push(1)
        if (FLATTABLE.includes(letter)) accs.push(-1)
        for (const acc of accs) out.push({ clef, pos, letter, acc, share: 1 / accs.length })
      }
    }
  }
  return out
}

export function genNote(settings, prev, weight = flat) {
  const all = noteCandidates(settings)
  const pool = prev ? all.filter((c) => !(c.clef === prev.clef && c.pos === prev.pos)) : all
  const c = weightedPick(pool.length ? pool : all, (x) => x.share * weight(noteKey(x)))
  return {
    type: 'note', clef: c.clef, pos: c.pos, letter: c.letter, acc: c.acc,
    midi: midiOf(c.clef, c.pos, c.acc),
    name: noteName(c.letter, c.acc),
  }
}

export function checkNote(q, answer) {
  return answer.letter === q.letter && (answer.acc ?? 0) === q.acc
}

export const NOTE_LETTERS = LETTERS

// ---------------------------------------------------------------- Notenwerte & Pausen

export const VALUE_DEFAULTS = { kind: 'both', level: 1, dotted: false, length: 10, focus: true }
export const VALUE_LEVELS = { 0: [16, 8, 4], 1: [16, 8, 4, 2], 2: [16, 8, 4, 2, 1] }

export const valueKey = (q) => `v:${q.kind}:${q.base}:${q.dots}`

export function valueCandidates(settings) {
  const kinds = settings.kind === 'both' ? ['note', 'rest'] : [settings.kind]
  const out = []
  for (const kind of kinds)
    for (const base of VALUE_LEVELS[settings.level] ?? VALUE_LEVELS[1]) {
      out.push({ kind, base, dots: 0 })
      if (settings.dotted && base > 1) out.push({ kind, base, dots: 1 })
    }
  return out
}

export function genValue(settings, prev, weight = flat) {
  const all = valueCandidates(settings)
  const pool = prev ? all.filter((c) => valueKey(c) !== valueKey(prev)) : all
  const c = weightedPick(pool.length ? pool : all, (x) => weight(valueKey(x)))
  return {
    type: 'value', ...c, pos: 2 + rand(5),
    label: valueLabel(c.base, c.dots, c.kind),
    beats: beatsText(c.base, c.dots),
  }
}

export function checkValue(q, answer) {
  return answer.base === q.base && !!answer.dots === !!q.dots
}

// ---------------------------------------------------------------- Takte vervollständigen

export const MEASURE_DEFAULTS = { meter: '4/4', level: 1, missing: 'note', length: 10, focus: true }
export const MEASURE_LEVELS = { 0: [16, 8, 4], 1: [16, 8, 4, 2], 2: [16, 12, 8, 6, 4, 3, 2, 1] }

export const measureKey = (q) => `m:${q.meter}:${q.missing}`

function fill(total, allowed) {
  const out = []
  let left = total
  while (left > 0) {
    const fits = allowed.filter((d) => d <= left)
    if (!fits.length) return null
    const d = pick(fits)
    out.push(d)
    left -= d
  }
  return out
}

export function genMeasure(settings, prev, weight = flat) {
  const meter = settings.meter === 'mix' ? pick(Object.keys(METERS)) : settings.meter
  const bar = METERS[meter]
  const allowed = (MEASURE_LEVELS[settings.level] ?? MEASURE_LEVELS[1]).filter((d) => d <= bar)
  // Achteltakte brauchen mindestens Achtel, sonst lassen sie sich nicht füllen.
  if (meter.endsWith('/8') && !allowed.includes(2)) allowed.push(2)
  const missables = allowed.filter((d) => d < bar)
  for (let tries = 0; tries < 300; tries++) {
    const missing = weightedPick(missables, (d) => weight(measureKey({ meter, missing: d })) * (prev && prev.missing === d && tries < 50 ? 0.3 : 1))
    const rest = fill(bar - missing, allowed)
    if (!rest || rest.length < 1 || rest.length > 6) continue
    const kind = settings.missing === 'both' ? pick(['note', 'rest']) : settings.missing
    const elements = rest.map((d) => ({ type: rand(5) === 0 ? 'rest' : 'note', ...VALUE_OF_DUR[d], pos: 1 + rand(7), dur: d }))
    const at = rand(elements.length + 1)
    const options = shuffle([missing, ...shuffle(allowed.filter((d) => d !== missing)).slice(0, 3)])
    return { type: 'measure', meter, bar, missing, kind, elements, at, options, pos: 3 + rand(3) }
  }
  // Rückfall (praktisch nie nötig): Takt aus Achteln, eine Achtel fehlt
  const eighths = Array.from({ length: bar / 2 - 1 }, () => ({ type: 'note', base: 2, dots: 0, pos: 4, dur: 2 }))
  return { type: 'measure', meter, bar, missing: 2, kind: 'note', elements: eighths, at: eighths.length, options: [2, 4, 1, 8].filter((d) => d <= bar), pos: 4 }
}

export function checkMeasure(q, answer) {
  return answer.dur === q.missing
}

export function measureLabel(q, dur) {
  const v = VALUE_OF_DUR[dur]
  return valueLabel(v.base, v.dots, q.kind)
}

export const CLEF_LIST = CLEFS
