<script setup>
import { onBeforeUnmount, ref } from 'vue'
import NoteQuiz from './components/NoteQuiz.vue'
import ValueQuiz from './components/ValueQuiz.vue'
import MeasureQuiz from './components/MeasureQuiz.vue'
import { stats, resetStats } from './storage.js'

const view = ref(location.hash.slice(1) || 'home')
const onHash = () => (view.value = location.hash.slice(1) || 'home')
window.addEventListener('hashchange', onHash)
onBeforeUnmount(() => window.removeEventListener('hashchange', onHash))

const go = (v) => (location.hash = v === 'home' ? '' : v)

const cards = [
  { id: 'notes', icon: '\u{1D11E}', title: 'Noten bestimmen', text: 'Violin- und Bassschlüssel, Hilfslinien, Vorzeichen' },
  { id: 'values', icon: '\u{1D15E}', title: 'Notenwerte & Pausen', text: 'Ganze bis Sechzehntel, auch punktiert' },
  { id: 'measures', icon: '|', title: 'Takte vervollständigen', text: 'Welche Note oder Pause fehlt im Takt?' },
]

function statText(id) {
  const s = stats[id]
  if (!s?.answered) return 'Noch nicht geübt'
  return `${Math.round((s.correct / s.answered) * 100)} % richtig · Bestwert ${s.best}/10`
}
</script>

<template>
  <NoteQuiz v-if="view === 'notes'" @back="go('home')" />
  <ValueQuiz v-else-if="view === 'values'" @back="go('home')" />
  <MeasureQuiz v-else-if="view === 'measures'" @back="go('home')" />
  <div v-else class="home">
    <h1>🎼 NoteJemp</h1>
    <p class="sub">Wähle eine Übung</p>
    <button v-for="c in cards" :key="c.id" class="card" @click="go(c.id)">
      <span class="icon">{{ c.icon }}</span>
      <span class="body">
        <strong>{{ c.title }}</strong>
        <span>{{ c.text }}</span>
        <small>{{ statText(c.id) }}</small>
      </span>
    </button>
    <button class="reset" @click="resetStats">Statistik zurücksetzen</button>
  </div>
</template>

<style scoped>
.home { max-width: 560px; margin: 0 auto; padding: calc(24px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 14px; }
h1 { margin: 0; font-size: 2rem; }
.sub { margin: 0 0 6px; color: var(--muted); }
.card { display: flex; align-items: center; gap: 16px; text-align: left; background: var(--card); border: 2px solid var(--line); border-radius: var(--radius); padding: 18px; }
.card:active { transform: scale(.98); }
.icon { font-family: 'Bravura', serif; font-size: 2.4rem; width: 56px; height: 56px; display: grid; place-items: center; background: color-mix(in srgb, var(--primary) 16%, var(--card)); border-radius: 14px; color: var(--primary); flex: none; }
.body { display: flex; flex-direction: column; gap: 2px; }
.body span { color: var(--muted); font-size: .92rem; }
.body small { color: var(--primary); font-weight: 600; margin-top: 4px; }
.reset { margin-top: 12px; background: none; border: 0; color: var(--muted); text-decoration: underline; min-height: 44px; }
</style>
