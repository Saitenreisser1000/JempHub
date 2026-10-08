<template>
  <v-card
    class="transport-controls ui-panel pa-3"
    :class="{ 'is-phone-view': isPhoneView }"
    variant="flat"
    tabindex="0"
    @keydown.tab.prevent="onTapTempo"
  >
    <div class="transport-row transport-row-primary">
      <div class="transport-primary-controls">
        <div class="transport-col transport-col-left d-flex align-center ga-2 flex-wrap">
          <v-btn color="primary" variant="flat" icon :title="isPlaying ? t('playback.pause') : t('playback.play')"
            :aria-label="isPlaying ? t('playback.pause') : t('playback.play')" @click="togglePlayPause">
            <v-icon :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" />
          </v-btn>

          <v-btn color="primary" variant="flat" icon :title="t('playback.fromStart')" :aria-label="t('playback.fromStart')" @click="seekStart">
            <v-icon icon="mdi-skip-backward" />
          </v-btn>

          <v-btn
            icon
            size="small"
            :variant="loopEnabled ? 'flat' : 'tonal'"
            :color="loopEnabled ? 'primary' : undefined"
            :title="t('playback.loop')"
            :aria-label="t('playback.loop')"
            @click="emit('update-loop', !loopEnabled)"
          >
            <v-icon icon="mdi-repeat" />
          </v-btn>
          <v-btn
            icon
            size="small"
            :variant="shuffleEnabled ? 'flat' : 'tonal'"
            :color="shuffleEnabled ? 'primary' : undefined"
            title="Shuffle"
            aria-label="Shuffle"
            @click="emit('update-shuffle', !shuffleEnabled)"
          >
            <v-icon icon="mdi-shuffle-variant" />
          </v-btn>
          <v-btn-toggle
            v-if="isPhoneView"
            class="phone-pane-switch"
            :model-value="phonePane"
            mandatory
            divided
            @update:model-value="(v) => emit('update-phone-pane', String(v || 'fretboard'))"
          >
            <v-btn value="fretboard" size="x-small" variant="tonal">Fretboard</v-btn>
            <v-btn value="timeline" size="x-small" variant="tonal">Timeline</v-btn>
            <v-btn value="library" size="x-small" variant="tonal">Library</v-btn>
          </v-btn-toggle>
        </div>

        <div class="transport-col transport-col-middle" aria-hidden="true" />

        <div class="transport-col transport-col-right d-flex align-center ga-2 flex-wrap">
          <v-btn class="tap-btn" size="small" variant="tonal" :title="t('playback.tapTempoHint')" @click="onTapTempo">
            TAB
          </v-btn>
          <v-text-field class="tempo-input" density="compact" hide-details variant="outlined" type="number" :min="TEMPO_MIN"
            :max="TEMPO_MAX" step="1" suffix="BPM" :model-value="String(tempoLocal)" @update:model-value="onTempoInput" />
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
                <v-icon icon="mdi-cog-outline" size="16" />
              </v-btn>
            </template>
            <v-card class="pa-3 d-flex flex-column ga-2" min-width="220" variant="flat" border>
              <div class="text-caption option-section-label">Input</div>
              <v-radio-group
                density="compact"
                hide-details
                :model-value="inputMode"
                @update:model-value="onInputModeChange"
              >
                <v-radio label="Off" value="off" />
                <v-radio label="Microphone" value="microphone" />
                <v-radio label="Record" value="record" />
              </v-radio-group>
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
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { initAudioEngine } from '@/domain/audio/simpleSynth'

const TEMPO_MIN = 30
const TEMPO_MAX = 200

const props = defineProps({
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

const tapTimesMs = ref([])

const tempoLocal = computed({
  get: () => props.tempo,
  set: (v) => {
    const next = clampTempo(v)
    emit('update-tempo', next)
  },
})

const inputMode = computed(() => {
  if (props.recordActive) return 'record'
  if (props.practiceActive) return 'microphone'
  return 'off'
})

function clampTempo(v) {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  if (!Number.isFinite(n)) return TEMPO_MIN
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(n)))
}

function onTempoInput(v) {
  tempoLocal.value = v
}

function togglePlayPause() {
  void initAudioEngine({ instrumentType: props.instrumentType })
  emit('toggle-play')
}

function seekStart() {
  void initAudioEngine({ instrumentType: props.instrumentType })
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
  void initAudioEngine({ instrumentType: props.instrumentType })
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

  if (next === 'record') {
    if (practiceOn) emit('toggle-practice')
    if (!recordOn) emit('toggle-record')
  }
}

</script>

<style scoped>
.transport-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.transport-primary-controls {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: 8px;
  width: 100%;
  min-width: 0;
}

.transport-col {
  min-width: 0;
}

.transport-col-middle {
  min-height: 1px;
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
  min-width: 32px;
  padding-inline: 0;
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
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
}

.transport-controls.is-phone-view .transport-col-middle {
  display: none;
}

.transport-controls.is-phone-view .transport-col-left,
.transport-controls.is-phone-view .transport-col-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap !important;
}

.transport-controls.is-phone-view .transport-col-right {
  margin-left: auto;
}

.phone-pane-switch {
  margin-left: 2px;
  color: var(--color-text-muted);
}

.phone-pane-switch :deep(.v-btn) {
  text-transform: none;
  font-size: 11px;
  min-width: 0;
  padding-inline: 8px;
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
  .transport-primary-controls {
    grid-template-columns: 1fr;
    row-gap: 8px;
  }

  .transport-col-right {
    justify-content: flex-start;
  }

  .transport-controls.is-phone-view .transport-primary-controls {
    row-gap: 0;
    grid-template-columns: none;
  }
}
</style>
