<template>
  <v-card
    class="transport-controls ui-panel pa-3"
    :class="{ 'is-phone-view': isPhoneView }"
    variant="flat"
  >
    <div class="transport-position">
      <span class="transport-time" aria-hidden="true">{{ positionLabel }}</span>
      <input class="transport-seek" type="range" min="0" :max="positionTotal || 1" step="1"
        :value="position" :disabled="positionTotal <= 0 || recordActive || practiceActive"
        :title="recordActive || practiceActive ? t('playback.seekLocked') : t('playback.position')"
        :aria-label="t('playback.position')" :aria-valuetext="t('playback.positionValue', { current: positionLabel, total: durationLabel })"
        @input="previewPosition($event.target.value)" @change="commitPosition()"
        @keydown.esc.stop.prevent="cancelPosition" @pointercancel="cancelPosition" @blur="cancelPosition" />
      <span class="transport-time" aria-hidden="true">{{ durationLabel }}</span>
    </div>
    <div class="transport-row transport-row-primary">
      <div class="transport-primary-controls">
        <div class="transport-col transport-col-left d-flex align-center ga-2 flex-wrap" role="group" :aria-label="t('timelineView.transport')">
          <v-btn class="transport-play" color="primary" variant="flat" :title="isPlaying ? t('playback.pause') : t('playback.play')"
            :aria-label="isPlaying ? t('playback.pause') : t('playback.play')" @click="togglePlayPause">
            <v-icon start :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" />
            {{ isPlaying ? t('playback.pause') : t('playback.play') }}
          </v-btn>

          <v-btn variant="text" icon :title="t('playback.fromStart')" :aria-label="t('playback.fromStart')" @click="seekStart">
            <v-icon icon="mdi-skip-backward" />
          </v-btn>

          <v-btn
            size="small"
            :variant="loopEnabled ? 'flat' : 'tonal'"
            :color="loopEnabled ? 'primary' : undefined"
            :title="t('playback.loop')"
            :aria-label="t('playback.loop')"
            :aria-pressed="loopEnabled"
            @click="emit('update-loop', !loopEnabled)"
          >
            <v-icon start icon="mdi-repeat" />
            {{ t('playback.loop') }}
          </v-btn>
          <v-btn
            icon
            size="small"
            :variant="shuffleEnabled ? 'flat' : 'tonal'"
            :color="shuffleEnabled ? 'primary' : undefined"
            title="Shuffle"
            aria-label="Shuffle"
            :aria-pressed="shuffleEnabled"
            @click="emit('update-shuffle', !shuffleEnabled)"
          >
            <v-icon icon="mdi-shuffle-variant" />
          </v-btn>
        </div>

        <div class="transport-col transport-col-right d-flex align-center ga-2 flex-wrap" role="group" :aria-label="t('playback.tempo')">
          <v-btn class="tap-btn" size="small" variant="tonal" :title="t('playback.tapTempoHint')" @click="onTapTempo">
            {{ t('playback.tap') }}
          </v-btn>
          <v-text-field class="tempo-input" density="compact" hide-details variant="outlined" type="number" :min="TEMPO_MIN"
            :max="TEMPO_MAX" step="1" suffix="BPM" :aria-label="t('playback.tempo')"
            v-model="tempoDraft" @focus="beginTempoEdit" @blur="commitTempo"
            @keydown.enter.prevent="$event.target.blur()" @keydown.esc.stop.prevent="cancelTempoEdit" />
          <v-menu location="top end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                class="transport-options-btn"
                size="small"
                variant="tonal"
                :title="t('modeSelector.options')"
                :aria-label="t('modeSelector.options')"
              >
                <v-icon start icon="mdi-tune-variant" size="18" />
                {{ t('modeSelector.options') }}
              </v-btn>
            </template>
            <v-card class="transport-options-menu pa-3 d-flex flex-column ga-2" min-width="220" variant="flat" border>
              <div class="text-caption option-section-label">{{ t('playback.input') }}</div>
              <v-radio-group
                density="compact"
                hide-details
                :model-value="inputMode"
                @update:model-value="onInputModeChange"
              >
                <v-radio :label="t('playback.off')" value="off" />
                <v-radio :label="t('playback.microphone')" value="microphone" :disabled="!practiceAvailable && !practiceActive" />
                <v-radio v-if="!readOnly" :label="t('playback.record')" value="record" />
              </v-radio-group>
              <p v-if="!practiceAvailable" class="text-caption">{{ t('playback.noPracticeNotes') }}</p>
              <v-switch
                density="compact"
                hide-details
                inset
                :label="t('playback.follow')"
                :model-value="autoFollowEnabled"
                @update:model-value="(v) => emit('update-auto-follow', Boolean(v))"
              />
              <v-switch
                density="compact"
                hide-details
                inset
                :label="t('playback.click')"
                :model-value="clickEnabled"
                @update:model-value="(v) => emit('update-click', Boolean(v))"
              />
              <v-switch
                density="compact"
                hide-details
                inset
                :label="t('playback.countIn')"
                :model-value="countInEnabled"
                @update:model-value="(v) => emit('update-count-in-enabled', Boolean(v))"
              />
            </v-card>
          </v-menu>
        </div>
      </div>
    </div>
    <p v-if="recordActive || practiceActive" class="transport-seek-hint">{{ t('playback.seekLocked') }}</p>
    <nav v-if="isPhoneView && !readOnly" :aria-label="t('menu.view')" class="phone-pane-navigation">
      <v-btn-toggle class="phone-pane-switch" :model-value="phonePane" mandatory divided
        @update:model-value="(v) => emit('update-phone-pane', String(v || 'fretboard'))">
        <v-btn value="fretboard" variant="tonal">{{ t('modeSelector.fretboard') }}</v-btn>
        <v-btn value="timeline" variant="tonal">{{ t('modeSelector.timeline') }}</v-btn>
        <v-btn value="library" variant="tonal">{{ t('libraryDialog.title') }}</v-btn>
      </v-btn-toggle>
    </nav>
    <PracticeFeedback :practice-active="practiceActive" :record-active="recordActive"
      :target="practiceTargetLabel" :detected="practiceDetectedLabel" :hint="practiceHintText"
      :match-state="practiceMatchState" @stop="onInputModeChange('off')" />
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { useTempoInput, TEMPO_MIN, TEMPO_MAX, clampTempo } from '../composables/useTempoInput'
import { usePlaybackPosition, formatPlaybackTime } from '../composables/usePlaybackPosition'
import PracticeFeedback from './PracticeFeedback.vue'
import { initAudioEngine } from '@/domain/audio/simpleSynth'


const props = defineProps({
  readOnly: { type: Boolean, default: false },
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true },
  clickEnabled: { type: Boolean, default: false },
  countInEnabled: { type: Boolean, default: true },
  autoFollowEnabled: { type: Boolean, default: true },
  loopEnabled: { type: Boolean, default: false },
  shuffleEnabled: { type: Boolean, default: false },
  instrumentType: { type: String, default: 'guitar' },
  isPhoneView: { type: Boolean, default: false },
  phonePane: { type: String, default: 'fretboard' },
  playhead: { type: Number, required: true },
  totalDuration: { type: Number, required: true },
  practiceActive: { type: Boolean, default: false },
  practiceAvailable: { type: Boolean, default: true },
  practiceTargetLabel: { type: String, default: '' },
  practiceDetectedLabel: { type: String, default: '' },
  practiceHintText: { type: String, default: '' },
  practiceMatchState: { type: String, default: '' },
  recordActive: { type: Boolean, default: false },
})

const emit = defineEmits([
  'toggle-play',
  'seek-start',
  'seek-playhead',
  'update-tempo',
  'update-click',
  'update-count-in-enabled',
  'update-auto-follow',
  'update-loop',
  'update-shuffle',
  'update-phone-pane',
  'toggle-practice',
  'toggle-record',
])
const { t } = useI18n()

const { total: positionTotal, position, preview: previewPosition, commit: commitPosition, cancel: cancelPosition } = usePlaybackPosition(
  () => props.playhead, () => props.totalDuration, (value) => emit('seek-playhead', value),
)
const positionLabel = computed(() => formatPlaybackTime(position.value, props.tempo))
const durationLabel = computed(() => formatPlaybackTime(positionTotal.value, props.tempo))

const tapTimesMs = ref([])

const { tempoDraft, beginTempoEdit, commitTempo, cancelTempoEdit } = useTempoInput(
  () => props.tempo,
  (tempo) => emit('update-tempo', tempo),
)

const inputMode = computed(() => {
  if (props.recordActive) return 'record'
  if (props.practiceActive) return 'microphone'
  return 'off'
})

function togglePlayPause() {
  emit('toggle-play')
}

function seekStart() {
  emit('seek-start')
}

function onTapTempo() {
  void initAudioEngine({ instrumentType: props.instrumentType })
  const now = performance.now()
  const MAX_GAP_MS = 2500
  const taps = tapTimesMs.value
  const prev = taps.length ? taps[taps.length - 1] : null
  if (prev == null || now - prev > MAX_GAP_MS) {
    tapTimesMs.value = [now]
    return
  }

  taps.push(now)
  if (taps.length > 6) taps.shift()

  if (taps.length < 2) return
  const intervals = []
  for (let i = 1; i < taps.length; i += 1) {
    const dt = taps[i] - taps[i - 1]
    if (dt >= 200 && dt <= 2000) intervals.push(dt)
  }
  if (!intervals.length) return

  const avgMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length
  const bpm = clampTempo(60000 / avgMs)
  emit('update-tempo', bpm)
}

function onInputModeChange(v) {
  const next = String(v || 'off')
  const practiceOn = Boolean(props.practiceActive)
  const recordOn = Boolean(props.recordActive)

  if (next === 'off') {
    if (practiceOn) emit('toggle-practice')
    if (recordOn) emit('toggle-record')
    return
  }

  if (next === 'microphone') {
    if (recordOn) emit('toggle-record')
    if (!practiceOn) emit('toggle-practice')
    return
  }

  if (next === 'record' && !props.readOnly) {
    if (practiceOn) emit('toggle-practice')
    if (!recordOn) emit('toggle-record')
  }
}

</script>

<style scoped>
.transport-position {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 4px;
}
.transport-time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.transport-seek {
  flex: 1;
  min-width: 0;
  height: 44px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.transport-seek:disabled { cursor: default; opacity: 0.5; }
.transport-seek:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.transport-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.transport-primary-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 24px;
  width: 100%;
  min-width: 0;
}

.transport-col {
  min-width: 0;
}

.transport-col-right {
  justify-content: flex-end;
}

.tempo-input {
  width: 110px;
  min-width: 110px;
}

.tap-btn {
  min-width: 56px;
}

.transport-options-btn {
  padding-inline: 12px;
}

.transport-options-menu {
  max-height: 70dvh;
  overflow-y: auto;
}

.transport-play {
  min-width: 112px;
}

.transport-controls :deep(.v-btn) {
  min-height: 44px;
  text-transform: none;
  letter-spacing: 0;
}

.transport-controls :deep(.v-btn--icon) {
  min-width: 44px;
}

.transport-controls :deep(.v-btn:focus-visible) {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.transport-seek-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.option-section-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.transport-controls {
  min-height: 58px;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  border: 0;
  border-radius: 0;
}

.transport-controls.is-phone-view {
  min-height: 36px;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.transport-controls.is-phone-view .transport-primary-controls {
  gap: 8px;
}

.transport-controls.is-phone-view .transport-col-left,
.transport-controls.is-phone-view .transport-col-right {
  gap: 6px;
  flex-wrap: wrap !important;
}

.transport-controls.is-phone-view .transport-col-right {
  justify-content: flex-start;
}

.phone-pane-navigation {
  margin-top: 12px;
  border-top: 1px solid var(--app-border);
  padding-top: 8px;
}

.phone-pane-switch {
  display: flex;
  width: 100%;
  height: auto;
}

.phone-pane-switch :deep(.v-btn) {
  flex: 1 1 0;
  text-transform: none;
  font-size: 12px;
  min-width: 0;
  padding-inline: 6px;
  white-space: normal;
}

.phone-pane-switch :deep(.v-btn__content) {
  white-space: normal;
}

.transport-controls :deep(.v-slider-track__background) {
  opacity: 1;
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface-2));
}

.transport-controls :deep(.v-slider-track__fill) {
  background: var(--color-primary);
}

.transport-controls :deep(.v-slider-thumb__surface) {
  border: 2px solid color-mix(in srgb, var(--color-primary) 72%, var(--color-surface));
  box-shadow: 0 2px 8px rgb(0 0 0 / 24%);
}

.transport-controls :deep(.v-field) {
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%);
}

.practice-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-surface-2) 80%, var(--color-surface) 20%);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.practice-status.is-tune {
  color: var(--color-warning);
}

.practice-status.is-ok {
  color: var(--color-success);
}

.practice-status.is-error {
  color: var(--color-error);
}

.practice-target {
  font-weight: 700;
}

@media (max-width: 860px) {
  .transport-col-right {
    justify-content: flex-start;
  }
}
</style>
