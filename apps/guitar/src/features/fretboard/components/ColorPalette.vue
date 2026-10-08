<template>
  <div
    class="palette"
    :class="{ horizontal: orientation === 'horizontal' }"
    role="radiogroup"
    aria-label="Farbauswahl"
  >
    <label v-for="c in colors" :key="c" class="color-item">
      <input type="radio" name="note-color" :value="c" :checked="selectedColor === c" @change="select(c)" />
      <span class="swatch" :style="{ backgroundColor: c }" />
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { COMMENT_COLORS } from 'jemp-design-system/design-constants'

defineOptions({ name: 'ColorPalette' })

defineProps({
  orientation: {
    type: String,
    default: 'vertical'
  }
})

const settings = useTimelineSettingsStore()
const notes = useNotesStore()
const selection = useSelectionStore()

const colors = COMMENT_COLORS

const selectedColor = computed(() => settings.selectedColor)

function select(color) {
  settings.setSelectedColor(color)
  const selectedKeys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (!selectedKeys.length) return
  notes.setManyColors(selectedKeys.map((key) => ({ key, color })))
}
</script>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: color-mix(in srgb, var(--color-surface) 85%, transparent);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  height: 100%;
  justify-content: center;
}

.palette.horizontal {
  flex-direction: row;
  height: auto;
  justify-content: stretch;
  align-items: stretch;
  width: 100%;
  padding: 6px 8px;
  gap: 8px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.palette.horizontal .color-item {
  flex: 1 1 0;
}

.color-item input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.swatch {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 2px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.palette.horizontal .swatch {
  width: 100%;
  height: 30px;
}

.color-item input:checked + .swatch {
  border-color: rgba(20, 20, 20, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 2px 8px rgba(0, 0, 0, 0.18);
}
</style>
