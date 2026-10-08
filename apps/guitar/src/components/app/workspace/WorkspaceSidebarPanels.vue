<template>
  <div class="app-sidebar-content">
    <div class="app-sidebar-tabs">
      <button type="button" class="app-sidebar-tab" :class="{ 'is-active': modelValue === 'shapes' }" @click="emit('update:modelValue', 'shapes')">
        Shapes
      </button>
      <button type="button" class="app-sidebar-tab" :class="{ 'is-active': modelValue === 'scale' }" @click="emit('update:modelValue', 'scale')">
        Scales
      </button>
      <button type="button" class="app-sidebar-tab" :class="{ 'is-active': modelValue === 'chords' }" @click="emit('update:modelValue', 'chords')">
        Chords
      </button>
    </div>
    <div class="app-sidebar-panel">
      <div v-if="modelValue === 'shapes'" class="app-sidebar-menu app-sidebar-empty" />
      <div v-else-if="modelValue === 'scale'" class="app-sidebar-form">
        <section class="app-sidebar-section">
          <div class="app-sidebar-section-title">Scale Display</div>
          <v-switch :model-value="harmony.showScale" density="compact" hide-details inset color="primary"
            label="Show Scale" @update:model-value="(v) => (harmony.showScale = Boolean(v))" />
        </section>
        <section class="app-sidebar-section">
          <div class="app-sidebar-section-title">Scale Setup</div>
          <v-select :model-value="harmony.scaleRoot" :items="songKeyOptions" label="Root" density="compact"
            hide-details @update:model-value="(v) => (harmony.scaleRoot = String(v || 'C'))" />
          <v-select :model-value="harmony.scaleType" :items="scaleTypeOptions" label="Scale Type"
            density="compact" hide-details
            @update:model-value="(v) => (harmony.scaleType = String(v || scaleTypeOptions[0]))" />
          <v-select :model-value="harmony.position" :items="scalePositionOptions" label="Position"
            density="compact" hide-details
            @update:model-value="(v) => (harmony.position = String(v || 'Open'))" />
          <v-select :model-value="harmony.pattern" :items="scalePatternOptions" label="Pattern"
            density="compact" hide-details
            @update:model-value="(v) => (harmony.pattern = String(v || scalePatternOptions[0]))" />
        </section>
      </div>
      <div v-else class="app-sidebar-form">
        <section class="app-sidebar-section">
          <div class="app-sidebar-section-title">Chord Display</div>
          <v-switch :model-value="harmony.showChord" density="compact" hide-details inset color="primary"
            label="Show Chord Shape" @update:model-value="(v) => (harmony.showChord = Boolean(v))" />
        </section>
        <section class="app-sidebar-section">
          <div class="app-sidebar-section-title">Chord Setup</div>
          <v-select :model-value="harmony.chordRoot" :items="songKeyOptions" label="Root" density="compact"
            hide-details @update:model-value="(v) => (harmony.chordRoot = String(v || 'C'))" />
          <v-select :model-value="harmony.chordType" :items="chordTypeOptions" label="Chord Type"
            density="compact" hide-details
            @update:model-value="(v) => (harmony.chordType = String(v || chordTypeOptions[0]))" />
        </section>
        <section class="app-sidebar-section">
          <div class="app-sidebar-section-title">Voicing</div>
          <v-switch :model-value="harmony.chordPosition === 'Open'" density="compact" hide-details inset color="primary"
            label="Open" @update:model-value="(v) => (harmony.chordPosition = Boolean(v) ? 'Open' : '5')" />
          <v-select v-if="harmony.chordPosition !== 'Open'" :model-value="harmony.chordRootString"
            :items="harmonyRootStringOptions" label="Root String" density="compact" hide-details
            @update:model-value="(v) => (harmony.chordRootString = String(v || 'string-e'))" />
        </section>
        <section class="app-sidebar-section">
          <div class="app-sidebar-section-title">Timeline</div>
          <v-btn class="app-sidebar-action" color="primary" variant="flat"
            :disabled="!(harmony.activeChordShape?.positions || []).length"
            @click="emit('add-active-chord')">
            Add Chord
          </v-btn>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'

defineProps({
  modelValue: { type: String, required: true },
  songKeyOptions: { type: Array, required: true },
  chordTypeOptions: { type: Array, required: true },
  scaleTypeOptions: { type: Array, required: true },
  scalePositionOptions: { type: Array, required: true },
  scalePatternOptions: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue', 'add-active-chord'])
const harmony = useHarmonyMenuStore()
const harmonyRootStringOptions = [
  { title: 'String E', value: 'string-e' },
  { title: 'String A', value: 'string-a' },
  { title: 'String D', value: 'string-d' },
]
</script>

<style scoped>
.app-sidebar-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-1) 88%, transparent), color-mix(in srgb, var(--app-layer-0) 92%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.04),
    inset 0 -1px 0 rgb(0 0 0 / 0.24);
}

.app-sidebar-tabs {
  display: flex;
  align-items: end;
  gap: 8px;
  padding: 8px 10px 0;
  background: transparent;
  flex: 0 0 auto;
}

.app-sidebar-tab {
  min-width: 86px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: var(--app-glass-1);
  color: var(--app-text-dim);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color var(--ui-fast),
    color var(--ui-fast),
    border-color var(--ui-fast),
    transform var(--ui-fast);
}

.app-sidebar-tab.is-active {
  background: var(--app-layer-3);
  color: var(--app-text);
  border-color: color-mix(in srgb, var(--app-layer-3) 70%, var(--app-glass-4));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
  transform: translateY(1px);
}

.app-sidebar-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 10px 10px;
}

.app-sidebar-menu {
  flex: 1 1 auto;
  min-height: 0;
}

.app-sidebar-empty {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.app-sidebar-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 0;
}

.app-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 0;
  background: var(--app-grad-section);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
}

.app-sidebar-section-title {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--app-text-dim);
}

.app-sidebar-action {
  margin-top: 0;
  min-height: 36px;
}

:deep(.v-input) {
  margin-top: 0;
}

:deep(.v-field) {
  border-radius: 10px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-2) 94%, transparent), color-mix(in srgb, var(--app-layer-1) 98%, transparent));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.035);
}

:deep(.v-field__outline) {
  opacity: 0.7;
}

:deep(.v-field__input),
:deep(.v-select__selection-text),
:deep(.v-label),
:deep(.v-selection-control__label) {
  color: var(--app-text);
}

:deep(.v-btn) {
  border-radius: 10px;
}
</style>
