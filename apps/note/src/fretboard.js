// Kleines Griffbrett im GuitarJemp-Stil: zeigt, wo eine Note auf Gitarre oder Bass liegt.
import { INSTRUMENTS, fretPositions } from './music.js'

const FRETS = 12

export function fretboardSVG(writtenMidi, instrument, color = '#d8b46a') {
  const inst = INSTRUMENTS[instrument]
  const n = inst.tuning.length
  const SP = 18, TOP = 12, LEFT = 22, OPEN = 24, NUT = 4, L = 560
  const nutX = LEFT + OPEN, boardX = nutX + NUT
  const wire = (f) => boardX + (L * (1 - Math.pow(2, -f / 12))) / (1 - Math.pow(2, -FRETS / 12))
  const endX = wire(FRETS) + 6
  const y = (s) => TOP + 8 + s * SP
  const bottom = y(n - 1) + 8
  const H = bottom + 18
  const fx = (f) => (f === 0 ? LEFT + OPEN / 2 : (wire(f - 1) + wire(f)) / 2)
  let s = `<svg class="fret" viewBox="0 0 ${Math.ceil(endX + 4)} ${H}" role="img" aria-label="Lage auf ${inst.name}">`
  s += `<rect x="${LEFT}" y="${TOP}" width="${OPEN}" height="${bottom - TOP}" rx="4" class="f-open"/>`
  s += `<rect x="${boardX}" y="${TOP}" width="${endX - boardX}" height="${bottom - TOP}" class="f-wood"/>`
  for (const f of [3, 5, 7, 9]) s += `<circle cx="${fx(f)}" cy="${(TOP + bottom) / 2}" r="3" class="f-inlay"/>`
  for (const off of [-SP, SP]) s += `<circle cx="${fx(12)}" cy="${(TOP + bottom) / 2 + off}" r="3" class="f-inlay"/>`
  s += `<rect x="${nutX}" y="${TOP - 1}" width="${NUT}" height="${bottom - TOP + 2}" class="f-nut"/>`
  for (let f = 1; f <= FRETS; f++) s += `<rect x="${wire(f) - 1}" y="${TOP}" width="2" height="${bottom - TOP}" class="f-wire"/>`
  inst.tuning.forEach((_, i) => {
    const w = instrument === 'bass' ? 1.6 + i * 0.4 : 0.8 + i * 0.35
    s += `<line x1="${LEFT + 4}" x2="${endX}" y1="${y(i)}" y2="${y(i)}" stroke-width="${w.toFixed(2)}" class="f-string"/>`
    s += `<text x="${LEFT / 2}" y="${y(i)}" class="f-label">${inst.strings[i]}</text>`
  })
  for (const f of [3, 5, 7, 12]) s += `<text x="${fx(f)}" y="${bottom + 13}" class="f-num">${f}</text>`
  for (const p of fretPositions(writtenMidi, instrument, FRETS)) {
    const cx = fx(p.f), cy = y(p.s)
    s += p.f === 0
      ? `<circle cx="${cx}" cy="${cy}" r="6.2" style="fill:var(--open)" stroke="${color}" stroke-width="2.4"/>`
      : `<circle cx="${cx}" cy="${cy}" r="7" fill="${color}"/>`
  }
  return s + '</svg>'
}
