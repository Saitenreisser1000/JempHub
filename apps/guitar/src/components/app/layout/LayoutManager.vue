<template>
  <div class="layout-manager" :style="layoutStyle">
    <MainwindowManager class="layout-manager-main">
      <template #pane-a>
        <slot name="pane-a" />
      </template>
      <template #pane-b>
        <slot name="pane-b" />
      </template>
    </MainwindowManager>
    <aside class="layout-sidebar" aria-label="Right sidebar" @pointerdown="startSidebarResize">
      <slot name="sidebar">
        <div class="layout-sidebar-title">Sidebar</div>
      </slot>
    </aside>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MainwindowManager from '@/components/app/layout/MainwindowManager.vue'

const SIDEBAR_WIDTH_KEY = 'guitarjemp.layout.sidebarWidthPx'
const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_WIDTH = 520
const DEFAULT_SIDEBAR_WIDTH = 280

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function readStoredSidebarWidth() {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH
  const raw = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY))
  if (!Number.isFinite(raw)) return DEFAULT_SIDEBAR_WIDTH
  return clamp(raw, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
}

const sidebarWidthPx = ref(readStoredSidebarWidth())

const layoutStyle = computed(() => ({
  '--layout-sidebar-width': `${sidebarWidthPx.value}px`,
}))

function updateSidebarWidth(nextWidth) {
  const safe = clamp(Math.round(Number(nextWidth) || DEFAULT_SIDEBAR_WIDTH), SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
  sidebarWidthPx.value = safe
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(safe))
  }
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
  grid-template-columns: minmax(0, 1fr) minmax(220px, var(--layout-sidebar-width, 280px));
  width: 100%;
  height: 100%;
  min-height: 0;
}

.layout-manager-main {
  min-height: 0;
}

.layout-sidebar {
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

.layout-sidebar::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: col-resize;
}

.layout-sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--app-text-muted, #9aa7bb);
}
</style>
