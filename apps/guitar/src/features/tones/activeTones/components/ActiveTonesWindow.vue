<template>
  <div class="active-tones-window">
    <div class="header-row">
      <h2>{{ t('activeTones.title') }}</h2>
      <button class="clear-btn" type="button" :disabled="activeNotes.length === 0" @click="clearAll">
        {{ t('activeTones.clear') }}
      </button>
    </div>
    <div class="tones-list">
      <div v-if="activeNotes.length === 0" class="empty-message">{{ t('activeTones.empty') }}</div>
      <div v-else>
        <div
          v-for="note in sortedActiveNotes"
          :key="note.key"
          class="tone-item"
          :class="{ 'is-selected': isSelected(note.key) }"
          @click="selectNote(note.key)"
        >
          <div class="tone-left">
            <span class="tone-color" :style="{ backgroundColor: note.color ?? '#d32f2f' }" />
            <span class="tone-label">
              {{ t('activeTones.fretString', { fret: note.fret, string: note.string }) }}
              <span class="tone-pitch">{{ pitchLabelFor(note) }}</span>
            </span>
          </div>
          <button class="remove-btn" @click.stop="removeNote(note.key)">✕</button>
        </div>
      </div>
    </div>
    <div class="info">
      <p><strong>{{ t('activeTones.total') }}</strong> {{ t('activeTones.totalCount', { count: activeNotes.length }) }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useInstrumentStore } from '@/store/useInstrument'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { useI18n } from '@/i18n'

defineOptions({ name: 'ActiveTonesWindow' })

const store = useNotesStore()
const selection = useSelectionStore()
const instrument = useInstrumentStore()
const { t } = useI18n()
const activeNotes = computed(() => store.activeNotes)

function isSelected(noteKey) {
  return selection.isSelected(noteKey)
}

const tuning = computed(() => getTuning(instrument.tuningId))

const sortedActiveNotes = computed(() => {
  return [...activeNotes.value].sort((a, b) => {
    const ga = Number.isFinite(a?.gridIndex) ? a.gridIndex : 0
    const gb = Number.isFinite(b?.gridIndex) ? b.gridIndex : 0
    if (ga !== gb) return ga - gb
    if (a.fret !== b.fret) return a.fret - b.fret
    return a.string - b.string
  })
})

function selectNote(noteKey) {
  selection.selectNote(noteKey)
}

function removeNote(noteKey) {
  if (selection.selectedNoteKey === String(noteKey)) selection.clearSelection()
  store.removeNote(noteKey)
}

function pitchLabelFor(note) {
  const t = tuning.value
  if (!t) return ''
  const stringIdx = Number(note?.string) - 1
  const open = t.openMidi?.[stringIdx]
  if (!Number.isFinite(Number(open))) return ''
  const fret = Number.isFinite(Number(note?.fret)) ? Number(note.fret) : 0
  const midi = Number(open) + fret
  return midiToNoteName(midi, { includeOctave: true })
}

function clearAll() {
  selection.clearSelection()
  store.clearNotes()
}
</script>

<style scoped>
.active-tones-window {
  padding: 14px;
  border: 0;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  box-shadow: var(--elev-1);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.header-row h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: var(--color-text);
  font-size: 18px;
}

.clear-btn {
  background: color-mix(in srgb, var(--color-surface) 90%, var(--color-surface-2) 10%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 700;
  color: var(--color-text);
}

.clear-btn:hover:enabled {
  background: color-mix(in srgb, var(--color-surface) 82%, var(--color-primary) 18%);
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tones-list {
  margin-bottom: 15px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-surface) 97%, var(--color-surface-2) 3%);
}

.empty-message {
  padding: 15px;
  text-align: center;
  color: var(--color-text-muted);
  font-style: italic;
}

.tone-item {
  padding: 10px 15px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.tone-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tone-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.tone-item.is-selected {
  background-color: color-mix(in srgb, var(--color-primary) 16%, transparent);
  outline: 2px solid color-mix(in srgb, var(--color-primary) 72%, transparent);
  outline-offset: -2px;
}

.tone-item:last-child {
  border-bottom: none;
}

.tone-item:hover {
  background-color: color-mix(in srgb, var(--color-surface) 84%, var(--color-primary) 16%);
}

.tone-label {
  color: var(--color-text);
  font-weight: 500;
  font-size: 0.5em;
}

.remove-btn {
  background: color-mix(in srgb, var(--color-error) 88%, transparent);
  color: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-error) 72%, transparent);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.5em;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.remove-btn:hover {
  background: color-mix(in srgb, var(--color-error) 100%, black 6%);
}

.info {
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.info p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}
.tone-pitch {
  margin-left: 8px;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
  font-size: 1em;
}
</style>
