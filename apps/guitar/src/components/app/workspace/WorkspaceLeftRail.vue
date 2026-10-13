<template>
  <aside class="app-left-rail" :aria-label="t('modeSelector.noteValues')">
    <div class="app-left-rail-inner">
      <button v-for="item in leftRailNoteItems" :key="item.value" type="button" class="app-left-rail-note-btn"
        :class="{ 'is-active': leftRailNoteValue === item.value }" :title="item.title"
        :aria-label="item.title" :aria-pressed="leftRailNoteValue === item.value"
        @click="leftRailNoteValue = item.value">
        <span class="app-left-rail-note-icon" :style="{ maskImage: `url(${item.icon})` }" aria-hidden="true"></span>
      </button>

      <div class="app-left-rail-divider" aria-hidden="true"></div>

      <button type="button" class="app-left-rail-note-btn app-left-rail-small-btn"
        :class="{ 'is-active': leftRailModifier === 'dotted' }" :title="t('modeSelector.dotted')"
        :aria-label="t('modeSelector.dotted')" :aria-pressed="leftRailModifier === 'dotted'"
        @click="leftRailModifier = leftRailModifier === 'dotted' ? '' : 'dotted'">
        <span class="app-left-rail-note-icon" :style="{ maskImage: `url(${NOTE_MODIFIER_ICONS.dotted})` }" aria-hidden="true"></span>
      </button>

      <button type="button" class="app-left-rail-note-btn app-left-rail-small-btn"
        :class="{ 'is-active': leftRailModifier === '3' }" :title="t('modeSelector.triplets')"
        :aria-label="t('modeSelector.triplets')" :aria-pressed="leftRailModifier === '3'"
        @click="leftRailModifier = leftRailModifier === '3' ? '' : '3'">
        <span class="app-left-rail-note-icon" :style="{ maskImage: `url(${NOTE_MODIFIER_ICONS.triplet})` }" aria-hidden="true"></span>
      </button>

      <div class="app-left-rail-divider" aria-hidden="true"></div>

      <button type="button" class="app-left-rail-note-btn app-left-rail-chord-btn"
        :class="{ 'is-active': leftRailChordEnabled }"
        :aria-pressed="leftRailChordEnabled"
        :aria-label="leftRailChordEnabled ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
        :title="leftRailChordEnabled ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
        @click="timelineSettings.setSelectedMode(leftRailChordEnabled ? String(timelineSettings.lastRhythmMode || '1/4') : 'sim')">
        <span class="app-left-rail-note-icon" :style="{ maskImage: `url(${TRIAD_ICON})` }" aria-hidden="true"></span>
      </button>

      <div class="app-left-rail-spacer" aria-hidden="true"></div>

      <button type="button" class="app-left-rail-note-btn app-left-rail-comment-btn"
        :class="{ 'is-active': isCommentMode }" :title="t('ux.comment')" :aria-label="t('ux.comment')" :aria-pressed="isCommentMode"
        @click="uiMode.setSurfaceMode(isCommentMode ? SURFACE_MODES.COMPOSE : SURFACE_MODES.COMMENT)">
        <v-icon icon="mdi-comment-text-outline" size="22" aria-hidden="true" />
      </button>

      <button type="button" class="app-left-rail-note-btn app-left-rail-clear-btn" :title="t('activeTones.clear')"
        :aria-label="t('activeTones.clear')" @click="emit('clear')">
        <v-icon icon="mdi-eraser" size="22" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { NOTE_MODIFIER_ICONS, NOTE_VALUE_ITEMS, TRIAD_ICON } from '@/config/noteValues'
import { useI18n } from '@/i18n'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'

const emit = defineEmits(['clear'])

const timelineSettings = useTimelineSettingsStore()
const uiMode = useUiModeStore()
const { t } = useI18n()

const leftRailNoteValue = computed({
  get: () =>
    timelineSettings.selectedMode === 'sim'
      ? String(timelineSettings.lastRhythmMode || '1/4')
      : String(timelineSettings.selectedMode || '1/4'),
  set: (value) => {
    timelineSettings.setSelectedMode(String(value || '1/4'))
  },
})

const leftRailNoteItems = computed(() =>
  NOTE_VALUE_ITEMS.map((item) => ({
    ...item,
    title: t(`noteValues.${item.value.replace('/', '_')}`, item.title),
  })),
)

const leftRailModifier = computed({
  get: () => String(timelineSettings.simGroupMode || ''),
  set: (value) => timelineSettings.setSimGroupMode(String(value || '')),
})

const leftRailChordEnabled = computed(() => timelineSettings.selectedMode === 'sim')
const isCommentMode = computed(() => uiMode.surfaceMode === SURFACE_MODES.COMMENT)
</script>

<style scoped>
.app-left-rail {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--app-left-rail-w);
  background: var(--color-surface);
  border-right: 1px solid rgb(255 255 255 / 0.08);
  box-shadow:
    inset -1px 0 0 rgb(0 0 0 / 0.26),
    inset 1px 0 0 rgb(255 255 255 / 0.03);
  z-index: 2;
}

.app-left-rail-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 8px 4px 12px;
  overflow-y: auto;
  box-sizing: border-box;
}

.app-left-rail-divider {
  width: 24px;
  height: 1px;
  background: var(--app-glass-4);
  margin: 2px 0;
}

.app-left-rail-spacer {
  flex: 1 1 auto;
}

.app-left-rail-note-btn {
  width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 10px;
  background: var(--app-grad-control);
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    border-color var(--ui-fast),
    box-shadow var(--ui-fast),
    background-color var(--ui-fast),
    transform var(--ui-fast);
}

.app-left-rail-note-btn:hover {
  background: var(--app-grad-control-hover);
}

.app-left-rail-note-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.app-left-rail-note-btn.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface) 78%);
  color: var(--color-text);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 58%, transparent),
    0 1px 0 rgb(255 255 255 / 0.14);
}

.app-left-rail-note-icon {
  width: 28px;
  height: 28px;
  background-color: currentColor;
  mask-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
}

.app-left-rail-small-btn {
  min-height: 44px;
}

.app-left-rail-chord-btn {
  padding: 0;
}

.app-left-rail-comment-btn {
  padding: 0;
}

.app-left-rail-clear-btn {
  padding: 0;
  border-color: rgb(207 86 86 / 0.82);
  background: var(--app-grad-danger);
  color: rgb(255 241 241 / 0.98);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.12),
    0 8px 14px rgb(83 15 15 / 0.18);
}

.app-left-rail-clear-btn:hover {
  background: var(--app-grad-danger-hover);
}

.app-left-rail-clear-btn:active {
  background: var(--app-grad-danger-active);
}

@media (prefers-reduced-motion: reduce) {
  .app-left-rail-note-btn { transition: none; }
}

</style>
