import { getTuning } from '@/domain/music/tunings'
import { midiForNote } from '@/domain/music/pitch'

export const EXCHANGE_TICKS_PER_BLOCK = 48

function safeNumber(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function buildExchangeClip({ notes, instrument, transport, settings } = {}) {
  const tuning = getTuning(instrument?.tuningId)
  const activeNotes = Array.isArray(notes) ? notes : []
  const normalized = []

  for (const note of activeNotes) {
    const midi = midiForNote(note, tuning)
    if (!Number.isFinite(Number(midi))) continue

    const gridIndex = Math.max(1, safeNumber(note?.gridIndex, 1))
    const lengthBlocks = Math.max(0.01, safeNumber(note?.lengthBlocks, 1))

    normalized.push({
      key: String(note?.key ?? ''),
      string: Math.max(1, safeNumber(note?.string, 1)),
      fret: Math.max(0, safeNumber(note?.fret, 0)),
      color: typeof note?.color === 'string' ? note.color : '',
      noteValue: typeof note?.noteValue === 'string' ? note.noteValue : '',
      subdivision: Number(note?.subdivision) === 3 ? 3 : 2,
      gridIndex,
      lengthBlocks,
      midi: Number(midi),
    })
  }

  normalized.sort((a, b) => {
    if (a.gridIndex !== b.gridIndex) return a.gridIndex - b.gridIndex
    if (a.string !== b.string) return a.string - b.string
    return a.fret - b.fret
  })

  return {
    title: 'GuitarJemp Export',
    tempo: Math.max(20, safeNumber(transport?.tempo, 120)),
    beatTop: Math.max(1, Math.floor(safeNumber(settings?.beatTop, 4))),
    beatBottom: [1, 2, 4, 8, 16].includes(Number(settings?.beatBottom))
      ? Number(settings.beatBottom)
      : 4,
    instrumentType: String(instrument?.instrumentType || 'guitar'),
    tuningId: String(instrument?.tuningId || ''),
    numStrings: Math.max(1, Math.floor(safeNumber(instrument?.numStrings, 6))),
    ticksPerBlock: EXCHANGE_TICKS_PER_BLOCK,
    notes: normalized,
  }
}
