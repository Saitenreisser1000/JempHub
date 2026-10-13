<template>
  <div v-if="active || hint" class="practice-feedback" :class="{ 'is-error': matchState === 'error' }">
    <!-- Only stable mode/error changes are announced, never frame-rate pitch updates. -->
    <span role="status">{{ active ? t(recordActive ? 'playback.recording' : 'playback.practice') : hint }}</span>
    <template v-if="active">
      <span v-if="target && !recordActive">{{ t('playback.target') }}: <strong>{{ target }}</strong></span>
      <span>{{ t('playback.detected') }}: <strong>{{ detected || '—' }}</strong></span>
      <span v-if="hint">{{ hint }}</span>
      <button type="button" @click="emit('stop')">{{ t('playback.stopMicrophone') }}</button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '@/i18n'
const props = defineProps({
  practiceActive: Boolean,
  recordActive: Boolean,
  target: { type: String, default: '' },
  detected: { type: String, default: '' },
  hint: { type: String, default: '' },
  matchState: { type: String, default: '' },
})
const emit = defineEmits(['stop'])
const { t } = useI18n()
const active = computed(() => props.practiceActive || props.recordActive)
</script>

<style scoped>
.practice-feedback {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  padding: 8px;
  background: var(--color-surface-2);
  border-radius: 6px;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.practice-feedback.is-error { border-inline-start: 3px solid var(--color-error); }
.practice-feedback button {
  margin-inline-start: auto;
  padding: 6px 10px;
  min-height: 36px;
  border: 1px solid currentColor;
  border-radius: 6px;
  cursor: pointer;
}
.practice-feedback button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
