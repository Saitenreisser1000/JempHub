import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SURFACE_MODES, useUiModeStore } from './useUiMode'

beforeEach(() => setActivePinia(createPinia()))

it('disables note and comment editing in view mode and restores editing when leaving', () => {
  const uiMode = useUiModeStore()
  uiMode.setSurfaceMode(SURFACE_MODES.VIEW)
  expect(uiMode.surfacePolicy.canEditNotes).toBe(false)
  expect(uiMode.surfacePolicy.canCreateComments).toBe(false)
  expect(uiMode.surfacePolicy.showCommentEditor).toBe(false)
  expect(uiMode.surfacePolicy.dimNoteEvents).toBe(false)
  uiMode.setSurfaceMode(SURFACE_MODES.COMPOSE)
  expect(uiMode.surfacePolicy.canEditNotes).toBe(true)
})
