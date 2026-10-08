<script setup>
import { computed } from 'vue'
import { durOf } from '../music.js'

const props = defineProps({
  clef: { type: String, default: null }, // 'treble' | 'bass'
  timeSig: { type: Array, default: null },
  items: { type: Array, default: () => [] }, // note | rest | gap
  bar: Boolean,
  lines: { type: Boolean, default: true },
  minWidth: { type: Number, default: 0 },
  top: { type: Number, default: 0 },
  height: { type: Number, default: 16 },
})

const S = 10
const BOTTOM = 11 * S
const yOf = (pos) => BOTTOM - (pos * S) / 2
const cp = (n) => String.fromCodePoint(n)

const HEAD = { 16: 0xe0a2, 8: 0xe0a3 }
const REST = { 16: 0xe4e3, 8: 0xe4e4, 4: 0xe4e5, 2: 0xe4e6, 1: 0xe4e7 }
const FLAG = { up: { 2: 0xe240, 1: 0xe242 }, down: { 2: 0xe241, 1: 0xe243 } }
const ACC = { '-1': 0xe260, 0: 0xe261, 1: 0xe262 }

const layout = computed(() => {
  const shapes = []
  let x = 0.6
  if (props.clef) {
    shapes.push({ k: 'text', x: x * S, y: yOf(props.clef === 'treble' ? 2 : 6), ch: cp(props.clef === 'treble' ? 0xe050 : 0xe062) })
    x += 4.4
  }
  if (props.timeSig) {
    const [n, d] = props.timeSig
    shapes.push({ k: 'text', x: x * S, y: yOf(6), ch: cp(0xe080 + n) })
    shapes.push({ k: 'text', x: x * S, y: yOf(2), ch: cp(0xe080 + d) })
    x += 3.2
  }
  x += 0.8

  const start = x
  const placed = props.items.map((it) => {
    const dur = it.type === 'gap' ? it.dur : durOf(it.base, it.dots)
    const accW = it.acc !== undefined && it.acc !== null ? 1.7 : 0
    const w = 2.8 + 0.95 * Math.sqrt(dur) + accW + (it.dots ? 0.8 : 0)
    const p = { it, x0: x, w, accW }
    x += w
    return p
  })
  const total = Math.max(props.minWidth, x + (props.bar ? 1.2 : 0.8))
  const shift = placed.length === 1 && !props.timeSig ? (total - start - placed[0].w) / 2 : 0

  for (const { it, x0, w, accW } of placed) {
    const cls = it.state ?? ''
    const hx = x0 + shift + accW + 0.7
    if (it.type === 'gap') {
      shapes.push({ k: 'gap', x: (x0 + shift + 0.35) * S, y: yOf(10), w: (w - 0.7) * S, h: 12 * (S / 2), cls })
      shapes.push({ k: 'q', x: (x0 + shift + w / 2) * S, y: yOf(4) + 9, cls })
      continue
    }
    if (it.type === 'rest') {
      const y = yOf(it.base === 16 ? 6 : 4)
      shapes.push({ k: 'text', x: hx * S, y, ch: cp(REST[it.base]), cls })
      if (it.dots) shapes.push({ k: 'dot', x: (hx + 1.9) * S, y: yOf(5), cls })
      continue
    }
    const y = yOf(it.pos)
    const ledgers = []
    for (let p = -2; p >= it.pos; p -= 2) ledgers.push(p)
    for (let p = 10; p <= it.pos; p += 2) ledgers.push(p)
    for (const p of ledgers) shapes.push({ k: 'line', x1: (hx - 0.55) * S, x2: (hx + 1.75) * S, y1: yOf(p), y2: yOf(p), w: 1.3 })
    if (accW) shapes.push({ k: 'text', x: (hx - 1.55) * S, y, ch: cp(ACC[it.acc]), cls })
    shapes.push({ k: 'text', x: hx * S, y, ch: cp(HEAD[it.base] ?? 0xe0a4), cls })
    if (it.base < 16) {
      const up = it.pos < 4
      const len = (it.base === 1 ? 4.2 : 3.5) * S
      const sx = (up ? hx + 1.18 - 0.06 : hx + 0.06) * S
      const y1 = y + (up ? -1.7 : 1.7)
      const y2 = up ? y - len : y + len
      shapes.push({ k: 'line', x1: sx, x2: sx, y1, y2, w: 1.2, cls })
      if (it.base <= 2) shapes.push({ k: 'text', x: sx - 0.6, y: y2, ch: cp(FLAG[up ? 'up' : 'down'][it.base]), cls })
    }
    if (it.dots) shapes.push({ k: 'dot', x: (hx + 1.75) * S, y: yOf(it.pos % 2 === 0 ? it.pos + 1 : it.pos), cls })
  }

  const staffLines = []
  if (props.lines) for (let i = 0; i < 5; i++) staffLines.push(BOTTOM - i * S)
  const barX = props.bar ? (total - 0.5) * S : null
  return { shapes, total, staffLines, barX }
})

const viewBox = computed(() => `0 ${props.top * S} ${layout.value.total * S} ${props.height * S}`)
</script>

<template>
  <svg class="staff" :viewBox="viewBox" role="img" aria-label="Notensystem">
    <g class="lines">
      <line v-for="y in layout.staffLines" :key="y" x1="0" :x2="layout.total * 10" :y1="y" :y2="y" />
      <line v-if="layout.barX !== null && lines" :x1="layout.barX" :x2="layout.barX" :y1="BOTTOM - 4 * S" :y2="BOTTOM" />
    </g>
    <template v-for="(s, i) in layout.shapes" :key="i">
      <text v-if="s.k === 'text'" :x="s.x" :y="s.y" :class="['glyph', s.cls]">{{ s.ch }}</text>
      <line v-else-if="s.k === 'line'" :x1="s.x1" :x2="s.x2" :y1="s.y1" :y2="s.y2" :stroke-width="s.w" :class="['stroke', s.cls]" />
      <circle v-else-if="s.k === 'dot'" :cx="s.x" :cy="s.y" r="1.9" :class="['fillc', s.cls]" />
      <rect v-else-if="s.k === 'gap'" :x="s.x" :y="s.y" :width="s.w" :height="s.h" rx="8" :class="['gap', s.cls]" />
      <text v-else-if="s.k === 'q'" :x="s.x" :y="s.y" text-anchor="middle" :class="['qmark', s.cls]">?</text>
    </template>
  </svg>
</template>

<style scoped>
.staff { width: 100%; height: auto; display: block; color: var(--ink); }
.lines line { stroke: currentColor; stroke-width: 1.1; }
.glyph { font-family: 'Bravura', serif; font-size: 40px; fill: currentColor; }
.stroke { stroke: currentColor; stroke-linecap: butt; }
.fillc { fill: currentColor; }
.gap { fill: color-mix(in srgb, var(--primary) 8%, transparent); stroke: var(--primary); stroke-width: 2; stroke-dasharray: 6 5; }
.qmark { font-size: 34px; font-weight: 700; fill: var(--primary); font-family: system-ui, sans-serif; }
.ok { fill: var(--ok); color: var(--ok); stroke: var(--ok); }
.bad { fill: var(--bad); color: var(--bad); stroke: var(--bad); }
.gap.ok, .gap.bad { stroke-dasharray: none; fill-opacity: .12; }
</style>
