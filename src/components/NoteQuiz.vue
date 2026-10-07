<script setup>
import { computed, ref } from 'vue'
import QuizFrame from './QuizFrame.vue'
import OptionGroup from './OptionGroup.vue'
import Staff from './Staff.vue'
import { useQuiz } from '../composables/useQuiz.js'
import { useSettings } from '../storage.js'
import { CLEFS, LETTERS, SHARPABLE, FLATTABLE, noteName, pick, rand } from '../music.js'

defineEmits(['back'])

const settings = useSettings('notes', { clef: 'treble', range: 1, accidentals: false })
const RANGES = { 0: [0, 8], 1: [-2, 10], 2: [-5, 13] }

const question = ref(null)
const acc = ref(0)

function generate() {
  const [lo, hi] = RANGES[settings.range]
  const clef = settings.clef === 'both' ? pick(['treble', 'bass']) : settings.clef
  let pos, letter
  do {
    pos = lo + rand(hi - lo + 1)
    letter = (((CLEFS[clef].bottomStep + pos) % 7) + 7) % 7
  } while (question.value && question.value.pos === pos && question.value.clef === clef)
  let a = 0
  if (settings.accidentals && rand(2)) {
    const opts = []
    if (SHARPABLE.includes(letter)) opts.push(1)
    if (FLATTABLE.includes(letter)) opts.push(-1)
    if (opts.length) a = pick(opts)
  }
  question.value = { clef, pos, letter, acc: a }
  acc.value = 0
}

const quiz = useQuiz('notes', generate)
const answered = ref(null)

function answer(letter) {
  if (quiz.result.value) return
  const q = question.value
  answered.value = { letter, acc: settings.accidentals ? acc.value : 0 }
  quiz.submit(letter === q.letter && answered.value.acc === q.acc)
}

const items = computed(() => {
  const q = question.value
  if (!q) return []
  return [{ type: 'note', pos: q.pos, base: 4, acc: q.acc || undefined, state: quiz.result.value ?? undefined }]
})

const correctName = computed(() => (question.value ? noteName(question.value.letter, question.value.acc) : ''))

function btnClass(i) {
  if (!quiz.result.value) return ''
  if (i === question.value.letter) return 'ok'
  if (quiz.result.value === 'bad' && answered.value?.letter === i) return 'bad'
  return ''
}

function next() {
  quiz.next()
}
</script>

<template>
  <QuizFrame
    title="Noten bestimmen"
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
        v-model="settings.clef"
        label="Notenschlüssel"
        :options="[
          { value: 'treble', label: '𝄞 Violin' },
          { value: 'bass', label: '𝄢 Bass' },
          { value: 'both', label: 'Beide' },
        ]"
      />
      <OptionGroup
        v-model="settings.range"
        label="Tonraum"
        :options="[
          { value: 0, label: 'Nur im System' },
          { value: 1, label: '+ Hilfslinien' },
          { value: 2, label: 'Weit' },
        ]"
      />
      <OptionGroup
        v-model="settings.accidentals"
        label="Vorzeichen (♯ ♭)"
        :options="[
          { value: false, label: 'Aus' },
          { value: true, label: 'An' },
        ]"
      />
    </template>

    <template v-if="question">
      <div class="card">
        <Staff class="single" :clef="question.clef" :items="items" :min-width="17" />
      </div>
      <div class="feedback" :class="quiz.result.value">
        <template v-if="!quiz.result.value">Welche Note ist das?</template>
        <template v-else-if="quiz.result.value === 'ok'">Richtig! {{ correctName }} ✓</template>
        <template v-else>Leider falsch – das ist {{ correctName }}</template>
      </div>
      <div v-if="settings.accidentals" class="acc">
        <button
          v-for="a in [{ v: 0, t: '♮' }, { v: 1, t: '♯' }, { v: -1, t: '♭' }]"
          :key="a.v"
          :class="['btn', { on: acc === a.v }]"
          :disabled="!!quiz.result.value"
          @click="acc = a.v"
        >
          <span class="sym">{{ a.t }}</span>
        </button>
      </div>
      <div class="answers">
        <button
          v-for="(l, i) in LETTERS"
          :key="l"
          :class="['btn', btnClass(i)]"
          :disabled="!!quiz.result.value"
          @click="answer(i)"
        >
          {{ l }}
        </button>
      </div>
      <button v-if="quiz.result.value" class="btn primary big next" @click="next">Weiter</button>
    </template>
  </QuizFrame>
</template>

<style scoped>
.card { background: var(--card); border-radius: var(--radius); padding: 12px 8px; }
.single { max-width: 360px; margin: 0 auto; }
.feedback { text-align: center; font-weight: 600; min-height: 1.6em; }
.feedback.ok { color: var(--ok); }
.feedback.bad { color: var(--bad); }
.answers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.answers .btn { min-height: 64px; font-size: 1.4rem; }
.acc { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.sym { font-size: 1.5rem; }
.next { margin-top: auto; }
</style>
