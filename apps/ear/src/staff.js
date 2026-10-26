// Notensystem mit ganzen Noten, einzeln oder übereinander (Intervall, Akkord). Schrift: Bravura.

const S = 10
const BOTTOM = 11 * S
const yOf = (pos) => BOTTOM - (pos * S) / 2
const cp = (n) => '&#x' + n.toString(16) + ';'
const r1 = (v) => Math.round(v * 10) / 10
const ACC = { '-2': 0xe264, '-1': 0xe260, 0: 0xe261, 1: 0xe262, 2: 0xe263 }
const CLEF = { treble: [0xe050, 2], bass: [0xe062, 6] }

// columns: [{ notes: [{ pos, acc, state }] } | { gap: true }]
export function staffSVG({ clef = 'treble', columns = [], label = 'Notensystem', colW = 7.2 } = {}) {
  const parts = []
  const [glyph, cpos] = CLEF[clef]
  parts.push(`<text class="glyph" x="${0.6 * S}" y="${yOf(cpos)}">${cp(glyph)}</text>`)
  let x = 7
  for (const col of columns) {
    if (col.gap) {
      parts.push(`<rect class="gap" x="${r1((x + 0.4) * S)}" y="${yOf(10)}" width="${r1((colW - 1.6) * S)}" height="${12 * (S / 2)}" rx="8"/>`)
      parts.push(`<text class="qmark" x="${r1((x + colW / 2 - 0.4) * S)}" y="${yOf(4) + 9}" text-anchor="middle">?</text>`)
      x += colW
      continue
    }
    const notes = [...col.notes].sort((a, b) => a.pos - b.pos)
    const hx = x + 2.6
    // Sekundabstände: Notenköpfe abwechselnd nach rechts versetzen
    let prev = null
    for (const n of notes) {
      n._shift = prev && n.pos - prev.pos === 1 && !prev._shift ? 1.5 : 0
      prev = n
    }
    // Vorzeichen in Spalten, damit sie sich nicht überdecken (von oben nach unten)
    const accCols = []
    for (const n of [...notes].reverse()) {
      if (!n.acc) continue
      let k = 0
      while (accCols[k] && accCols[k].some((p) => Math.abs(p - n.pos) < 6)) k++
      ;(accCols[k] = accCols[k] || []).push(n.pos)
      n._accX = hx - 1.7 - k * 1.5
    }
    for (const n of notes) {
      const cls = n.state ? ' ' + n.state : ''
      const y = yOf(n.pos)
      const nx = hx + n._shift
      for (let p = -2; p >= n.pos; p -= 2) parts.push(`<line class="ledger" x1="${r1((hx - 0.6) * S)}" x2="${r1((hx + 2.4 + n._shift) * S)}" y1="${yOf(p)}" y2="${yOf(p)}"/>`)
      for (let p = 10; p <= n.pos; p += 2) parts.push(`<line class="ledger" x1="${r1((hx - 0.6) * S)}" x2="${r1((hx + 2.4 + n._shift) * S)}" y1="${yOf(p)}" y2="${yOf(p)}"/>`)
      if (n.acc) parts.push(`<text class="glyph${cls}" x="${r1(n._accX * S)}" y="${y}">${cp(ACC[n.acc])}</text>`)
      parts.push(`<text class="glyph${cls}" x="${r1(nx * S)}" y="${y}">${cp(0xe0a2)}</text>`)
    }
    x += colW
  }
  const W = r1((x + 1.5) * S)
  let lines = ''
  for (let i = 0; i < 5; i++) lines += `<line x1="0" x2="${W}" y1="${BOTTOM - i * S}" y2="${BOTTOM - i * S}"/>`
  return `<svg class="staff" viewBox="0 0 ${W} 170" role="img" aria-label="${label}"><g class="lines">${lines}</g>${parts.join('')}</svg>`
}
