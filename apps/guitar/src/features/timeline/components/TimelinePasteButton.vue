<template>
  <button
    ref="buttonRef"
    class="timeline-tool"
    :class="buttonClass"
    type="button"
    :title="`${t('timelineView.paste')} · ${t('timelineView.holdForPasteOptions')}`"
    :aria-haspopup="'menu'"
    :aria-expanded="String(menuOpen)"
    @click="onClick"
    @contextmenu.prevent="openMenu"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="clearHold"
    @pointercancel="clearHold"
    @pointerleave="onPointerLeave"
  >
    <span class="timeline-tool-icon" aria-hidden="true">⎘</span>
    <span class="timeline-tool-label">{{ t('timelineView.paste') }}</span>
  </button>

  <Teleport to="body">
    <div
      v-if="menuOpen"
      ref="menuRef"
      class="timeline-paste-menu"
      :style="menuStyle"
      role="menu"
      :aria-label="t('timelineView.pasteOptions')"
      @keydown.esc.prevent="closeMenu(true)"
    >
      <div class="timeline-paste-menu-title">{{ t('timelineView.pasteOptions') }}</div>
      <button class="timeline-paste-menu-item" type="button" role="menuitem" @click="choosePaste(false)">
        <span aria-hidden="true">⎘</span>
        <span>{{ t('timelineView.paste') }}</span>
      </button>
      <button class="timeline-paste-menu-item" type="button" role="menuitem" @click="choosePaste(true)">
        <span aria-hidden="true">↶</span>
        <span>{{ t('timelineView.reversePaste') }}</span>
      </button>
      <label class="timeline-paste-group-option">
        <input v-model="newToneGroup" type="checkbox" />
        <span class="timeline-paste-group-check" aria-hidden="true">✓</span>
        <span>
          <strong>{{ t('timelineView.newToneGroup') }}</strong>
          <small>{{ t('timelineView.newToneGroupHint') }}</small>
        </span>
      </label>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from '@/i18n'

defineOptions({ name: 'TimelinePasteButton' })

defineProps({
  buttonClass: { type: [String, Array, Object], default: '' },
})

const emit = defineEmits(['paste'])
const { t } = useI18n()
const HOLD_MS = 550
const MOVE_TOLERANCE_PX = 10
const buttonRef = ref(null)
const menuRef = ref(null)
const menuOpen = ref(false)
const menuStyle = ref({})
const newToneGroup = ref(false)
let holdTimer = 0
let holdTriggered = false
let pointerStart = null

function placeMenu() {
  const rect = buttonRef.value?.getBoundingClientRect?.()
  if (!rect) return
  const width = 244
  const estimatedHeight = 212
  const margin = 8
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, window.innerWidth - width - margin),
  )
  const spaceBelow = window.innerHeight - rect.bottom
  const desiredTop = spaceBelow >= estimatedHeight + 6
    ? rect.bottom + 6
    : rect.top - estimatedHeight - 6
  const top = Math.min(
    Math.max(margin, desiredTop),
    Math.max(margin, window.innerHeight - estimatedHeight - margin),
  )
  menuStyle.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function openMenu() {
  clearHold()
  holdTriggered = true
  placeMenu()
  menuOpen.value = true
  window.addEventListener('pointerdown', onOutsidePointerDown, true)
  void nextTick(() => menuRef.value?.querySelector('button')?.focus())
}

function closeMenu(restoreFocus = false) {
  menuOpen.value = false
  window.removeEventListener('pointerdown', onOutsidePointerDown, true)
  if (restoreFocus) void nextTick(() => buttonRef.value?.focus())
}

function onOutsidePointerDown(event) {
  if (menuRef.value?.contains(event.target) || buttonRef.value?.contains(event.target)) return
  closeMenu()
}

function onPointerDown(event) {
  if (event.button !== 0) return
  holdTriggered = false
  pointerStart = { x: event.clientX, y: event.clientY }
  clearTimeout(holdTimer)
  holdTimer = window.setTimeout(openMenu, HOLD_MS)
}

function onPointerMove(event) {
  if (!pointerStart) return
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y)
  if (moved > MOVE_TOLERANCE_PX) clearHold()
}

function onPointerLeave(event) {
  if (event.pointerType === 'mouse') clearHold()
}

function clearHold() {
  clearTimeout(holdTimer)
  holdTimer = 0
  pointerStart = null
}

function onClick(event) {
  if (holdTriggered) {
    event.preventDefault()
    event.stopPropagation()
    holdTriggered = false
    return
  }
  emit('paste', { reverse: false, newToneGroup: false })
}

function choosePaste(reverse) {
  emit('paste', { reverse: Boolean(reverse), newToneGroup: newToneGroup.value })
  closeMenu(true)
}

onBeforeUnmount(() => {
  clearHold()
  window.removeEventListener('pointerdown', onOutsidePointerDown, true)
})
</script>

<style scoped>
.timeline-paste-menu {
  position: fixed;
  z-index: 2500;
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgb(109 123 142 / 0.8);
  border-radius: 12px;
  background: linear-gradient(180deg, rgb(42 49 59), rgb(24 29 36));
  box-shadow: 0 18px 42px rgb(0 0 0 / 0.48);
  color: rgb(245 247 250);
}

.timeline-paste-menu-title {
  padding: 2px 4px 5px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(205 214 225);
}

.timeline-paste-menu-item,
.timeline-paste-group-option {
  min-height: 44px;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 9px;
  background: rgb(54 64 77);
  color: rgb(245 247 250);
}

.timeline-paste-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
}

.timeline-paste-menu-item:hover,
.timeline-paste-menu-item:focus-visible {
  outline: none;
  border-color: rgb(96 165 250);
  background: rgb(64 76 92);
}

.timeline-paste-group-option {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  cursor: pointer;
}

.timeline-paste-group-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.timeline-paste-group-check {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 2px solid rgb(153 164 178);
  border-radius: 6px;
  color: transparent;
}

.timeline-paste-group-option input:checked + .timeline-paste-group-check {
  border-color: rgb(96 165 250);
  background: rgb(37 99 235);
  color: white;
}

.timeline-paste-group-option input:focus-visible + .timeline-paste-group-check {
  outline: 2px solid rgb(147 197 253);
  outline-offset: 2px;
}

.timeline-paste-group-option strong,
.timeline-paste-group-option small {
  display: block;
}

.timeline-paste-group-option strong {
  font-size: 12px;
}

.timeline-paste-group-option small {
  margin-top: 2px;
  color: rgb(195 205 217);
  font-size: 10px;
  line-height: 1.25;
}
</style>
