// Kleines Griffbrett im GuitarJemp-Stil mit mehreren Tönen (Stufen als Beschriftung).
import { GUITAR, guitarPositions } from './theory.js'

const FRETS = 12
const STRINGS = ['e', 'H', 'G', 'D', 'A', 'E']

// tones: [{ midi, label, color }]
export function fretboardSVG(tones, title = 'Gitarre') {
  const SP = 20, TOP = 12, LEFT = 22, OPEN = 26, NUT = 4, L = 600
  const nutX = LEFT + OPEN, boardX = nutX + NUT
  const wire = (f) => boardX + (L * (1 - Math.pow(2, -f / 12))) / (1 - Math.pow(2, -FRETS / 12))
  const endX = wire(FRETS) + 6
  const y = (s) => TOP + 9 + s * SP
  const bottom = y(GUITAR.length - 1) + 9
  const H = bottom + 18
  const fx = (f) => (f === 0 ? LEFT + OPEN / 2 : (wire(f - 1) + wire(f)) / 2)
  let s = `<svg class="fret" viewBox="0 0 ${Math.ceil(endX + 4)} ${H}" role="img" aria-label="${title}">`
  s += `<rect x="${LEFT}" y="${TOP}" width="${OPEN}" height="${bottom - TOP}" rx="4" class="f-open"/>`
  s += `<rect x="${boardX}" y="${TOP}" width="${endX - boardX}" height="${bottom - TOP}" class="f-wood"/>`
  for (const f of [3, 5, 7, 9]) s += `<circle cx="${fx(f)}" cy="${(TOP + bottom) / 2}" r="3" class="f-inlay"/>`
  for (const off of [-SP, SP]) s += `<circle cx="${fx(12)}" cy="${(TOP + bottom) / 2 + off}" r="3" class="f-inlay"/>`
  s += `<rect x="${nutX}" y="${TOP - 1}" width="${NUT}" height="${bottom - TOP + 2}" class="f-nut"/>`
  for (let f = 1; f <= FRETS; f++) s += `<rect x="${wire(f) - 1}" y="${TOP}" width="2" height="${bottom - TOP}" class="f-wire"/>`
  GUITAR.forEach((_, i) => {
    s += `<line x1="${LEFT + 4}" x2="${endX}" y1="${y(i)}" y2="${y(i)}" stroke-width="${(0.8 + i * 0.35).toFixed(2)}" class="f-string"/>`
    s += `<text x="${LEFT / 2}" y="${y(i)}" class="f-label">${STRINGS[i]}</text>`
  })
  for (const f of [3, 5, 7, 12]) s += `<text x="${fx(f)}" y="${bottom + 13}" class="f-num">${f}</text>`
  for (const tone of tones) {
    for (const p of guitarPositions(tone.midi, FRETS)) {
      const cx = fx(p.f), cy = y(p.s)
      s += p.f === 0
        ? `<circle cx="${cx}" cy="${cy}" r="7.4" fill="#111613" stroke="${tone.color}" stroke-width="2.4"/><text x="${cx}" y="${cy}" class="f-deg" style="fill:${tone.color}">${tone.label}</text>`
        : `<circle cx="${cx}" cy="${cy}" r="8" fill="${tone.color}"/><text x="${cx}" y="${cy}" class="f-deg">${tone.label}</text>`
    }
  }
  return s + '</svg>'
}
