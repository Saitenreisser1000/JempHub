<template>
  <div class="fb-context-menu">
    <div class="fb-rail-controls fb-inline-controls">
      <div class="fb-note-panel">
        <div class="text-caption">{{ t('modeSelector.noteValue') }}</div>
        <v-btn-toggle v-model="noteValueLocal" mandatory divided class="fb-note-toggle-row">
          <v-btn
            v-for="item in modeItems"
            :key="item.value"
            :value="item.value"
            variant="tonal"
            size="small"
            :title="item.title"
          >
            <span class="fb-note-glyph">
              <span
                class="fb-note-glyph-img"
                :style="{ maskImage: `url(${item.icon})` }"
                aria-hidden="true"
              ></span>
            </span>
          </v-btn>
        </v-btn-toggle>

        <div class="fb-modifier-sections">
          <div class="fb-modifier-section">
            <div class="text-caption">Modifier</div>
            <v-btn-toggle v-model="noteModifierLocal" divided class="fb-note-toggle-row">
              <v-btn value="dotted" variant="tonal" size="small" :title="t('modeSelector.dotted')">.</v-btn>
              <v-btn value="3" variant="tonal" size="small" :title="t('modeSelector.triplets')">3</v-btn>
            </v-btn-toggle>
          </div>
          <span class="fb-modifier-divider" aria-hidden="true"></span>
          <div class="fb-chord-section">
            <div class="text-caption fb-chord-heading">Chords</div>
            <v-btn
              size="small"
              variant="tonal"
              class="fb-modifier-chord-btn"
              :active="Boolean(isSimOn)"
              :color="isSimOn ? 'primary' : undefined"
              :title="isSimOn ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
              :aria-pressed="String(isSimOn)"
              @click="toggleSim"
            >
              <span class="fb-chord-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <line x1="7.75" y1="2" x2="7.75" y2="22" />
                  <ellipse cx="12.4" cy="7.1" rx="5.1" ry="3.6" transform="rotate(-34 12.4 7.1)" />
                  <ellipse cx="12.4" cy="15.4" rx="5.1" ry="3.6" transform="rotate(-34 12.4 15.4)" />
                </svg>
              </span>
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <div class="fb-fret-actions-erase">
      <button
        class="fb-shape-btn fb-delete-toggle"
        :class="{ 'is-active': settings.eraseMode }"
        type="button"
        @click="toggleEraseMode"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { NOTE_VALUE_ITEMS } from '@/config/noteValues'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

defineOptions({ name: 'FretboardContextMenu' })

const settings = useTimelineSettingsStore()
const { t } = useI18n()

const modeItems = computed(() =>
  NOTE_VALUE_ITEMS.map((item) => ({
    ...item,
    title: t(`noteValues.${item.value.replace('/', '_')}`, item.title),
  })),
)

const lastNonSimMode = ref(
  settings.selectedMode !== 'sim'
    ? String(settings.selectedMode)
    : String(settings.lastRhythmMode || '1/4'),
)

watch(
  () => settings.selectedMode,
  (val) => {
    if (val !== 'sim') lastNonSimMode.value = String(val || '1/4')
  },
  { immediate: true },
)

const noteValueLocal = computed({
  get: () =>
    settings.selectedMode === 'sim' ? lastNonSimMode.value : String(settings.selectedMode || '1/4'),
  set: (v) => {
    const mode = String(v || '1/4')
    if (mode !== 'sim') lastNonSimMode.value = mode
    settings.setSelectedMode(mode)
  },
})

const noteModifierLocal = ref(String(settings.simGroupMode || ''))

watch(
  () => settings.simGroupMode,
  (val) => {
    const next = String(val || '')
    if (next !== noteModifierLocal.value) noteModifierLocal.value = next
  },
  { immediate: true },
)

watch(noteModifierLocal, (val) => {
  const next = String(val || '')
  if (next !== String(settings.simGroupMode || '')) settings.setSimGroupMode(next)
})

const isSimOn = computed(() => settings.selectedMode === 'sim')

function toggleSim() {
  if (isSimOn.value) {
    settings.setSelectedMode(lastNonSimMode.value || '1/4')
    return
  }
  settings.setSelectedMode('sim')
}

function toggleEraseMode() {
  settings.setEraseMode(!settings.eraseMode)
}

</script>

<style scoped>
.fb-context-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 2px 0;
}

.fb-rail-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 0;
}

.fb-rail-controls.fb-inline-controls {
  flex-direction: column;
  align-items: stretch;
  flex-wrap: nowrap;
}

.fb-note-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 10px;
  background: var(--app-grad-section);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
}

.fb-modifier-sections {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.fb-modifier-section,
.fb-chord-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fb-chord-section {
  align-items: center;
}

.fb-modifier-divider {
  width: 1px;
  align-self: stretch;
  background: var(--app-glass-4);
}

.fb-chord-heading {
  min-width: 44px;
  text-align: center;
}

.fb-modifier-chord-btn {
  min-width: 44px !important;
  width: 44px;
  min-height: 44px !important;
  height: 44px !important;
  border-radius: 10px !important;
  padding: 0 !important;
}

.fb-tool-separator {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid rgb(255 255 255 / 0.06);
}

.fb-fret-actions-erase {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
  margin-bottom: 4px;
  padding: 12px 10px;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 10px;
  background: var(--app-grad-section-soft);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.024);
}

.fb-context-menu :deep(.fb-top-control) {
  min-height: 28px !important;
  height: 28px !important;
  min-width: 36px;
  border-radius: 10px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
}

.fb-note-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 15px;
}

.fb-chord-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.fb-chord-icon svg {
  width: 18px;
  height: 18px;
  overflow: visible;
}

.fb-chord-icon path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fb-chord-icon line {
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.fb-chord-icon ellipse {
  fill: currentColor;
  stroke: none;
}

.fb-note-glyph-img {
  width: 24px;
  height: 24px;
  background-color: currentColor;
  mask-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
}

.fb-note-toggle-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.fb-note-toggle-row :deep(.v-btn) {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  border-radius: 10px;
}

.fb-shape-btn {
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgb(255 255 255 / 0.08);
  background: var(--app-grad-control);
  color: var(--app-text);
  font-size: 12px;
  font-weight: 700;
  padding: 0 12px;
  cursor: pointer;
  transition:
    background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fb-shape-btn:hover {
  background: var(--app-grad-control-hover);
  transform: translateY(-1px);
}

.fb-shape-btn.is-active {
  border-color: rgb(208 138 67 / 0.55);
  background: color-mix(in srgb, var(--color-primary) 18%, var(--app-layer-1) 82%);
  color: var(--color-surface-2);
}

.fb-shape-btn.is-danger {
  color: var(--color-error);
}

.fb-fret-actions-erase .fb-shape-btn {
  border-color: rgb(241 34 46 / 0.5);
  background: var(--app-grad-danger);
  color: var(--color-error);
}

.fb-fret-actions-erase .fb-shape-btn:hover {
  background: var(--app-grad-danger-hover);
}

.fb-fret-actions-erase .fb-delete-toggle {
  border-color: rgb(241 34 46 / 0.5);
  background: var(--app-grad-danger);
  color: var(--color-error);
}

.fb-fret-actions-erase .fb-delete-toggle:hover {
  background: var(--app-grad-danger-hover);
}

.fb-fret-actions-erase .fb-delete-toggle.is-active {
  border-color: var(--color-error);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-error) 72%, white 28%), var(--color-error));
  color: var(--color-surface);
}

.fb-clear-wrap {
  position: relative;
  display: inline-flex;
}

.fb-clear-confirm-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 30;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 250px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 12px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-2) 98%, transparent), color-mix(in srgb, var(--app-layer-1) 98%, transparent));
  box-shadow: 0 14px 26px rgb(0 0 0 / 0.28);
}

.fb-clear-confirm-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text);
}

.fb-clear-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.fb-clear-confirm-btn {
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgb(255 255 255 / 0.08);
  background: var(--app-grad-control);
  color: var(--app-text);
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  cursor: pointer;
}

.fb-clear-confirm-btn.is-danger {
  border-color: var(--color-error);
  background: var(--color-error);
  color: var(--color-surface);
}
</style>
