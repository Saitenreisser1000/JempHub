// JempHub: spielbares Griffbrett im Kopf, Karten erwachen beim Sichtbarwerden.
// Klang: gezupfte Saite aus dem gemeinsamen Player (keine Datei zu laden).
import { createPlayer } from './vendor/sounds/src/player.js'

const player = createPlayer()
const dots = [...document.querySelectorAll('.trail .dot')]
const playBtn = document.querySelector('.hero-play')
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
let timers = []

// größere unsichtbare Tippfläche je Punkt; am Handy nur den bespielten Teil des Halses zeigen
dots.forEach((el) => {
  const c = el.querySelectorAll('circle')
  const xs = [...c].map((q) => +q.getAttribute('cx')), ys = [...c].map((q) => +q.getAttribute('cy'))
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  const x0 = Math.min(...xs) - 22, y0 = Math.min(...ys) - 18
  Object.entries({ x: x0, y: y0, width: Math.max(...xs) - x0 + 22, height: Math.max(...ys) - y0 + 18, rx: 14, class: 'tap' }).forEach(([k, v]) => hit.setAttribute(k, v))
  el.prepend(hit)
})
const trail = document.querySelector('.trail')
const fit = () => trail.setAttribute('viewBox', matchMedia('(max-width: 720px)').matches ? '160 0 340 132' : '16 0 560 132')
fit()
addEventListener('resize', fit)

function light(el) {
  el.classList.remove('hit')
  void el.getBBox()
  el.classList.add('hit')
}

function sound(el, when) {
  const midis = el.dataset.midi.split(' ').map(Number)
  midis.forEach((m, k) => player.note(m, when + k * 0.012, 0.9, { instrument: 'guitar', vel: 0.9 }))
}

function stop() {
  dots.forEach((el) => el.classList.remove('hit'))
  timers.forEach(clearTimeout)
  timers = []
  document.body.classList.remove('phrase')
  playBtn.classList.remove('on')
}

function playPhrase() {
  if (!player.ensure()) return
  stop()
  document.body.classList.add('phrase')
  playBtn.classList.add('on')
  const beat = 0.42
  const t0 = player.now() + 0.06
  dots.forEach((el, k) => {
    sound(el, t0 + k * beat)
    timers.push(setTimeout(() => light(el), (t0 + k * beat - player.now()) * 1000))
  })
  timers.push(setTimeout(stop, (dots.length * beat + 0.8) * 1000))
}

playBtn.addEventListener('click', () => (playBtn.classList.contains('on') ? stop() : playPhrase()))
dots.forEach((el) => {
  const tap = () => {
    if (!player.ensure()) return
    sound(el, player.now() + 0.01)
    light(el)
  }
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); tap() })
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap() } })
})

// Karten: Abbildung spielt ihre kleine Szene, sobald die Karte im Bild ist
// (am Handy) bzw. beim Darüberfahren (Maus).
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('live')
      io.unobserve(e.target)
    }
  }, { threshold: 0.6 })
  document.querySelectorAll('.app:not(.soon)').forEach((c) => {
    io.observe(c)
    // Maus: beim Darüberfahren die Szene erneut abspielen
    c.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return
      c.classList.remove('live')
      void c.offsetWidth
      c.classList.add('live')
    })
  })
}
