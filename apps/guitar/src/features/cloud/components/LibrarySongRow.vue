<script setup>
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps({
  item: { type: Object, required: true },
  owner: { type: String, default: '' },
  selected: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['load', 'delete'])
const { t } = useI18n()
const title = computed(() => props.item.title || t('recordingSelector.untitled'))
</script>

<template>
  <div class="library-song-row" :class="{ 'is-active': selected }">
    <button type="button" class="library-song-load" :aria-current="selected ? 'true' : undefined"
      :aria-label="t('ux.loadNamed', { title })" :disabled="busy" @click="emit('load', item)">
      <span class="library-song-title">{{ title }}</span>
      <span class="library-song-meta">
        <span>{{ owner }}</span>
        <span>{{ item.kind === 'exercise' ? t('libraryDialog.exercise') : t('libraryDialog.song') }}</span>
        <span v-if="selected" class="library-song-current"><span class="mdi mdi-check" aria-hidden="true" /> {{ t('ux.loaded') }}</span>
      </span>
    </button>
    <button v-if="canDelete" type="button" class="library-song-delete" :disabled="busy"
      :aria-label="t('ux.deleteNamed', { title })" :title="t('ux.deleteNamed', { title })" @click="emit('delete', item, $event)">
      <span class="mdi mdi-trash-can-outline" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.library-song-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--color-surface);
}
.library-song-row.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}
.library-song-load {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 64px;
  padding: 12px;
  text-align: left;
  border-radius: 10px;
}
.library-song-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  overflow-wrap: anywhere;
}
.library-song-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
.library-song-current { font-weight: 600; color: var(--color-text); }
.library-song-delete {
  flex: 0 0 44px;
  min-height: 44px;
  margin-right: 6px;
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 22px;
}
button { cursor: pointer; }
button:hover { background: color-mix(in srgb, var(--color-primary) 8%, transparent); }
.library-song-delete:hover { color: var(--color-error); }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
button:disabled { cursor: default; opacity: 0.5; }
</style>
