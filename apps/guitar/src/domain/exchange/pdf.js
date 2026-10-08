function sanitizePdfText(input) {
  const s = String(input ?? '')
  let out = ''
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i)
    if (code >= 32 && code <= 126) out += s[i]
    else out += '?'
  }
  return out
}

function escapePdfText(input) {
  return sanitizePdfText(input)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

function fmt(n) {
  return Number(n).toFixed(3).replace(/\.?0+$/, '')
}

function circlePath(x, y, r) {
  const c = 0.5522847498 * r
  const x0 = x - r
  const x1 = x - c
  const x2 = x + c
  const x3 = x + r
  const y0 = y - r
  const y1 = y - c
  const y2 = y + c
  const y3 = y + r
  return [
    `${fmt(x)} ${fmt(y3)} m`,
    `${fmt(x2)} ${fmt(y3)} ${fmt(x3)} ${fmt(y2)} ${fmt(x3)} ${fmt(y)} c`,
    `${fmt(x3)} ${fmt(y1)} ${fmt(x2)} ${fmt(y0)} ${fmt(x)} ${fmt(y0)} c`,
    `${fmt(x1)} ${fmt(y0)} ${fmt(x0)} ${fmt(y1)} ${fmt(x0)} ${fmt(y)} c`,
    `${fmt(x0)} ${fmt(y2)} ${fmt(x1)} ${fmt(y3)} ${fmt(x)} ${fmt(y3)} c`,
    'h',
  ].join('\n')
}

function toPdfUint8Array(pdfText) {
  const bytes = new Uint8Array(pdfText.length)
  for (let i = 0; i < pdfText.length; i += 1) bytes[i] = pdfText.charCodeAt(i) & 0xff
  return bytes
}

function uniqueNotePositions(notes) {
  const set = new Set()
  const out = []
  const list = Array.isArray(notes) ? notes : []
  for (const n of list) {
    const fret = Math.max(0, Math.round(Number(n?.fret) || 0))
    const string = Math.max(1, Math.round(Number(n?.string) || 1))
    const key = `${string}-${fret}`
    if (set.has(key)) continue
    set.add(key)
    out.push({ string, fret })
  }
  return out
}

function buildPageStream(clip, { title = '', keySignature = '', fretCount = 12 } = {}) {
  const PAGE_W = 595
  const PAGE_H = 842
  const MARGIN_X = 40
  const BOARD_W = PAGE_W - 2 * MARGIN_X
  const BOARD_H = 190
  const BOARD_X = MARGIN_X
  const BOARD_Y = 520
  const titleText = sanitizePdfText(title || clip?.title || 'GuitarJemp')
  const keyText = sanitizePdfText(String(keySignature || '').trim() || '-')
  const strings = Math.max(2, Number(clip?.numStrings) || 6)
  const notes = uniqueNotePositions(clip?.notes)
  const maxNoteFret = notes.reduce((m, n) => Math.max(m, n.fret), 0)
  const frets = Math.max(1, Number(fretCount) || 12, maxNoteFret)
  const nutW = 10
  const usableW = BOARD_W - nutW

  let s = ''

  s += 'q\n'
  s += '1 1 1 rg\n'
  s += `0 0 ${PAGE_W} ${PAGE_H} re f\n`
  s += 'Q\n'

  s += 'BT\n'
  s += '/F2 20 Tf\n'
  s += `1 0 0 1 ${fmt(MARGIN_X)} ${fmt(PAGE_H - 52)} Tm\n`
  s += `(${escapePdfText(titleText)}) Tj\n`
  s += 'ET\n'

  s += 'BT\n'
  s += '/F1 12 Tf\n'
  s += `1 0 0 1 ${fmt(MARGIN_X)} ${fmt(PAGE_H - 76)} Tm\n`
  s += `(Key: ${escapePdfText(keyText)}) Tj\n`
  s += 'ET\n'

  s += 'q\n'
  s += '1 1 1 rg\n'
  s += `${fmt(BOARD_X)} ${fmt(BOARD_Y)} ${fmt(BOARD_W)} ${fmt(BOARD_H)} re f\n`
  s += '0.15 0.15 0.15 RG\n'
  s += '2 w\n'
  s += `${fmt(BOARD_X)} ${fmt(BOARD_Y)} ${fmt(BOARD_W)} ${fmt(BOARD_H)} re S\n`
  s += 'Q\n'

  const nutX = BOARD_X + nutW
  s += 'q\n'
  s += '0.75 0.75 0.75 rg\n'
  s += `${fmt(BOARD_X)} ${fmt(BOARD_Y)} ${fmt(nutW)} ${fmt(BOARD_H)} re f\n`
  s += 'Q\n'

  s += 'q\n'
  s += '0.65 0.65 0.65 RG\n'
  s += '1 w\n'
  for (let i = 1; i <= frets; i += 1) {
    const x = nutX + (i / frets) * usableW
    s += `${fmt(x)} ${fmt(BOARD_Y)} m ${fmt(x)} ${fmt(BOARD_Y + BOARD_H)} l S\n`
  }
  s += 'Q\n'

  s += 'q\n'
  s += '0.55 0.55 0.55 RG\n'
  for (let i = 0; i < strings; i += 1) {
    const t = i / Math.max(1, strings - 1)
    const y = BOARD_Y + BOARD_H - 20 - t * (BOARD_H - 40)
    const w = 1 + t * 1.6
    s += `${fmt(w)} w\n`
    s += `${fmt(BOARD_X)} ${fmt(y)} m ${fmt(BOARD_X + BOARD_W)} ${fmt(y)} l S\n`
  }
  s += 'Q\n'

  s += 'BT\n'
  s += '/F1 9 Tf\n'
  s += '0.18 0.18 0.18 rg\n'
  for (let i = 1; i <= frets; i += 1) {
    const leftX = i === 1 ? nutX : nutX + ((i - 1) / frets) * usableW
    const rightX = nutX + (i / frets) * usableW
    const labelX = (leftX + rightX) / 2 - 2.5
    const labelY = BOARD_Y - 14
    s += `1 0 0 1 ${fmt(labelX)} ${fmt(labelY)} Tm\n`
    s += `(${escapePdfText(String(i))}) Tj\n`
  }
  s += 'ET\n'

  s += 'q\n'
  s += '0.96 0.96 0.96 rg\n'
  s += '0.18 0.18 0.18 RG\n'
  s += '0.9 w\n'
  for (const n of notes) {
    const fret = Math.max(0, Math.min(frets, n.fret))
    const sx = fret <= 0
      ? BOARD_X + nutW * 0.5
      : nutX + ((fret - 0.5) / frets) * usableW
    const stringIdx = Math.max(1, Math.min(strings, n.string))
    const t = (stringIdx - 1) / Math.max(1, strings - 1)
    const sy = BOARD_Y + BOARD_H - 20 - t * (BOARD_H - 40)
    s += `${circlePath(sx, sy, 7)} B\n`
  }
  s += 'Q\n'

  return s
}

export function toPdfBytes(clip, { title = '', keySignature = '', fretCount = 12 } = {}) {
  const objects = new Map()
  let nextObj = 1

  const catalogObj = nextObj++
  const pagesObj = nextObj++
  const pageObj = nextObj++
  const contentObj = nextObj++
  const fontObj = nextObj++
  const fontBoldObj = nextObj++

  objects.set(catalogObj, `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`)
  objects.set(pagesObj, `<< /Type /Pages /Count 1 /Kids [ ${pageObj} 0 R ] >>`)
  objects.set(
    pageObj,
    `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${fontBoldObj} 0 R >> >> /Contents ${contentObj} 0 R >>`,
  )
  objects.set(fontObj, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.set(fontBoldObj, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  const stream = buildPageStream(clip, { title, keySignature, fretCount })
  objects.set(contentObj, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)

  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'
  const offsets = [0]
  for (let n = 1; n < nextObj; n += 1) {
    offsets[n] = pdf.length
    const body = objects.get(n) || '<< >>'
    pdf += `${n} 0 obj\n${body}\nendobj\n`
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${nextObj}\n`
  pdf += '0000000000 65535 f \n'
  for (let n = 1; n < nextObj; n += 1) {
    pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${nextObj} /Root ${catalogObj} 0 R >>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF`
  return toPdfUint8Array(pdf)
}
