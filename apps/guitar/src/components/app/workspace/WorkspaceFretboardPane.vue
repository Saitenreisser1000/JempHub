<template>
  <div class="fretboard-main">
    <div class="fretboard-pane-row">
      <div class="fretboard-pane-body">
        <div class="fretboard-pane-corner-tools">
          <v-menu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" class="fretboard-options-btn" size="small" variant="tonal" title="Options"
                aria-label="Options">
                <v-icon icon="mdi-cog-outline" size="16" />
              </v-btn>
            </template>
            <div class="fretboard-options-menu pa-3 d-flex flex-column ga-2">
              <div class="d-flex ga-2">
                <v-text-field :model-value="instrument.numStrings" density="compact" hide-details type="number" min="1"
                  step="1" label="Strings" style="width: 96px"
                  @update:model-value="(v) => instrument.setNumStrings(v)" />
                <v-text-field :model-value="numFrets" density="compact" hide-details type="number" min="1" step="1"
                  label="Frets" style="width: 96px" @update:model-value="(v) => emit('update-num-frets', v)" />
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
        <Fretboard :num-frets="numFrets" :editable="editable" :core-resize-px="coreResizePx"
          :is-phone-view="isPhoneView" :style="fretboardStyleVars" />
      </div>
      <div class="fretboard-pane-side">
        <div class="fretboard-pane-side-stack">
          <div class="fretboard-side-toolbar">
            <v-menu location="bottom end" :close-on-content-click="false">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="fretboard-color-btn">
                  Color
                </v-btn>
              </template>
              <div class="fretboard-color-menu pa-2">
                <ColorPalette orientation="horizontal" />
              </div>
            </v-menu>
          </div>
          <div class="fretboard-dot-groups" :class="{ 'is-empty': !hasDotGroups }">
            <div class="fretboard-dot-groups-list">
              <v-btn variant="tonal" size="small" class="justify-start fretboard-dot-group-btn"
                :class="{ 'is-active': hasDotGroups && allDotGroupsSelected, 'is-disabled': !hasDotGroups }"
                :disabled="!hasDotGroups" @click="emit('activate-all-dot-groups')">
                All
              </v-btn>
              <v-btn v-for="group in usedDotGroups" :key="group.id" variant="tonal" size="small"
                class="justify-start fretboard-dot-group-btn"
                :class="{ 'is-active': String(timelineSettings.activeDotGroupColor || '') === group.color }"
                :style="{ borderLeft: `12px solid ${group.color}` }" :title="group.label"
                @contextmenu="(event) => emit('open-dot-group-menu', { event, group })"
                @click="emit('activate-dot-group', group.color)">
                {{ group.label }}
              </v-btn>
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
])

const instrument = useInstrumentStore()
const timelineSettings = useTimelineSettingsStore()

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
  min-width: 32px;
  width: 32px;
  height: 32px;
  padding-inline: 0;
}

.fretboard-color-btn {
  width: 100%;
  min-width: 0;
  height: 30px;
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

.fretboard-dot-group-btn {
  min-height: 36px;
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
  overflow: hidden;
}
</style>
