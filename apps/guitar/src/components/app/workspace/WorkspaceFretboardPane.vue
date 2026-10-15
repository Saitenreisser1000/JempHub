<template>
  <div class="fretboard-main" :class="{ 'is-read-only': !editable }">
    <div class="fretboard-pane-row">
      <div class="fretboard-pane-body" tabindex="0" role="region" :aria-label="t('modeSelector.fretboard')">
        <div v-if="editable && selectedNote" class="fretboard-selection-bar">
          <span class="fretboard-selection-note">
            <span class="fretboard-selection-swatch" :style="{ backgroundColor: selectedNote.color || 'currentColor' }" />
            {{ t('activeTones.fretString', { fret: selectedNote.fret, string: selectedNote.string }) }}
          </span>
          <span class="fretboard-selection-timing">
            {{ t('melodyInput.position', { bar: selectedPosition.bar, beat: formatNumber(selectedPosition.beat) }) }}
            · {{ t('melodyInput.duration', { value: selectedDuration }) }}
            <span v-if="selectedStack.total > 1" class="fretboard-selection-stack">
              · {{ t('melodyInput.stackPosition', { current: selectedStack.current, total: selectedStack.total }) }}
            </span>
          </span>
          <div class="fretboard-selection-actions">
            <v-btn size="small" variant="tonal" prepend-icon="mdi-repeat" class="fretboard-selection-action"
              :title="t('melodyInput.repeatHint')" @click="melodyInput.repeatSelected()">
              {{ t('melodyInput.repeat') }}
            </v-btn>
            <v-btn size="small" variant="tonal" color="error" prepend-icon="mdi-trash-can-outline"
              class="fretboard-selection-action" :title="t('melodyInput.deleteHint')"
              @click="melodyInput.deleteSelected()">
              {{ t('melodyInput.delete') }}
            </v-btn>
          </div>
        </div>
        <div v-if="editable" class="fretboard-pane-corner-tools">
          <v-menu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" class="fretboard-options-btn" size="small" variant="tonal" :title="t('modeSelector.options')"
                :aria-label="t('modeSelector.options')">
                <v-icon icon="mdi-cog-outline" size="16" />
              </v-btn>
            </template>
            <div class="fretboard-options-menu pa-3 d-flex flex-column ga-2">
              <div class="d-flex ga-2">
                <v-text-field :model-value="instrument.numStrings" density="compact" hide-details type="number" min="1"
                  step="1" :label="t('modeSelector.strings')" style="width: 96px"
                  @update:model-value="(v) => instrument.setNumStrings(v)" />
                <v-text-field :model-value="numFrets" density="compact" hide-details type="number" min="1" step="1"
                  :label="t('modeSelector.frets')" style="width: 96px" @update:model-value="(v) => emit('update-num-frets', v)" />
              </div>
              <v-select v-model="dotLabelModeModel" :items="dotLabelModeOptions" density="compact" hide-details
                label="Dot Labels" variant="outlined" :menu-props="{ contentClass: 'fretboard-options-select-menu' }" />
              <v-select v-if="dotLabelModeModel === 'play-order'" v-model="playOrderScopeModel"
                :items="playOrderScopeOptions" density="compact" hide-details label="Count Scope" variant="outlined"
                :menu-props="{ contentClass: 'fretboard-options-select-menu' }" />
              <v-switch :model-value="timelineSettings.leftHanded" density="compact" hide-details inset
                label="Left handed" @update:model-value="(v) => timelineSettings.setLeftHanded(Boolean(v))" />
              <v-switch :model-value="timelineSettings.handPositionVisible" density="compact" hide-details inset
                label="Hand position track"
                @update:model-value="(v) => timelineSettings.setHandPositionVisible(Boolean(v))" />
            </div>
          </v-menu>
        </div>
        <Fretboard :inert="!editable" :num-frets="numFrets" :editable="editable" :core-resize-px="coreResizePx"
          :is-phone-view="isPhoneView" :style="fretboardStyleVars" />
      </div>
      <div class="fretboard-pane-side">
        <div class="fretboard-pane-side-stack">
          <h2 class="fretboard-groups-heading">{{ t('ux.toneGroups') }}</h2>
          <div v-if="editable" class="fretboard-side-toolbar">
            <v-menu location="bottom end" :close-on-content-click="false">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="fretboard-color-btn">
                  {{ t('ux.color') }}
                </v-btn>
              </template>
              <div class="fretboard-color-menu pa-2">
                <ColorPalette orientation="horizontal" />
              </div>
            </v-menu>
          </div>
          <div class="fretboard-dot-groups" :class="{ 'is-empty': !hasDotGroups }">
            <div class="fretboard-dot-groups-list">
              <p v-if="!hasDotGroups" class="fretboard-empty-hint">{{ editable ? t('ux.startHint') : t('activeTones.empty') }}</p>
              <v-btn v-else variant="tonal" size="small" class="justify-start fretboard-dot-group-btn"
                :class="{ 'is-active': hasDotGroups && allDotGroupsSelected, 'is-disabled': !hasDotGroups }"
                :aria-pressed="hasDotGroups && allDotGroupsSelected"
                :disabled="!hasDotGroups" @click="emit('activate-all-dot-groups')">
                {{ t('recordingSelector.all') }}
              </v-btn>
              <div v-for="group in usedDotGroups" :key="group.color" class="fretboard-dot-group-row">
                <v-btn variant="tonal" size="small"
                  class="justify-start fretboard-dot-group-btn"
                  :class="{ 'is-active': String(timelineSettings.activeDotGroupColor || '') === group.color }"
                  :aria-pressed="String(timelineSettings.activeDotGroupColor || '') === group.color"
                  :style="{ borderLeft: `12px solid ${group.color}` }" :title="group.label"
                  @contextmenu.prevent="(event) => editable && emit('open-dot-group-menu', { event, group })"
                  @click="emit('activate-dot-group', group.color)">
                  {{ group.label }}
                </v-btn>
                <v-btn v-if="editable" variant="text" size="small" icon="mdi-trash-can-outline"
                  class="fretboard-dot-group-delete" :aria-label="`${group.label} löschen`"
                  :title="`${group.label} samt Noten löschen (Undo möglich)`"
                  @click.stop="emit('delete-dot-group', group.color)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Fretboard from '@/features/fretboard'
import ColorPalette from '@/features/fretboard/components/ColorPalette.vue'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useI18n } from '@/i18n'
import {
  musicalPositionForNote,
  useSafeMelodyInput,
} from '@/features/fretboard/composables/useSafeMelodyInput'

const { t } = useI18n()

const props = defineProps({
  numFrets: { type: Number, required: true },
  editable: { type: Boolean, default: true },
  coreResizePx: { type: Number, default: 0 },
  isPhoneView: { type: Boolean, default: false },
  fretboardStyleVars: { type: Object, default: () => ({}) },
  hasDotGroups: { type: Boolean, default: false },
  allDotGroupsSelected: { type: Boolean, default: true },
  usedDotGroups: { type: Array, default: () => [] },
  dotLabelMode: { type: String, default: 'rhythm' },
  playOrderScope: { type: String, default: 'song' },
  dotLabelModeOptions: { type: Array, required: true },
  playOrderScopeOptions: { type: Array, required: true },
})

const emit = defineEmits([
  'update-num-frets',
  'update:dot-label-mode',
  'update:play-order-scope',
  'open-dot-group-menu',
  'activate-all-dot-groups',
  'activate-dot-group',
  'delete-dot-group',
])

const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()
const melodyInput = useSafeMelodyInput({ editable: computed(() => props.editable) })
const selectedNote = melodyInput.selectedNote

const selectedPosition = computed(() =>
  musicalPositionForNote(selectedNote.value, {
    beatTop: timelineSettings.beatTop,
    beatBottom: timelineSettings.beatBottom,
  }),
)

const selectedDuration = computed(() => {
  const noteValue = String(selectedNote.value?.noteValue || '').trim()
  if (noteValue) return noteValue
  return `${formatNumber(selectedNote.value?.lengthBlocks)} ${t('melodyInput.blocks')}`
})

const selectedStack = computed(() => {
  const note = selectedNote.value
  if (!note) return { current: 0, total: 0 }
  const stack = melodyInput.notesAtPosition(note.fret, note.string)
  const index = stack.findIndex((item) => String(item?.key || '') === String(note.key || ''))
  return { current: index >= 0 ? index + 1 : 1, total: stack.length }
})

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '1'
  return Number(number.toFixed(2)).toString()
}

const dotLabelModeModel = computed({
  get: () => String(props.dotLabelMode || 'rhythm'),
  set: (value) => emit('update:dot-label-mode', String(value || 'rhythm')),
})

const playOrderScopeModel = computed({
  get: () => String(props.playOrderScope || 'song'),
  set: (value) => emit('update:play-order-scope', String(value || 'song')),
})
</script>

<style scoped>
.fretboard-main {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px;
  border-radius: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-1) 88%, transparent), color-mix(in srgb, var(--app-layer-0) 92%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.035),
    inset 0 -1px 0 rgb(0 0 0 / 0.24),
    0 18px 38px rgb(0 0 0 / 0.12);
}

.fretboard-pane-row {
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
  min-height: 0;
  width: 100%;
  gap: 12px;
}

.fretboard-pane-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  padding: 6px 8px 8px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-3) 92%, transparent), color-mix(in srgb, var(--app-layer-2) 94%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.045),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 10px 20px rgb(0 0 0 / 0.12);
}

.fretboard-pane-corner-tools {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.fretboard-selection-bar {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin: 0 56px 8px 0;
  padding: 5px 6px 5px 10px;
  border: 1px solid rgb(124 175 233 / 0.22);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-layer-overlay) 88%, transparent);
  box-shadow: 0 8px 20px rgb(4 8 14 / 0.3);
  backdrop-filter: blur(14px);
}

.fretboard-selection-note,
.fretboard-selection-timing {
  white-space: nowrap;
}

.fretboard-selection-note {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 800;
}

.fretboard-selection-swatch {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.28);
}

.fretboard-selection-timing {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-muted);
  font-size: 12px;
}

.fretboard-selection-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.fretboard-selection-action {
  min-height: 44px;
  text-transform: none;
  font-weight: 700;
}

.fretboard-pane-side {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  min-height: 0;
  width: 178px;
  min-width: 178px;
  max-width: 178px;
}

.fretboard-pane-side-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  padding: 8px;
  width: 178px;
  min-width: 178px;
  max-width: 178px;
  min-height: 100%;
  height: 100%;
  border: 1px solid rgb(116 163 221 / 0.16);
  border-radius: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-4) 88%, transparent), color-mix(in srgb, var(--app-layer-3) 92%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.05),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 14px 28px rgb(5 10 18 / 0.18);
}

.fretboard-options-btn {
  min-width: 44px;
  width: 44px;
  height: 44px;
  padding-inline: 0;
}

.fretboard-color-btn {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border-radius: 10px;
  text-transform: none;
  font-size: 11px;
  font-weight: 700;
}

.fretboard-side-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
}

.fretboard-color-menu {
  min-width: 184px;
  border: 1px solid rgb(124 175 233 / 0.18);
  border-radius: 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-overlay) 96%, transparent), color-mix(in srgb, var(--app-layer-4) 94%, transparent));
  box-shadow:
    0 14px 30px rgb(4 8 14 / 0.44),
    inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.fretboard-options-menu {
  min-width: 236px;
  border: 1px solid rgb(124 175 233 / 0.18);
  border-radius: var(--app-radius-lg);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-overlay) 92%, transparent), color-mix(in srgb, var(--app-layer-4) 96%, transparent));
  box-shadow:
    0 16px 36px rgb(3 8 15 / 0.42),
    0 4px 12px rgb(0 0 0 / 0.24),
    inset 0 1px 0 rgb(255 255 255 / 0.08);
  backdrop-filter: blur(18px);
  transform-origin: top right;
}

.fretboard-dot-groups {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.fretboard-dot-groups-list {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.fretboard-dot-group-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.fretboard-dot-group-row .fretboard-dot-group-btn {
  flex: 1 1 0;
  min-width: 0;
  width: 0;
}

.fretboard-dot-group-delete {
  flex: 0 0 32px;
  width: 32px;
  height: 36px;
}

.fretboard-dot-group-btn {
  min-height: 44px;
  width: 100%;
  max-width: 100%;
  justify-content: flex-start;
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fretboard-dot-group-btn.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface) 78%);
  color: var(--color-text);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 58%, transparent),
    0 1px 0 rgb(255 255 255 / 0.14);
}

.fretboard-dot-group-btn.is-disabled {
  opacity: 0.42;
}

.fretboard-dot-groups.is-empty .fretboard-dot-groups-list {
  overflow: auto;
}
.is-read-only {
  padding: 4px;
}
.is-read-only .fretboard-pane-row {
  gap: 4px;
}
.is-read-only .fretboard-pane-side,
.is-read-only .fretboard-pane-side-stack {
  width: clamp(100px, 16vw, 178px);
  min-width: 100px;
  max-width: 178px;
}
.is-read-only .fretboard-pane-side-stack {
  padding: 4px;
}

.fretboard-groups-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  padding: 4px 0;
}

.fretboard-empty-hint {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.fretboard-main :deep(.v-btn:focus-visible) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.fretboard-pane-body:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

@media (max-width: 600px) {
  .fretboard-main { padding: 8px; }
  .fretboard-pane-row { flex-direction: column; gap: 8px; }
  .fretboard-pane-body {
    flex: 0 0 220px;
    min-height: 220px;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .fretboard-pane-body :deep(.fretboard-body) {
    flex-shrink: 0;
    min-width: 680px;
  }
  .fretboard-selection-bar {
    flex-wrap: wrap;
  }
  .fretboard-selection-timing { flex: 1 1 220px; }
  .fretboard-pane-side,
  .fretboard-pane-side-stack,
  .is-read-only .fretboard-pane-side,
  .is-read-only .fretboard-pane-side-stack {
    width: 100%;
    min-width: 0;
    max-width: none;
    height: auto;
    min-height: 0;
  }
  .fretboard-pane-side { flex: 0 0 auto; }
  .fretboard-dot-groups-list { flex-direction: row; flex-wrap: wrap; overflow: visible; }
  .fretboard-dot-group-row { flex: 1 1 140px; min-width: 0; }
  .fretboard-empty-hint { padding: 0; }
}
</style>
