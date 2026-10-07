import { ref } from 'vue'
import { recordAnswer, recordRound } from '../storage.js'

export function useQuiz(key, onQuestion, total = 10) {
  const phase = ref('settings') // settings | playing | result
  const index = ref(0)
  const score = ref(0)
  const result = ref(null) // null | 'ok' | 'bad'

  function start() {
    phase.value = 'playing'
    index.value = 0
    score.value = 0
    result.value = null
    onQuestion()
  }

  function submit(ok) {
    if (result.value) return
    result.value = ok ? 'ok' : 'bad'
    if (ok) score.value++
    else navigator.vibrate?.(120)
    recordAnswer(key, ok)
  }

  function next() {
    if (index.value + 1 >= total) {
      recordRound(key, score.value)
      phase.value = 'result'
      return
    }
    index.value++
    result.value = null
    onQuestion()
  }

  return { phase, index, score, result, total, start, submit, next }
}
