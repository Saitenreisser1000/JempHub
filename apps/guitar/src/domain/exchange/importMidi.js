import { mapMidiToFretString } from './fretMapping'

function readU16(bytes, pos) {
  return (bytes[pos] << 8) | bytes[pos + 1]
}

function readU32(bytes, pos) {
  return (
    ((bytes[pos] << 24) >>> 0) |
    (bytes[pos + 1] << 16) |
    (bytes[pos + 2] << 8) |
    bytes[pos + 3]
  )
}

function readVarLen(bytes, start) {
  let value = 0
  let pos = start
  for (let i = 0; i < 4; i += 1) {
    const b = bytes[pos]
    value = (value << 7) | (b & 0x7f)
    pos += 1
    if ((b & 0x80) === 0) break
  }
  return { value, next: pos }
}

function parseTrack(bytes, start, end) {
  const noteOns = new Map()
  const notes = []
  let tempo = null
  let beatTop = null
  let beatBottom = null

  let pos = start
  let tick = 0
  let runningStatus = 0

  while (pos < end) {
    const delta = readVarLen(bytes, pos)
    tick += delta.value
    pos = delta.next

    let status = bytes[pos]
    if (status < 0x80) {
      status = runningStatus
    } else {
      pos += 1
      runningStatus = status
    }

    if (status === 0xff) {
      const metaType = bytes[pos]
      pos += 1
      const lenVar = readVarLen(bytes, pos)
      const len = lenVar.value
      pos = lenVar.next

      if (metaType === 0x51 && len === 3 && tempo == null) {
        const mpqn = (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2]
        if (mpqn > 0) tempo = Math.round(60000000 / mpqn)
      } else if (metaType === 0x58 && len >= 2 && beatTop == null) {
        beatTop = bytes[pos]
        beatBottom = 2 ** bytes[pos + 1]
      }

      pos += len
      continue
    }

    if (status === 0xf0 || status === 0xf7) {
      const lenVar = readVarLen(bytes, pos)
      pos = lenVar.next + lenVar.value
      continue
    }

    const type = status & 0xf0
    const channel = status & 0x0f
    if (channel > 15) continue

    if (type === 0x80 || type === 0x90) {
      const pitch = bytes[pos]
      const velocity = bytes[pos + 1]
      pos += 2
      const key = `${channel}:${pitch}`

      if (type === 0x90 && velocity > 0) {
        const arr = noteOns.get(key) || []
        arr.push(tick)
        noteOns.set(key, arr)
      } else {
        const arr = noteOns.get(key)
        if (!arr?.length) continue
        const startTick = arr.shift()
        if (!arr.length) noteOns.delete(key)
        const durationTick = Math.max(1, tick - startTick)
        notes.push({ midi: pitch, startTick, durationTick })
      }
      continue
    }

    // Skip other channel messages.
    if (type === 0xc0 || type === 0xd0) pos += 1
    else pos += 2
  }

  return { notes, tempo, beatTop, beatBottom }
}

export function parseMidiToClip(arrayBuffer, { openMidi = [], maxFret = 24 } = {}) {
  const bytes = new Uint8Array(arrayBuffer)
  if (bytes.length < 14) throw new Error('Invalid MIDI file.')
  const headerId = String.fromCharCode(...bytes.slice(0, 4))
  if (headerId !== 'MThd') throw new Error('Invalid MIDI file.')

  const division = readU16(bytes, 12)
  if (division & 0x8000) throw new Error('SMPTE MIDI is not supported.')
  const ppq = Math.max(1, division)

  let pos = 8 + readU32(bytes, 4)
  let tempo = 120
  let beatTop = 4
  let beatBottom = 4
  const mergedNotes = []

  while (pos + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.slice(pos, pos + 4))
    const len = readU32(bytes, pos + 4)
    const start = pos + 8
    const end = start + len
    if (id === 'MTrk' && end <= bytes.length) {
      const parsed = parseTrack(bytes, start, end)
      if (parsed.tempo != null) tempo = parsed.tempo
      if (parsed.beatTop != null) beatTop = parsed.beatTop
      if (parsed.beatBottom != null) beatBottom = parsed.beatBottom
      mergedNotes.push(...parsed.notes)
    }
    pos = end
  }

  const notes = []
  for (const n of mergedNotes) {
    const mapped = mapMidiToFretString(n.midi, openMidi, { maxFret })
    if (!mapped) continue
    notes.push({
      key: `midi_${n.startTick}_${notes.length}`,
      string: mapped.string,
      fret: mapped.fret,
      gridIndex: 1 + n.startTick / ppq,
      lengthBlocks: n.durationTick / ppq,
      subdivision: 2,
    })
  }

  notes.sort((a, b) => {
    if (a.gridIndex !== b.gridIndex) return a.gridIndex - b.gridIndex
    if (a.string !== b.string) return a.string - b.string
    return a.fret - b.fret
  })

  return { title: 'MIDI Import', tempo, beatTop, beatBottom, notes }
}
