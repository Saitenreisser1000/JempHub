<script setup>
import { computed, ref } from 'vue'
import QuizFrame from './QuizFrame.vue'
import OptionGroup from './OptionGroup.vue'
import Staff from './Staff.vue'
import { useQuiz } from '../composables/useQuiz.js'
import { useSettings } from '../storage.js'
import { durOf, pick, rand, shuffle, valueLabel } from '../music.js'

defineEmits(['back'])

const settings = useSettings('measures', { meter: '4/4', level: 1, missing: 'note' })

// Dauer in Sechzehnteln -> Notenwert
const VALUES = {
  16: { base: 16, dots: 0 },
  12: { base: 8, dots: 1 },
  8: { base: 8, dots: 0 },
  6: { base: 4, dots: 1 },
  4: { base: 4, dots: 0 },
  3: { base: 2, dots: 1 },
  2: { base: 2, dots: 0 },
  1: { base: 1, dots: 0 },
}
const LEVELS = { 0: [16, 8, 4], 1: [16, 8, 4, 2], 2: [16, 12, 8, 6, 4, 3, 2, 1] }
const METERS = { '2/4': 8, '3/4': 12, '4/4': 16, '6/8': 12, '3/8': 6 }

const question = ref(null)
const chosen = ref(null)

function fill(total, allowed) {
  const out = []
  let left = total
  while (left > 0) {
    const fits = allowed.filter((d) => d <= left)
    if (!fits.length) return null
    const d = pick(fits)
    out.push(d)
    left -= d
  }
  return out
}

function generate() {
  const meter = settings.meter === 'mix' ? pick(Object.keys(METERS)) : settings.meter
  const bar = METERS[meter]
  const allowed = LEVELS[settings.level].filter((d) => d <= bar)
  for (let tries = 0; tries < 200; tries++) {
    const missing = pick(allowed.filter((d) => d < bar))
    const rest = fill(bar - missing, allowed)
    if (!rest || rest.length < 1 || rest.length > 6) continue
    const kind = settings.missing === 'both' ? pick(['note', 'rest']) : settings.missing
    const elements = rest.map((d) => ({
      type: rand(5) === 0 ? 'rest' : 'note',
      ...VALUES[d],
      pos: 1 + rand(7),
      dur: d,
    }))
    const at = rand(elements.length + 1)
    const options = shuffle([missing, ...shuffle(allowed.filter((d) => d !== missing)).slice(0, 3)])
    question.value = { meter, missing, kind, elements, at, options, pos: 3 + rand(3) }
    chosen.value = null
    return
  }
}

const quiz = useQuiz('measures', generate)

function answer(d) {
  if (quiz.result.value) return
  chosen.value = d
  quiz.submit(d === question.value.missing)
}

const items = computed(() => {
  const q = question.value
  if (!q) return []
  const list = q.elements.map((e) => ({ ...e }))
  const res = quiz.result.value
  const m = VALUES[q.missing]
  const gap = res
    ? { type: q.kind, ...m, pos: q.pos, state: 'ok' }
    : { type: 'gap', dur: q.missing }
  list.splice(q.at, 0, gap)
  return list
})

const timeSig = computed(() => (question.value ? question.value.meter.split('/').map(Number) : null))

function optItems(d) {
  const q = question.value
  const v = VALUES[d]
  return [q.kind === 'rest' ? { type: 'rest', ...v } : { type: 'note', ...v, pos: 5 }]
}

function optClass(d) {
  if (!quiz.result.value) return ''
  if (d === question.value.missing) return 'ok'
  if (quiz.result.value === 'bad' && chosen.value === d) return 'bad'
  return ''
}

const label = (d) => valueLabel(VALUES[d].base, VALUES[d].dots, question.value.kind)
</script>

<template>
  <QuizFrame
    title="Takte vervollständigen"
    :phase="quiz.phase.value"
    :index="quiz.index.value"
    :total="quiz.total"
    :score="quiz.score.value"
    @back="$emit('back')"
    @start="quiz.start"
    @settings="quiz.phase.value = 'settings'"
  >
    <template #settings>
      <OptionGroup
        v-model="settings.meter"
        label="Taktart"
        :options="[
          { value: '2/4', label: '2/4' },
          { value: '3/4', label: '3/4' },
          { value: '4/4', label: '4/4' },
          { value: '6/8', label: '6/8' },
          { value: '3/8', label: '3/8' },
          { value: 'mix', label: 'Gemischt' },
        ]"
      />
      <OptionGroup
        v-model="settings.level"
        label="Notenwerte"
        :options="[
          { value: 0, label: 'Ganze – Viertel' },
          { value: 1, label: '+ Achtel' },
          { value: 2, label: '+ Punktierte, 16tel' },
        ]"
      />
      <OptionGroup
        v-model="settings.missing"
        label="Gesucht ist"
        :options="[
          { value: 'note', label: 'Note' },
          { value: 'rest', label: 'Pause' },
          { value: 'both', label: 'Beides' },
        ]"
      />
    </template>

    <template v-if="question">
      <div class="card">
        <Staff clef="treble" :time-sig="timeSig" :items="items" bar :min-width="30" />
      </div>
      <div class="feedback" :class="quiz.result.value">
        <template v-if="!quiz.result.value">
          Welche {{ question.kind === 'rest' ? 'Pause' : 'Note' }} fehlt im {{ question.meter }}-Takt?
        </template>
        <template v-else-if="quiz.result.value === 'ok'">Richtig! {{ label(question.missing) }} ✓</template>
        <template v-else>Leider falsch – es fehlt: {{ label(question.missing) }}</template>
      </div>
      <div class="answers">
        <button
          v-for="d in question.options"
          :key="d"
          :class="['btn', optClass(d)]"
          :disabled="!!quiz.result.value"
          :aria-label="label(d)"
          @click="answer(d)"
        >
          <Staff :items="optItems(d)" :lines="false" :min-width="7" :top="4" :height="9" />
        </button>
      </div>
      <button v-if="quiz.result.value" class="btn primary big next" @click="quiz.next()">Weiter</button>
    </template>
  </QuizFrame>
</template>

<style scoped>
.card { background: var(--card); border-radius: var(--radius); padding: 12px 6px; }
.feedback { text-align: center; font-weight: 600; min-height: 3em; }
.feedback.ok { color: var(--ok); }
.feedback.bad { color: var(--bad); }
.answers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.answers .btn { min-height: 90px; padding: 4px; }
.answers .btn :deep(svg) { height: 84px; width: 100%; }
.next { margin-top: auto; }
</style>
