import { mapMidiToFretString } from './fretMapping'

function parseIntSafe(text, fallback) {
  const n = Number.parseInt(String(text ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function firstText(parent, selector, fallback = '') {
  const node = parent?.querySelector?.(selector)
  const text = node?.textContent
  if (text == null) return fallback
  const trimmed = String(text).trim()
  return trimmed || fallback
}

function midiFromPitch(noteEl) {
  const step = firstText(noteEl, 'pitch > step', '')
  const alter = parseIntSafe(firstText(noteEl, 'pitch > alter', '0'), 0)
  const octave = parseIntSafe(firstText(noteEl, 'pitch > octave', ''), NaN)
  if (!step || !Number.isFinite(octave)) return null

  const baseMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const base = baseMap[step]
  if (!Number.isFinite(base)) return null
  return (octave + 1) * 12 + base + alter
}

function midiFromTechnical(string, fret, openMidi) {
  const s = Number(string)
  const f = Number(fret)
  if (!Number.isFinite(s) || !Number.isFinite(f) || !Array.isArray(openMidi)) return null
  const open = Number(openMidi[s - 1])
  if (!Number.isFinite(open)) return null
  return open + f
}

export function parseMusicXmlToClip(xmlText, { openMidi = [], maxFret = 24 } = {}) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(String(xmlText || ''), 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('Invalid MusicXML file.')

  const title = firstText(doc, 'work > work-title', firstText(doc, 'movement-title', 'Import'))
  const tempo = Number.parseFloat(firstText(doc, 'direction sound[tempo], sound[tempo]', '120')) || 120
  const beatTop = parseIntSafe(firstText(doc, 'time > beats', '4'), 4)
  const beatBottom = parseIntSafe(firstText(doc, 'time > beat-type', '4'), 4)
  const divisions = Math.max(1, parseIntSafe(firstText(doc, 'divisions', '48'), 48))

  const parts = [...doc.querySelectorAll('part')]
  if (!parts.length) return { title, tempo, beatTop, beatBottom, notes: [] }

  let noteCount = 0
  const notes = []

  for (const part of parts) {
    let absoluteTick = 0
    let currentDivisions = divisions
    const measures = [...part.querySelectorAll(':scope > measure')]

    for (const measure of measures) {
      const attrDiv = parseIntSafe(firstText(measure, ':scope > attributes > divisions', ''), NaN)
      if (Number.isFinite(attrDiv) && attrDiv > 0) currentDivisions = attrDiv
      const safeDivisions = Math.max(1, currentDivisions)

      let globalTick = 0
      const voiceTicks = new Map()
      const lastChordStartByVoice = new Map()

      const children = [...measure.children]
      for (const child of children) {
        const tag = String(child?.tagName || '').toLowerCase()

        if (tag === 'backup') {
          const d = Math.max(0, parseIntSafe(firstText(child, 'duration', '0'), 0))
          globalTick = Math.max(0, globalTick - d)
          continue
        }
        if (tag === 'forward') {
          const d = Math.max(0, parseIntSafe(firstText(child, 'duration', '0'), 0))
          globalTick += d
          continue
        }
        if (tag !== 'note') continue

        const noteEl = child
        const duration = Math.max(1, parseIntSafe(firstText(noteEl, 'duration', '1'), 1))
        const voiceId = firstText(noteEl, 'voice', '1')
        const voiceTick = Number(voiceTicks.get(voiceId))
        const baseTick = Number.isFinite(voiceTick) ? voiceTick : globalTick
        const isChord = Boolean(noteEl.querySelector(':scope > chord'))
        const isRest = Boolean(noteEl.querySelector(':scope > rest'))
        const startTick = isChord
          ? Number(lastChordStartByVoice.get(voiceId) ?? baseTick)
          : baseTick

        if (!isChord) {
          lastChordStartByVoice.set(voiceId, startTick)
          const nextTick = startTick + duration
          voiceTicks.set(voiceId, nextTick)
          if (nextTick > globalTick) globalTick = nextTick
        }
        if (isRest) continue

        let string = parseIntSafe(firstText(noteEl, 'notations technical string', ''), NaN)
        let fret = parseIntSafe(firstText(noteEl, 'notations technical fret', ''), NaN)
        let midi = midiFromPitch(noteEl)

        if (!Number.isFinite(midi)) {
          midi = midiFromTechnical(string, fret, openMidi)
        }

        if (!Number.isFinite(string) || !Number.isFinite(fret)) {
          const mapped = mapMidiToFretString(midi, openMidi, { maxFret })
          if (!mapped) continue
          string = mapped.string
          fret = mapped.fret
        }

        notes.push({
          key: `mx_${absoluteTick + startTick}_${noteCount}`,
          midi,
          string,
          fret,
          gridIndex: 1 + (absoluteTick + startTick) / safeDivisions,
          lengthBlocks: duration / safeDivisions,
          subdivision: 2,
        })
        noteCount += 1
      }

      let measureTicks = globalTick
      for (const v of voiceTicks.values()) {
        const tick = Number(v)
        if (Number.isFinite(tick) && tick > measureTicks) measureTicks = tick
      }
      absoluteTick += Math.max(0, measureTicks)
    }
  }

  notes.sort((a, b) => {
    if (a.gridIndex !== b.gridIndex) return a.gridIndex - b.gridIndex
    if (a.string !== b.string) return a.string - b.string
    return a.fret - b.fret
  })

  return { title, tempo, beatTop, beatBottom, notes }
}
