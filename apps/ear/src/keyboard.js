// Klaviatur zur Eingabe von Tönen. Weiße Tasten mit Tonnamen, schwarze darüber.
import { spellMidi, isNatural, noteLabel } from './theory.js'

// low/high: MIDI-Bereich; enabled(midi): ob die Taste gilt; marks: { midi: 'ok'|'bad'|'hint' }
export function keyboardHTML({ low, high, enabled = () => true, lang = 'de', marks = {} }) {
  while (!isNatural(low)) low--
  while (!isNatural(high)) high++
  const whites = []
  for (let m = low; m <= high; m++) if (isNatural(m)) whites.push(m)
  const w = 100 / whites.length
  let html = `<div class="kbd-wrap"><div class="keys" style="--n:${whites.length}">`
  whites.forEach((m) => {
    const n = spellMidi(m)
    // Deutsch: c, c1, c2 (Helmholtz); Englisch: C4, C5
    const oct = lang === 'de' ? (n.o >= 4 ? n.o - 3 : '') : n.o
    const name = lang === 'de' ? noteLabel(n, lang).toLowerCase() : noteLabel(n, lang)
    const label = name + (n.l === 0 && oct !== '' ? `<sub>${oct}</sub>` : '')
    html += `<button class="key white${marks[m] ? ' ' + marks[m] : ''}" data-key="${m}" ${enabled(m) ? '' : 'disabled'} aria-label="${noteLabel(n, lang)}${n.o}"><span>${label}</span></button>`
  })
  whites.forEach((m, i) => {
    const b = m + 1
    if (b > high || isNatural(b)) return
    html += `<button class="key black${marks[b] ? ' ' + marks[b] : ''}" data-key="${b}" style="left:${((i + 1) * w).toFixed(3)}%" ${enabled(b) ? '' : 'disabled'} aria-label="${noteLabel(spellMidi(b), lang)}${spellMidi(b).o}"></button>`
  })
  return html + '</div></div>'
}
