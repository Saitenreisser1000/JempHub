höh<template>
  <div class="pane-b-stack">
    <div class="pane-b-tabs">
      <v-tabs :model-value="workspacePanelTab" density="compact" class="browser-tabs"
        @update:model-value="(v) => emit('update:workspacePanelTab', String(v || 'timeline'))">
        <v-tab value="timeline" class="browser-tab">Timeline</v-tab>
        <v-tab value="library" class="browser-tab">Library</v-tab>
      </v-tabs>
    </div>
    <div class="pane-b-content">
      <Timeline
        v-if="showTimeline"
        v-show="workspacePanelTab === 'timeline'"
        ref="timelineRef"
        :num-frets="numFrets"
        :compact="compact"
        :library-panel-visible="false"
        :transport-visible="transportVisible"
        :external-undo-tick="externalUndoTick"
        :external-redo-tick="externalRedoTick"
        @update-transport-visible="(v) => emit('update:transportVisible', Boolean(v))"
      />
      <LibraryPanel
        v-show="workspacePanelTab === 'library'"
        @update-required-frets="(value) => emit('update-required-frets', value)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Timeline from '@/features/timeline'
import { LibraryPanel } from '@/features/cloud'

defineProps({
  showTimeline: { type: Boolean, default: true },
  numFrets: { type: Number, required: true },
  compact: { type: Boolean, default: false },
  transportVisible: { type: Boolean, default: true },
  externalUndoTick: { type: Number, default: 0 },
  externalRedoTick: { type: Number, default: 0 },
  workspacePanelTab: { type: String, required: true },
})

const emit = defineEmits(['update:workspacePanelTab', 'update:transportVisible', 'update-required-frets'])
const timelineRef = ref(null)

const isPlaying = computed(() => Boolean(timelineRef.value?.isPlaying))
const playhead = computed(() => Number(timelineRef.value?.playhead) || 0)
const totalDuration = computed(() => Number(timelineRef.value?.totalDuration) || 0)
const practiceActive = computed(() => Boolean(timelineRef.value?.practiceActive))
const practiceAvailable = computed(() => Boolean(timelineRef.value?.practiceAvailable))
const practiceTargetLabel = computed(() => String(timelineRef.value?.practiceTargetLabel || ''))
const practiceDetectedLabel = computed(() => String(timelineRef.value?.practiceDetectedLabel || ''))
const practiceHintText = computed(() => String(timelineRef.value?.practiceHintText || ''))
const practiceMatchState = computed(() => String(timelineRef.value?.practiceMatchState || ''))
const recordActive = computed(() => Boolean(timelineRef.value?.recordActive))

function togglePlay() {
  timelineRef.value?.togglePlay?.()
}

function seekStart() {
  timelineRef.value?.seekStart?.()
}

function seekPlayhead(value) {
  timelineRef.value?.seekPlayhead?.(value)
}

function togglePractice() {
  timelineRef.value?.togglePractice?.()
}

function toggleRecord() {
  timelineRef.value?.toggleRecord?.()
}

function seekToGridIndex(value) {
  timelineRef.value?.seekToGridIndex?.(value)
}

defineExpose({
  isPlaying,
  playhead,
  totalDuration,
  practiceActive,
  practiceAvailable,
  practiceTargetLabel,
  practiceDetectedLabel,
  practiceHintText,
  practiceMatchState,
  recordActive,
  togglePlay,
  seekStart,
  seekPlayhead,
  togglePractice,
  toggleRecord,
  seekToGridIndex,
})
</script>

<style scoped>
.pane-b-stack {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 12px;
  background: var(--app-layer-0);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.045),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 10px 20px rgb(0 0 0 / 0.12);
}

.pane-b-tabs {
  flex: 0 0 auto;
  padding: 0 8px 0;
  border-bottom: 0;
  background: transparent;
}

.pane-b-tabs :deep(.browser-tabs) {
  min-height: 0;
}

.pane-b-tabs :deep(.browser-tabs .v-slide-group__content) {
  gap: 6px;
  align-items: end;
}

.pane-b-tabs :deep(.browser-tab) {
  min-height: 25px;
  min-width: 88px;
  border: 1px solid rgb(255 255 255 / 0.05);
  border-bottom: 0;
  border-radius: 10px 10px 0 0 !important;
  background: var(--app-glass-1);
  color: var(--app-text-dim);
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  box-shadow: none;
  padding-inline: 8px;
  transition:
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.pane-b-tabs :deep(.browser-tab .v-btn__overlay),
.pane-b-tabs :deep(.browser-tab .v-btn__underlay) {
  display: none;
}

.pane-b-tabs :deep(.browser-tab .v-btn__content) {
  justify-content: center;
}

.pane-b-tabs :deep(.browser-tab.v-tab--selected) {
  margin-bottom: -1px;
  background: var(--app-layer-3);
  color: var(--app-text);
  border-color: color-mix(in srgb, var(--app-layer-3) 70%, var(--app-glass-4));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
  transform: translateY(1px);
}

.pane-b-tabs :deep(.browser-tab.v-tab--selected::before) {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--app-layer-3);
}

.pane-b-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pane-b-content > * {
  min-height: 0;
  flex: 1 1 auto;
}
</style>
