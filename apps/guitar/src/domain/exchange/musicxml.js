function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

const STEP_NAMES = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B']
const ALTER_MAP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]

function pitchFromMidi(midi) {
  const safe = Number(midi)
  const pitchClass = ((safe % 12) + 12) % 12
  const octave = Math.floor(safe / 12) - 1
  return {
    step: STEP_NAMES[pitchClass],
    alter: ALTER_MAP[pitchClass],
    octave,
  }
}

function noteXml(note, duration, { chord = false } = {}) {
  const pitch = pitchFromMidi(note.midi)
  return [
    '      <note>',
    ...(chord ? ['        <chord/>'] : []),
    '        <pitch>',
    `          <step>${pitch.step}</step>`,
    ...(pitch.alter ? [`          <alter>${pitch.alter}</alter>`] : []),
    `          <octave>${pitch.octave}</octave>`,
    '        </pitch>',
    `        <duration>${duration}</duration>`,
    '        <voice>1</voice>',
    '        <type>quarter</type>',
    '        <notations>',
    '          <technical>',
    `            <string>${note.string}</string>`,
    `            <fret>${note.fret}</fret>`,
    '          </technical>',
    '        </notations>',
    '      </note>',
  ].join('\n')
}

function restXml(duration) {
  return [
    '      <note>',
    '        <rest/>',
    `        <duration>${duration}</duration>`,
    '        <voice>1</voice>',
    '        <type>quarter</type>',
    '      </note>',
  ].join('\n')
}

export function toMusicXml(clip, { title = '' } = {}) {
  const notes = Array.isArray(clip?.notes) ? clip.notes : []
  const divisions = 48
  const ticksPerBlock = Math.max(1, Number(clip?.ticksPerBlock) || 48)
  const scale = divisions / ticksPerBlock
  const beatTop = Math.max(1, Number(clip?.beatTop) || 4)
  const beatBottom = Number(clip?.beatBottom) || 4
  const barTicks = Math.max(1, Math.round(beatTop * (4 / beatBottom) * divisions))

  const byStart = new Map()
  for (const note of notes) {
    const startTick = Math.max(0, Math.round((Number(note.gridIndex) - 1) * ticksPerBlock * scale))
    const durationTick = Math.max(1, Math.round(Number(note.lengthBlocks || 1) * ticksPerBlock * scale))
    const item = { ...note, startTick, durationTick }
    const bucket = byStart.get(startTick)
    if (bucket) bucket.push(item)
    else byStart.set(startTick, [item])
  }

  const starts = [...byStart.keys()].sort((a, b) => a - b)
  const events = []
  let cursor = 0
  for (const start of starts) {
    if (start > cursor) events.push({ type: 'rest', duration: start - cursor })
    const chordNotes = byStart.get(start) || []
    const chordDur = Math.max(...chordNotes.map((n) => n.durationTick))
    events.push({ type: 'chord', duration: chordDur, notes: chordNotes })
    cursor = Math.max(cursor, start + chordDur)
  }

  const measures = []
  let measureNo = 1
  let remainInMeasure = barTicks
  let current = []

  function pushMeasure() {
    measures.push({ number: measureNo++, lines: current })
    current = []
    remainInMeasure = barTicks
  }

  for (const ev of events) {
    let remain = ev.duration
    while (remain > 0) {
      const chunk = Math.min(remain, remainInMeasure)
      if (ev.type === 'rest') {
        current.push(restXml(chunk))
      } else {
        const list = ev.notes || []
        if (list.length > 0) {
          current.push(noteXml(list[0], chunk))
          for (let i = 1; i < list.length; i += 1) current.push(noteXml(list[i], chunk, { chord: true }))
        }
      }

      remain -= chunk
      remainInMeasure -= chunk
      if (remainInMeasure === 0) pushMeasure()
    }
  }

  if (current.length || measures.length === 0) pushMeasure()

  const workTitle = escapeXml(title || clip?.title || 'GuitarJemp Export')

  const measureXml = measures
    .map((m, idx) => {
      const attrs =
        idx === 0
          ? [
              '      <attributes>',
              `        <divisions>${divisions}</divisions>`,
              '        <key><fifths>0</fifths></key>',
              `        <time><beats>${beatTop}</beats><beat-type>${beatBottom}</beat-type></time>`,
              '        <clef><sign>TAB</sign><line>5</line></clef>',
              '      </attributes>',
            ].join('\n')
          : ''
      return [
        `    <measure number="${m.number}">`,
        attrs,
        ...m.lines,
        '    </measure>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `  <work><work-title>${workTitle}</work-title></work>`,
    '  <part-list>',
    '    <score-part id="P1">',
    `      <part-name>${escapeXml(clip?.instrumentType || 'Guitar')}</part-name>`,
    '    </score-part>',
    '  </part-list>',
    '  <part id="P1">',
    measureXml,
    '  </part>',
    '</score-partwise>',
    '',
  ].join('\n')
}
