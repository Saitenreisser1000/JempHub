import { createNoteKey } from '@/domain/note'
import { FRETBOARD_HAND_POSITION } from '@/features/fretboard/config/fretboardBehavior'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function noteStart(note) {
  const start = Number(note?.gridIndex)
  return Number.isFinite(start) && start > 0 ? start : 1
}

function noteLength(note) {
  const length = Number(note?.lengthBlocks)
  return Number.isFinite(length) && length > 0 ? length : 1
}

function noteEnd(note) {
  return noteStart(note) + noteLength(note)
}

function noteFret(note) {
  const fret = Number(note?.fret)
  return Number.isFinite(fret) && fret >= 0 ? fret : 0
}

function maxFretFromNotes(notes) {
  let max = 0
  for (const note of notes ?? []) {
    max = Math.max(max, noteFret(note))
  }
  return max
}

function noteMidi(note) {
  const midi = Number(note?.midi)
  return Number.isFinite(midi) ? midi : null
}

function collectCandidates(midi, openMidi, maxFret) {
  const candidates = []
  const targetMidi = Number(midi)
  if (!Number.isFinite(targetMidi) || !Array.isArray(openMidi)) return candidates

  for (let i = 0; i < openMidi.length; i += 1) {
    const open = Number(openMidi[i])
    if (!Number.isFinite(open)) continue
    const fret = targetMidi - open
    if (fret < 0 || fret > maxFret) continue
    candidates.push({ string: i + 1, fret, midi: targetMidi })
  }

  return candidates
}

function candidatePositionStarts(candidate, { numFrets, spanFrets }) {
  const fret = Number(candidate?.fret)
  if (!Number.isFinite(fret) || fret < 0) return [1]
  if (fret === 0) return [1]

  const maxStart = Math.max(1, numFrets - spanFrets)
  const minStart = Math.max(1, fret - spanFrets)
  const out = []
  for (let start = minStart; start <= Math.min(fret, maxStart); start += 1) out.push(start)
  return out.length ? out : [clamp(fret, 1, maxStart)]
}

function candidateFitsPosition(candidate, positionStart, spanFrets) {
  const fret = Number(candidate?.fret)
  if (!Number.isFinite(fret) || fret < 0) return false
  if (fret === 0) return true
  return fret >= positionStart && fret <= positionStart + spanFrets
}

function centerPenalty(fret, positionStart, spanFrets) {
  if (fret === 0) return 1.2
  const center = positionStart + spanFrets / 2
  return Math.abs(fret - center) * 0.45
}

function preferredStringPenalty(string) {
  const s = Number(string)
  if (!Number.isFinite(s)) return 0
  if (s === 1) return 1.6
  if (s === 2) return 0.8
  return 0
}

function transitionPenalty(prev, next, pitchDelta) {
  if (!prev) return 0
  const fretMove = Math.abs(Number(next?.fret) - Number(prev?.fret))
  const stringMove = Math.abs(Number(next?.string) - Number(prev?.string))
  let cost = fretMove * 0.28 + stringMove * 0.9

  if (stringMove === 0 && fretMove > 3) cost += 2.6
  if (stringMove === 1 && fretMove <= 3) cost -= 0.75
  if (Number(pitchDelta) > 0 && Number(next?.string) < Number(prev?.string) && fretMove <= 4) cost -= 0.35
  if (Number(pitchDelta) < 0 && Number(next?.string) > Number(prev?.string) && fretMove <= 4) cost -= 0.35

  return cost
}

function choosePositionSequence(notes, openMidi, numFrets, spanFrets) {
  const statesByIndex = []

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]
    const midi = noteMidi(note)
    const candidates = collectCandidates(midi, openMidi, numFrets)
    if (!candidates.length) {
      statesByIndex.push(new Map([[1, { cost: 0, prevStart: null }]]))
      continue
    }

    const starts = new Set()
    for (const candidate of candidates) {
      for (const start of candidatePositionStarts(candidate, { numFrets, spanFrets })) starts.add(start)
    }

    const prevStates = statesByIndex[index - 1]
    const stateMap = new Map()
    for (const start of starts) {
      const playable = candidates.filter((candidate) => candidateFitsPosition(candidate, start, spanFrets))
      if (!playable.length) continue

      const notePenalty = Math.min(...playable.map((candidate) => centerPenalty(candidate.fret, start, spanFrets)))
      if (!prevStates) {
        stateMap.set(start, { cost: notePenalty, prevStart: null })
        continue
      }

      let bestCost = Infinity
      let bestPrevStart = null
      const gap = index > 0 ? noteStart(note) - noteEnd(notes[index - 1]) : 0
      for (const [prevStart, prevState] of prevStates.entries()) {
        const shift = Math.abs(start - prevStart)
        const shiftPenalty = gap >= 2 ? shift * 0.45 : (start === prevStart ? 0 : 2.2 + shift * 1.1)
        const cost = prevState.cost + shiftPenalty + notePenalty
        if (cost < bestCost) {
          bestCost = cost
          bestPrevStart = prevStart
        }
      }
      stateMap.set(start, { cost: bestCost, prevStart: bestPrevStart })
    }
    statesByIndex.push(stateMap)
  }

  if (!statesByIndex.length) return []
  const lastStates = statesByIndex[statesByIndex.length - 1]
  if (!lastStates.size) return notes.map(() => 1)

  let bestStart = null
  let bestCost = Infinity
  for (const [start, state] of lastStates.entries()) {
    if (state.cost < bestCost) {
      bestCost = state.cost
      bestStart = start
    }
  }

  const positions = new Array(notes.length).fill(1)
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    positions[index] = bestStart ?? 1
    const state = statesByIndex[index]?.get(bestStart)
    bestStart = state?.prevStart ?? bestStart
  }
  return positions
}

function assignCandidatesToPositions(notes, positionStarts, openMidi, numFrets, spanFrets) {
  const assigned = []
  let prevCandidate = null

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]
    const start = Number(positionStarts[index]) || 1
    const midi = noteMidi(note)
    const candidates = collectCandidates(midi, openMidi, numFrets)
      .filter((candidate) => candidateFitsPosition(candidate, start, spanFrets))

    if (!candidates.length) {
      assigned.push({ ...note })
      prevCandidate = null
      continue
    }

    const pitchDelta =
      index > 0 && noteMidi(notes[index - 1]) != null && midi != null
        ? midi - noteMidi(notes[index - 1])
        : 0

    let best = candidates[0]
    let bestCost = Infinity
    for (const candidate of candidates) {
      const cost =
        centerPenalty(candidate.fret, start, spanFrets) +
        preferredStringPenalty(candidate.string) +
        transitionPenalty(prevCandidate, candidate, pitchDelta)
      if (cost < bestCost) {
        bestCost = cost
        best = candidate
      }
    }

    assigned.push({
      ...note,
      string: best.string,
      fret: best.fret,
    })
    prevCandidate = best
  }

  return assigned
}

function buildPositionLabel(notes, { numFrets, spanFrets }) {
  if (!notes.length) return '1-4'

  const frets = notes.map((note) => noteFret(note))
  const avgFret = frets.reduce((sum, fret) => sum + fret, 0) / frets.length
  const maxStart = Math.max(1, numFrets - spanFrets)
  const fromFret = clamp(Math.round(avgFret) - 1, 1, maxStart)
  const toFret = clamp(fromFret + spanFrets, fromFret, numFrets)
  return `${fromFret}-${toFret}`
}

function createHandPositionSegment(notes, { numFrets, spanFrets }) {
  if (!notes.length) return null

  const start = noteStart(notes[0])
  const end = notes.reduce((max, note) => Math.max(max, noteEnd(note)), start)
  const lengthBlocks = Math.max(0.25, Number((end - start).toFixed(3)))

  return {
    key: `hp_${createNoteKey()}`,
    fret: buildPositionLabel(notes, { numFrets, spanFrets }),
    string: 0,
    color: '#9A7B4F',
    gridIndex: Number(start.toFixed(3)),
    lengthBlocks,
  }
}

export function planImportedFretboardLayout(notes, { numFrets = 12, openMidi = [] } = {}) {
  const normalizedNotes = [...(notes ?? [])]
    .filter((note) => Number.isFinite(Number(note?.gridIndex)))
    .sort((a, b) => {
      const gridDiff = noteStart(a) - noteStart(b)
      if (gridDiff !== 0) return gridDiff
      return noteFret(a) - noteFret(b)
    })

  const requiredNumFrets = Math.max(Number(numFrets) || 12, maxFretFromNotes(normalizedNotes))
  const positionSpanFrets = Number(FRETBOARD_HAND_POSITION.suggestedSpanFrets) || 3
  const maxWindowWidth = positionSpanFrets + 1
  const gapThresholdBlocks = 2

  const positionedNotes = Array.isArray(openMidi) && openMidi.length
    ? assignCandidatesToPositions(
      normalizedNotes,
      choosePositionSequence(normalizedNotes, openMidi, requiredNumFrets, positionSpanFrets),
      openMidi,
      requiredNumFrets,
      positionSpanFrets,
    )
    : normalizedNotes

  const handPositions = []
  let segment = []
  let segMin = Infinity
  let segMax = -Infinity
  let segEnd = 0

  for (const note of positionedNotes) {
    const fret = noteFret(note)
    const start = noteStart(note)
    const end = noteEnd(note)

    if (!segment.length) {
      segment = [note]
      segMin = fret
      segMax = fret
      segEnd = end
      continue
    }

    const nextMin = Math.min(segMin, fret)
    const nextMax = Math.max(segMax, fret)
    const nextWidth = nextMax - nextMin + 1
    const hasGap = start - segEnd >= gapThresholdBlocks

    if (hasGap || nextWidth > maxWindowWidth) {
      const handPosition = createHandPositionSegment(segment, {
        numFrets: requiredNumFrets,
        spanFrets: positionSpanFrets,
      })
      if (handPosition) handPositions.push(handPosition)

      segment = [note]
      segMin = fret
      segMax = fret
      segEnd = end
      continue
    }

    segment.push(note)
    segMin = nextMin
    segMax = nextMax
    segEnd = Math.max(segEnd, end)
  }

  const lastHandPosition = createHandPositionSegment(segment, {
    numFrets: requiredNumFrets,
    spanFrets: positionSpanFrets,
  })
  if (lastHandPosition) handPositions.push(lastHandPosition)

  return {
    notes: positionedNotes,
    handPositions,
    requiredNumFrets,
  }
}
