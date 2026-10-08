import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readJson } from '@/infra/storage/jsonStorage'
import { persistRefs } from '@/infra/pinia/persistRefs'

const STORAGE_KEY = 'guitarjemp.uiMode.v1'

export const SURFACE_MODES = Object.freeze({
  COMPOSE: 'compose',
  COMMENT: 'comment',
})

export const SURFACE_MODE_POLICY = Object.freeze({
  [SURFACE_MODES.COMPOSE]: Object.freeze({
    canEditNotes: true,
    canCreateComments: false,
    dimNoteEvents: false,
    showCommentEditor: false,
  }),
  [SURFACE_MODES.COMMENT]: Object.freeze({
    canEditNotes: false,
    canCreateComments: true,
    dimNoteEvents: true,
    showCommentEditor: true,
  }),
})

function normalizeSurfaceMode(value) {
  const raw = String(value || '')
  return Object.values(SURFACE_MODES).includes(raw) ? raw : SURFACE_MODES.COMPOSE
}

export const useUiModeStore = defineStore('uiMode', () => {
  const stored = readJson(STORAGE_KEY) ?? {}
  const surfaceMode = ref(normalizeSurfaceMode(stored.surfaceMode))

  const surfacePolicy = computed(
    () => SURFACE_MODE_POLICY[surfaceMode.value] ?? SURFACE_MODE_POLICY[SURFACE_MODES.COMPOSE],
  )

  function setSurfaceMode(mode) {
    surfaceMode.value = normalizeSurfaceMode(mode)
  }

  function isSurfaceMode(mode) {
    return surfaceMode.value === normalizeSurfaceMode(mode)
  }

  persistRefs(STORAGE_KEY, { surfaceMode })

  return {
    surfaceMode,
    surfacePolicy,
    setSurfaceMode,
    isSurfaceMode,
  }
})
