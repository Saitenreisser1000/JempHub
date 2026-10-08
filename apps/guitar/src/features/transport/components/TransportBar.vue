<template>
  <div v-if="visible" class="timeline-transport" :aria-label="t('timelineView.transport')">
    <div class="timeline-transport-inner">
      <PlaybackControls :is-playing="isPlaying" :tempo="tempo" :click-enabled="clickEnabled"
        :count-in-enabled="countInEnabled" :auto-follow-enabled="autoFollowEnabled" :loop-enabled="loopEnabled"
        :shuffle-enabled="shuffleEnabled"
        :instrument-type="instrumentType"
        :is-phone-view="isPhoneView"
        :phone-pane="phonePane"
        :playhead="playhead" :total-duration="totalDuration" :practice-active="practiceActive"
        :practice-available="practiceAvailable" :practice-target-label="practiceTargetLabel"
        :practice-detected-label="practiceDetectedLabel" :practice-hint-text="practiceHintText"
        :practice-match-state="practiceMatchState" :record-active="recordActive"
        @toggle-play="emit('toggle-play')" @seek-start="emit('seek-start')"
        @seek-playhead="(v) => emit('seek-playhead', v)" @update-tempo="(v) => emit('update-tempo', v)"
        @update-click="(v) => emit('update-click', v)"
        @update-count-in-enabled="(v) => emit('update-count-in-enabled', v)"
        @update-auto-follow="(v) => emit('update-auto-follow', v)" @update-loop="(v) => emit('update-loop', v)"
        @update-shuffle="(v) => emit('update-shuffle', v)"
        @update-phone-pane="(v) => emit('update-phone-pane', v)"
        @toggle-practice="emit('toggle-practice')" @toggle-record="emit('toggle-record')" />
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'
import PlaybackControls from './PlaybackControls.vue'

defineProps({
  visible: { type: Boolean, default: true },
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
</script>

<style scoped>
.timeline-transport {
  display: flex;
  justify-content: stretch;
  margin-top: 0;
  padding: 0;
  width: 100%;
  pointer-events: auto;
}

.timeline-transport-inner {
  width: 100%;
  max-width: none;
  border: 0;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-surface) 90%, var(--color-surface-2) 10%);
  box-shadow: none;
  overflow: visible;
}

@media (max-width: 860px) {
  .timeline-transport {
    width: 100%;
  }
}
</style>
