<template>
  <div class="layout-manager" :style="layoutStyle" :class="{ 'is-presentation': presentation, 'has-no-sidebar': !$slots.sidebar }">
    <MainwindowManager class="layout-manager-main" :presentation="presentation">
      <template #pane-a>
        <slot name="pane-a" />
      </template>
      <template #pane-b>
        <slot name="pane-b" />
      </template>
    </MainwindowManager>
    <aside v-if="$slots.sidebar" v-show="!presentation" class="layout-sidebar" :class="{ 'is-collapsed': sidebarCollapsed }" aria-label="Right sidebar" @pointerdown="startSidebarResize">
      <div class="layout-sidebar-toolbar">
        <button
          type="button"
          class="layout-sidebar-toggle"
          :aria-expanded="!sidebarCollapsed"
          :aria-controls="sidebarContentId"
          :aria-label="sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'"
          :title="sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'"
          @pointerdown.stop
          @click="toggleSidebar"
        >
          <span aria-hidden="true" :class="['mdi', sidebarCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right']" />
        </button>
      </div>
      <div v-show="!sidebarCollapsed" :id="sidebarContentId" class="layout-sidebar-content">
        <slot name="sidebar" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { readJson, writeJson } from '@/infra/storage/jsonStorage'
import MainwindowManager from '@/components/app/layout/MainwindowManager.vue'

defineProps({ presentation: { type: Boolean, default: false } })

const SIDEBAR_WIDTH_KEY = 'guitarjemp.layout.sidebarWidthPx'
const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_WIDTH = 520
const DEFAULT_SIDEBAR_WIDTH = 280

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function readStoredSidebarWidth() {
  const raw = readJson(SIDEBAR_WIDTH_KEY)
  if (!Number.isFinite(raw)) return DEFAULT_SIDEBAR_WIDTH
  return clamp(raw, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
}

const sidebarWidthPx = ref(readStoredSidebarWidth())
const sidebarCollapsed = ref(false)
const sidebarContentId = useId()

const layoutStyle = computed(() => ({
  '--layout-sidebar-width': sidebarCollapsed.value ? '36px' : `${sidebarWidthPx.value}px`,
}))

function toggleSidebar() {
  stopSidebarResize()
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function updateSidebarWidth(nextWidth) {
  const safe = clamp(Math.round(Number(nextWidth) || DEFAULT_SIDEBAR_WIDTH), SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
  sidebarWidthPx.value = safe
  writeJson(SIDEBAR_WIDTH_KEY, safe)
}

function shouldStartSidebarResize(event) {
  const target = event?.currentTarget
  if (!(target instanceof HTMLElement)) return false
  const rect = target.getBoundingClientRect()
  const pointerX = Number(event?.clientX)
  if (!Number.isFinite(pointerX)) return false
  return pointerX - rect.left <= 12
}

function onSidebarResizePointerMove(event) {
  if (typeof window === 'undefined') return
  const viewportWidth = Number(window.innerWidth) || 0
  const pointerX = Number(event?.clientX)
  if (!Number.isFinite(pointerX) || viewportWidth <= 0) return
  updateSidebarWidth(viewportWidth - pointerX)
}

function stopSidebarResize() {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onSidebarResizePointerMove)
  window.removeEventListener('pointerup', stopSidebarResize)
  window.removeEventListener('pointercancel', stopSidebarResize)
}

function startSidebarResize(event) {
  if (sidebarCollapsed.value) return
  if (!shouldStartSidebarResize(event)) return
  event?.preventDefault?.()
  if (typeof window === 'undefined') return
  window.addEventListener('pointermove', onSidebarResizePointerMove)
  window.addEventListener('pointerup', stopSidebarResize)
  window.addEventListener('pointercancel', stopSidebarResize)
}

onBeforeUnmount(() => {
  stopSidebarResize()
})
</script>

<style scoped>
.layout-manager {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--layout-sidebar-width, 280px);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.layout-manager.is-presentation,
.layout-manager.has-no-sidebar {
  grid-template-columns: minmax(0, 1fr);
}

.layout-manager-main {
  min-height: 0;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--app-border, rgb(255 255 255 / 0.09));
  border-right: 1px solid var(--app-border, rgb(255 255 255 / 0.09));
  border-bottom: 1px solid var(--app-border, rgb(255 255 255 / 0.09));
  border-left: 0;
  background: transparent;
  padding: 0;
  min-height: 0;
  overflow: auto;
  cursor: default;
  position: relative;
  box-shadow: inset 1px 0 0 rgb(255 255 255 / 0.03);
}

.layout-sidebar:not(.is-collapsed)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: col-resize;
}

.layout-sidebar-toolbar {
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
}

.layout-sidebar-toggle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--app-text, inherit);
  font-size: 22px;
  cursor: pointer;
}

.layout-sidebar-toggle:hover {
  background: var(--app-glass-1, rgb(255 255 255 / 0.06));
}

.layout-sidebar-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -3px;
}

.layout-sidebar-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

</style>
