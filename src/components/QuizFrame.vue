<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  phase: String,
  index: Number,
  total: Number,
  score: Number,
})
const emit = defineEmits(['back', 'start', 'settings'])

const message = computed(() => {
  const r = props.score / props.total
  if (r === 1) return 'Perfekt! 🎉'
  if (r >= 0.8) return 'Sehr gut! 👏'
  if (r >= 0.5) return 'Gut gemacht – weiter üben! 💪'
  return 'Übung macht den Meister! 🎼'
})
</script>

<template>
  <div class="frame">
    <header>
      <button class="back" aria-label="Zurück" @click="emit('back')">←</button>
      <h1>{{ title }}</h1>
      <span v-if="phase === 'playing'" class="score">✔ {{ score }}</span>
      <button v-else-if="phase === 'result'" class="back" aria-label="Einstellungen" @click="emit('settings')">⚙</button>
    </header>
    <div v-if="phase === 'playing'" class="bar"><div :style="{ width: (index / total) * 100 + '%' }" /></div>

    <main v-if="phase === 'settings'" class="pad">
      <slot name="settings" />
      <button class="btn primary big" @click="emit('start')">Los geht's</button>
    </main>

    <main v-else-if="phase === 'playing'" class="play">
      <div class="count">Aufgabe {{ index + 1 }} von {{ total }}</div>
      <slot />
    </main>

    <main v-else class="pad result">
      <div class="emoji">{{ message }}</div>
      <div class="big-score">{{ score }} / {{ total }}</div>
      <button class="btn primary big" @click="emit('start')">Nochmal</button>
      <button class="btn big" @click="emit('settings')">Einstellungen</button>
      <button class="btn big" @click="emit('back')">Zum Menü</button>
    </main>
  </div>
</template>

<style scoped>
.frame { display: flex; flex-direction: column; min-height: 100%; max-width: 560px; margin: 0 auto; padding-top: env(safe-area-inset-top); }
header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
h1 { flex: 1; margin: 0; font-size: 1.2rem; }
.back { width: 44px; height: 44px; border-radius: 12px; border: 0; background: var(--card); font-size: 1.3rem; }
.score { font-weight: 700; color: var(--ok); padding: 0 8px; }
.bar { height: 6px; background: var(--line); margin: 0 16px; border-radius: 3px; overflow: hidden; }
.bar div { height: 100%; background: var(--primary); transition: width .3s; }
main { flex: 1; display: flex; flex-direction: column; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); gap: 12px; }
.pad > .btn:last-child { margin-top: auto; }
.count { color: var(--muted); font-size: .9rem; text-align: center; }
.result { align-items: stretch; text-align: center; justify-content: center; }
.result .emoji { font-size: 1.6rem; font-weight: 700; }
.result .big-score { font-size: 4rem; font-weight: 800; color: var(--primary); margin-bottom: 16px; }
.result .btn:last-child { margin-top: 0; }
</style>
