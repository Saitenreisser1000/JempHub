<script setup>
import { computed, ref } from 'vue'
import QuizFrame from './QuizFrame.vue'
import OptionGroup from './OptionGroup.vue'
import Staff from './Staff.vue'
import { useQuiz } from '../composables/useQuiz.js'
import { useSettings } from '../storage.js'
import { BASES, beatsText, pick, rand, valueLabel } from '../music.js'

defineEmits(['back'])

const settings = useSettings('values', { kind: 'both', level: 1, dotted: false })
const LEVELS = { 0: [16, 8, 4], 1: [16, 8, 4, 2], 2: [16, 8, 4, 2, 1] }

const bases = computed(() => LEVELS[settings.level])
const question = ref(null)
const dotted = ref(false)
const answered = ref(null)

function generate() {
  let q
  do {
    const kind = settings.kind === 'both' ? pick(['note', 'rest']) : settings.kind
    q = {
      kind,
      base: pick(bases.value),
      dots: settings.dotted && rand(2) ? 1 : 0,
      pos: 2 + rand(5),
    }
  } while (question.value && question.value.kind === q.kind && question.value.base === q.base && question.value.dots === q.dots)
  question.value = q
  dotted.value = false
  answered.value = null
}

const quiz = useQuiz('values', generate)

function answer(base) {
  if (quiz.result.value) return
  const q = question.value
  answered.value = base
  quiz.submit(base === q.base && (settings.dotted ? dotted.value : false) === !!q.dots)
}

const items = computed(() => {
  const q = question.value
  if (!q) return []
  const state = quiz.result.value ?? undefined
  return [q.kind === 'rest'
    ? { type: 'rest', base: q.base, dots: q.dots, state }
    : { type: 'note', pos: q.pos, base: q.base, dots: q.dots, state }]
})

const correct = computed(() => (question.value ? `${valueLabel(question.value.base, question.value.dots, question.value.kind)} (${beatsText(question.value.base, question.value.dots)})` : ''))

function btnClass(b) {
  if (!quiz.result.value) return ''
  if (b === question.value.base) return 'ok'
  if (quiz.result.value === 'bad' && answered.value === b) return 'bad'
  return ''
}
</script>

<template>
  <QuizFrame
    title="Notenwerte & Pausen"
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
        v-model="settings.kind"
        label="Was üben?"
        :options="[
          { value: 'note', label: 'Noten' },
          { value: 'rest', label: 'Pausen' },
          { value: 'both', label: 'Beides' },
        ]"
      />
      <OptionGroup
        v-model="settings.level"
        label="Notenwerte"
        :options="[
          { value: 0, label: 'Ganze – Viertel' },
          { value: 1, label: '+ Achtel' },
          { value: 2, label: '+ Sechzehntel' },
        ]"
      />
      <OptionGroup
        v-model="settings.dotted"
        label="Punktierte Werte"
        :options="[
          { value: false, label: 'Aus' },
          { value: true, label: 'An' },
        ]"
      />
    </template>

    <template v-if="question">
      <div class="card">
        <Staff class="single" :items="items" :min-width="12" :top="2" :height="12" />
      </div>
      <div class="feedback" :class="quiz.result.value">
        <template v-if="!quiz.result.value">
          {{ question.kind === 'rest' ? 'Welche Pause ist das?' : 'Welcher Notenwert ist das?' }}
        </template>
        <template v-else-if="quiz.result.value === 'ok'">Richtig! {{ correct }} ✓</template>
        <template v-else>Leider falsch – das ist: {{ correct }}</template>
      </div>
      <button
        v-if="settings.dotted"
        :class="['btn', { on: dotted }]"
        :disabled="!!quiz.result.value"
        @click="dotted = !dotted"
      >
        {{ dotted ? '● Punktiert' : '○ Punktiert (antippen)' }}
      </button>
      <div class="answers">
        <button
          v-for="b in bases"
          :key="b"
          :class="['btn', btnClass(b)]"
          :disabled="!!quiz.result.value"
          @click="answer(b)"
        >
          {{ BASES[b].name }}
        </button>
      </div>
      <button v-if="quiz.result.value" class="btn primary big next" @click="quiz.next()">Weiter</button>
    </template>
  </QuizFrame>
</template>

<style scoped>
.card { background: var(--card); border-radius: var(--radius); padding: 12px 8px; }
.single { max-width: 300px; margin: 0 auto; }
.feedback { text-align: center; font-weight: 600; min-height: 3em; }
.feedback.ok { color: var(--ok); }
.feedback.bad { color: var(--bad); }
.answers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.answers .btn { min-height: 64px; font-size: 1.1rem; }
.next { margin-top: auto; }
</style>
