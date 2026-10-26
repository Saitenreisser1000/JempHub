// Zeichnet ein Notensystem als SVG-Text mit der Notenschrift Bravura (SMuFL).
import { durOf } from './music.js'

const S = 10
const BOTTOM = 11 * S
const yOf = (pos) => BOTTOM - (pos * S) / 2
const cp = (n) => '&#x' + n.toString(16) + ';'

const HEAD = { 16: 0xe0a2, 8: 0xe0a3 }
const REST = { 16: 0xe4e3, 8: 0xe4e4, 4: 0xe4e5, 2: 0xe4e6, 1: 0xe4e7 }
const FLAG = { up: { 2: 0xe240, 1: 0xe242 }, down: { 2: 0xe241, 1: 0xe243 } }
const ACC = { '-1': 0xe260, 0: 0xe261, 1: 0xe262 }
const CLEF = { treble: [0xe050, 2], bass: [0xe062, 6] }

const n1 = (v) => Math.round(v * 10) / 10

// items: { type: 'note', pos, base, dots?, acc?, state? } | { type: 'rest', base, dots?, state? } | { type: 'gap', dur, state? }
export function staffSVG({ clef = null, timeSig = null, items = [], bar = false, lines = true, minWidth = 0, top = 0, height = 16, label = 'Notensystem' } = {}) {
  const shapes = []
  let x = 0.6
  if (clef) {
    const [glyph, pos] = CLEF[clef]
    shapes.push(`<text class="glyph" x="${n1(x * S)}" y="${yOf(pos)}">${cp(glyph)}</text>`)
    x += 4.4
  }
  if (timeSig) {
    const [num, den] = timeSig
    shapes.push(`<text class="glyph" x="${n1(x * S)}" y="${yOf(6)}">${cp(0xe080 + num)}</text>`)
    shapes.push(`<text class="glyph" x="${n1(x * S)}" y="${yOf(2)}">${cp(0xe080 + den)}</text>`)
    x += 3.2
  }
  x += 0.8

  const start = x
  const placed = items.map((it) => {
    const dur = it.type === 'gap' ? it.dur : durOf(it.base, it.dots)
    const accW = it.acc ? 1.7 : 0
    const w = 2.8 + 0.95 * Math.sqrt(dur) + accW + (it.dots ? 0.8 : 0)
    const p = { it, x0: x, w, accW }
    x += w
    return p
  })
  const total = Math.max(minWidth, x + (bar ? 1.2 : 0.8))
  const shift = placed.length === 1 && !timeSig ? (total - start - placed[0].w) / 2 : 0

  for (const { it, x0, w, accW } of placed) {
    const cls = it.state ? ' ' + it.state : ''
    const hx = x0 + shift + accW + 0.7
    if (it.type === 'gap') {
      shapes.push(`<rect class="gap${cls}" x="${n1((x0 + shift + 0.35) * S)}" y="${yOf(10)}" width="${n1((w - 0.7) * S)}" height="${12 * (S / 2)}" rx="8"/>`)
      shapes.push(`<text class="qmark${cls}" x="${n1((x0 + shift + w / 2) * S)}" y="${yOf(4) + 9}" text-anchor="middle">?</text>`)
      continue
    }
    if (it.type === 'rest') {
      shapes.push(`<text class="glyph${cls}" x="${n1(hx * S)}" y="${yOf(it.base === 16 ? 6 : 4)}">${cp(REST[it.base])}</text>`)
      if (it.dots) shapes.push(`<circle class="fillc${cls}" cx="${n1((hx + 1.9) * S)}" cy="${yOf(5)}" r="1.9"/>`)
      continue
    }
    const y = yOf(it.pos)
    for (let p = -2; p >= it.pos; p -= 2) shapes.push(`<line class="stroke" x1="${n1((hx - 0.55) * S)}" x2="${n1((hx + 1.75) * S)}" y1="${yOf(p)}" y2="${yOf(p)}" stroke-width="1.3"/>`)
    for (let p = 10; p <= it.pos; p += 2) shapes.push(`<line class="stroke" x1="${n1((hx - 0.55) * S)}" x2="${n1((hx + 1.75) * S)}" y1="${yOf(p)}" y2="${yOf(p)}" stroke-width="1.3"/>`)
    if (accW) shapes.push(`<text class="glyph${cls}" x="${n1((hx - 1.55) * S)}" y="${y}">${cp(ACC[it.acc])}</text>`)
    shapes.push(`<text class="glyph${cls}" x="${n1(hx * S)}" y="${y}">${cp(HEAD[it.base] ?? 0xe0a4)}</text>`)
    if (it.base < 16) {
      const up = it.pos < 4
      const len = (it.base === 1 ? 4.2 : 3.5) * S
      const sx = (up ? hx + 1.18 - 0.06 : hx + 0.06) * S
      const y1 = y + (up ? -1.7 : 1.7)
      const y2 = up ? y - len : y + len
      shapes.push(`<line class="stroke${cls}" x1="${n1(sx)}" x2="${n1(sx)}" y1="${n1(y1)}" y2="${n1(y2)}" stroke-width="1.2"/>`)
      if (it.base <= 2) shapes.push(`<text class="glyph${cls}" x="${n1(sx - 0.6)}" y="${n1(y2)}">${cp(FLAG[up ? 'up' : 'down'][it.base])}</text>`)
    }
    if (it.dots) shapes.push(`<circle class="fillc${cls}" cx="${n1((hx + 1.75) * S)}" cy="${yOf(it.pos % 2 === 0 ? it.pos + 1 : it.pos)}" r="1.9"/>`)
  }

  const W = n1(total * S)
  let staff = ''
  if (lines) {
    for (let i = 0; i < 5; i++) staff += `<line x1="0" x2="${W}" y1="${BOTTOM - i * S}" y2="${BOTTOM - i * S}"/>`
    if (bar) staff += `<line x1="${n1((total - 0.5) * S)}" x2="${n1((total - 0.5) * S)}" y1="${BOTTOM - 4 * S}" y2="${BOTTOM}"/>`
  }
  return `<svg class="staff" viewBox="0 ${top * S} ${W} ${height * S}" role="img" aria-label="${label}"><g class="lines">${staff}</g>${shapes.join('')}</svg>`
}
