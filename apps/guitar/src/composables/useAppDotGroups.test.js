import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import { useAppDotGroups } from './useAppDotGroups'

beforeEach(() => setActivePinia(createPinia()))

function setup() {
  const notes = useNotesStore()
  const selection = useSelectionStore()
  const timelineSettings = useTimelineSettingsStore()
  notes.activeNotes = [
    { key: 'a', color: 'red', gridIndex: 1 },
    { key: 'b', color: 'blue', gridIndex: 2 },
    { key: 'c', color: 'red', gridIndex: 3 },
  ]
  const groups = useAppDotGroups({ notes, selection, timelineSettings, timelineRef: ref(null) })
  return { notes, selection, timelineSettings, groups }
}

it('deletes all group notes, keeps unrelated selection and restores the named group with one Undo', () => {
  const { notes, selection, timelineSettings, groups } = setup()
  groups.dotGroupNames.value = { red: 'Melodie' }
  selection.setSelectedNotes(['a', 'b', 'c'])
  timelineSettings.setActiveDotGroupColor('red')
  groups.openDotGroupMenu(null, { color: 'red' })
  groups.deleteDotGroup()
  expect(notes.activeNotes.map((note) => note.key)).toEqual(['b'])
  expect(selection.selectedNoteKeys).toEqual(['b'])
  expect(timelineSettings.activeDotGroupColor).toBe('')
  expect(groups.dotGroupMenu.value.open).toBe(false)
  expect(groups.usedDotGroups.value.map((group) => group.color)).toEqual(['blue'])
  expect(notes.undoStack).toHaveLength(1)
  notes.undo()
  expect(notes.activeNotes.map((note) => note.key)).toEqual(['a', 'b', 'c'])
  expect(groups.usedDotGroups.value[0].label).toBe('Melodie')
  notes.redo()
  expect(notes.activeNotes.map((note) => note.key)).toEqual(['b'])
})

it('keeps rapid deletions separate in history and preserves the other active group', () => {
  const { notes, timelineSettings, groups } = setup()
  timelineSettings.setActiveDotGroupColor('blue')
  groups.deleteDotGroup('red')
  expect(timelineSettings.activeDotGroupColor).toBe('blue')
  groups.deleteDotGroup('blue')
  expect(groups.hasDotGroups.value).toBe(false)
  expect(notes.undoStack).toHaveLength(2)
  notes.undo()
  expect(notes.activeNotes.map((note) => note.key)).toEqual(['b'])
  notes.undo()
  expect(notes.activeNotes).toHaveLength(3)
})

it('does not create history for an empty or missing group', () => {
  const { notes, groups } = setup()
  groups.deleteDotGroup('')
  groups.deleteDotGroup('missing')
  expect(notes.activeNotes).toHaveLength(3)
  expect(notes.undoStack).toHaveLength(0)
})

it('blocks deleting and renaming in view mode but keeps group selection and seeking available', () => {
  const { notes, groups, timelineSettings } = setup()
  const uiMode = useUiModeStore()
  groups.openDotGroupMenu(null, { color: 'red' })
  uiMode.setSurfaceMode(SURFACE_MODES.VIEW)
  groups.deleteDotGroup('red')
  groups.renameDotGroup()
  expect(notes.activeNotes).toHaveLength(3)
  expect(notes.undoStack).toHaveLength(0)
  groups.closeDotGroupMenu()
  groups.openDotGroupMenu(null, { color: 'red' })
  expect(groups.dotGroupMenu.value.open).toBe(false)
  groups.activateDotGroup('blue')
  expect(timelineSettings.activeDotGroupColor).toBe('blue')
  groups.activateAllDotGroups()
  expect(timelineSettings.activeDotGroupColor).toBe('')
  uiMode.setSurfaceMode(SURFACE_MODES.COMPOSE)
  groups.deleteDotGroup('red')
  expect(notes.activeNotes.map((note) => note.key)).toEqual(['b'])
})
