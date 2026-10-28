// Noten aus Guitar Pro / MusicXML (eingelesen von alphaTab) in eine
// GuitarJemp-Übung umwandeln. Arbeitet nur mit dem Datenmodell von alphaTab
// (Score → Track → Staff → Bar → Voice → Beat → Note), ohne Darstellung.

import { TPQ, SKY, TUNINGS } from './constants.js'

const AT_TPQ = 960 // alphaTab: Ticks je Viertel
const majorRoot = (ks) => (((ks * 7) % 12) + 12) % 12

// Saiten des Staffs, höchste zuerst (wie in GuitarJemp)
function stringsOf(staff) {
  const t = (staff && ((staff.stringTuning && staff.stringTuning.tunings) || staff.tuning)) || []
  const arr = Array.from(t)
  return arr.length > 1 && arr[0] < arr[arr.length - 1] ? arr.reverse() : arr
}

export function listTracks(score) {
  return (score.tracks || [])
    .map((tr, index) => {
      const st = tr.staves && tr.staves[0]
      const strings = stringsOf(st).length
      return { index, name: tr.name || 'Track ' + (index + 1), strings, ok: !!st && !st.isPercussion && strings >= 4 && strings <= 8 }
    })
    .filter((t) => t.ok)
}

export function scoreInfo(score) {
  return { title: score.title || '', artist: score.artist || '', bars: (score.masterBars || []).length, tracks: listTracks(score) }
}

function finger(f) {
  if (f === 0) return 'T'
  return f >= 1 && f <= 4 ? f : null
}

// from/to: Taktnummern ab 1, beide einschließlich
export function scoreToExercise(score, { track = 0, from = 1, to = Infinity, title } = {}) {
  const tr = score.tracks[track]
  if (!tr) throw new Error('Track not found.')
  const staff = tr.staves[0]
  const tuning = stringsOf(staff)
  const n = tuning.length
  if (n < 4) throw new Error('This track has no tab strings.')
  const bars = staff.bars || []
  const a = Math.max(1, from) - 1
  const b = Math.min(bars.length, to)
  if (a >= b) throw new Error('No bars in this range.')

  // Saite in GuitarJemp (0 = höchste). alphaTab zählt ab der tiefsten Saite;
  // wo die Tonhöhe bekannt ist, wird das gegengeprüft.
  const sOf = (note) => {
    const s1 = n - note.string
    if (typeof note.realValue === 'number' && tuning[s1] + note.fret !== note.realValue) {
      const s2 = note.string - 1
      if (tuning[s2] + note.fret === note.realValue) return s2
    }
    return s1
  }

  const moments = []
  const slideFrom = new Set() // Saiten, deren letzter Ton in den nächsten rutscht
  for (let bi = a; bi < b; bi++) {
    const voice = bars[bi].voices && bars[bi].voices[0]
    if (!voice) continue
    for (const beat of voice.beats || []) {
      if (beat.graceType) continue
      const dur = Math.max(1, Math.round(((beat.playbackDuration || beat.displayDuration || AT_TPQ) * TPQ) / AT_TPQ))
      const notes = beat.isRest ? [] : (beat.notes || []).filter((x) => !x.isDead)
      if (notes.length && notes.every((x) => x.isTieDestination)) {
        // nur gehaltene Töne: den vorigen Moment verlängern
        if (moments.length) moments[moments.length - 1].dur += dur
        continue
      }
      const dots = []
      const nextSlide = new Set()
      for (const x of notes) {
        if (x.isTieDestination) continue
        const s = sOf(x)
        if (s < 0 || s >= n || dots.some((d) => d.s === s)) continue
        let t = null
        if (x.isHammerPullDestination) {
          const o = x.hammerPullOrigin
          t = o && o.fret > x.fret ? 'p' : 'h'
        } else if (x.slideOrigin || slideFrom.has(s)) t = 'sl'
        else if (x.hasBend || x.bendType > 0) t = 'b'
        else if (x.vibrato > 0) t = '~'
        if (x.slideOutType === 1 || x.slideOutType === 2) nextSlide.add(s)
        dots.push({ s, f: x.fret, fg: finger(x.leftHandFinger), t })
      }
      slideFrom.clear()
      nextSlide.forEach((s) => slideFrom.add(s))
      const bt = beat.brushType
      const strum = dots.length > 1 ? (bt === 1 || bt === 3 ? 'u' : bt === 2 || bt === 4 ? 'd' : null) : null
      moments.push({ dur, dots, color: null, strum, note: null })
    }
  }
  if (!moments.some((m) => m.dots.length)) throw new Error('No notes in this range.')

  const mb = (score.masterBars || [])[a] || {}
  const ks = mb.keySignature || 0
  const key = mb.keySignatureType === 1 ? { r: (majorRoot(ks) + 9) % 12, m: 'minor' } : { r: majorRoot(ks), m: 'major' }
  const ts = [mb.timeSignatureNumerator || 4, mb.timeSignatureDenominator || 4]
  const bass = n <= 5 && tuning[0] < 60
  const name = title || score.title || 'Imported tab'
  const range = b - a < bars.length ? ' (bars ' + (a + 1) + '–' + b + ')' : ''
  return {
    id: 'u' + Date.now(),
    title: name + range,
    type: 'Imported',
    tag: [score.artist, tr.name].filter(Boolean).join(' · ') || 'Imported',
    desc: '',
    inst: bass ? 'bass' : 'guitar',
    tuning,
    tuningName: (TUNINGS.find((t) => t.notes.join() === tuning.join()) || { name: 'Custom' }).name,
    key,
    bpm: Math.round(score.tempo || 100),
    ts,
    color: SKY,
    moments,
  }
}
