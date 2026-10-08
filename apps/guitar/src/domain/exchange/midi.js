function toVarLen(value) {
  let v = Math.max(0, Number(value) | 0)
  const out = [v & 0x7f]
  v >>= 7
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80)
    v >>= 7
  }
  return out
}

function writeU16(v) {
  return [(v >> 8) & 0xff, v & 0xff]
}

function writeU32(v) {
  return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
}

function writeChunk(id, bytes) {
  const header = [...id].map((c) => c.charCodeAt(0))
  return [...header, ...writeU32(bytes.length), ...bytes]
}

function tempoMeta(bpm) {
  const safeBpm = Math.max(20, Number(bpm) || 120)
  const mpqn = Math.round(60000000 / safeBpm)
  return [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff]
}

function timeSigMeta(top, bottom) {
  const nn = Math.max(1, Number(top) || 4)
  const bb = Math.max(1, Number(bottom) || 4)
  const dd = Math.round(Math.log2(bb))
  return [0xff, 0x58, 0x04, nn & 0xff, dd & 0xff, 24, 8]
}

export function toMidiBytes(clip) {
  const ppq = 480
  const ticksPerBlock = Math.max(1, Number(clip?.ticksPerBlock) || 48)
  const scale = ppq / ticksPerBlock
  const notes = Array.isArray(clip?.notes) ? clip.notes : []

  const events = []
  events.push({ tick: 0, data: tempoMeta(clip?.tempo) })
  events.push({ tick: 0, data: timeSigMeta(clip?.beatTop, clip?.beatBottom) })

  for (const note of notes) {
    const midi = Number(note?.midi)
    if (!Number.isFinite(midi)) continue
    const start = Math.max(0, Math.round((Number(note?.gridIndex || 1) - 1) * ticksPerBlock * scale))
    const dur = Math.max(1, Math.round(Number(note?.lengthBlocks || 1) * ticksPerBlock * scale))
    const end = start + dur
    const pitch = Math.max(0, Math.min(127, Math.round(midi)))

    events.push({ tick: start, type: 'on', data: [0x90, pitch, 90] })
    events.push({ tick: end, type: 'off', data: [0x80, pitch, 0] })
  }

  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick
    const aOff = a.type === 'off' ? 0 : 1
    const bOff = b.type === 'off' ? 0 : 1
    return aOff - bOff
  })

  const trackBytes = []
  let lastTick = 0
  for (const ev of events) {
    const delta = ev.tick - lastTick
    trackBytes.push(...toVarLen(delta), ...ev.data)
    lastTick = ev.tick
  }

  trackBytes.push(0x00, 0xff, 0x2f, 0x00)

  const header = writeChunk('MThd', [...writeU16(0), ...writeU16(1), ...writeU16(ppq)])
  const track = writeChunk('MTrk', trackBytes)
  return new Uint8Array([...header, ...track])
}
