import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import {
  musicalPositionForNote,
  nextRepeatGridIndex,
  useSafeMelodyInput,
} from './useSafeMelodyInput'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

function setup() {
  const notes = useNotesStore()
  const selection = useSelectionStore()
  const settings = useTimelineSettingsStore()
  const uiMode = useUiModeStore()
  const editable = ref(true)
  const input = useSafeMelodyInput({ editable })
  return { notes, selection, settings, uiMode, editable, input }
}

function seed(notes, items) {
  notes.setNotes(items)
}

describe('safe melody input', () => {
  it('adds and selects exactly one event on an empty position', () => {
    const { notes, selection, input } = setup()
    input.addAtPosition(5, 2)

    expect(notes.activeNotes).toHaveLength(1)
    expect(notes.activeNotes[0]).toMatchObject({ fret: 5, string: 2 })
    expect(selection.selectedNoteKey).toBe(notes.activeNotes[0].key)
  })

  it('adds three distinct sequential events on three clicks at the same position', () => {
    const { notes, selection, input } = setup()

    const first = input.addAtPosition(3, 1)
    const second = input.addAtPosition(3, 1)
    const third = input.addAtPosition(3, 1)

    expect(notes.activeNotes).toHaveLength(3)
    expect(new Set([first.key, second.key, third.key]).size).toBe(3)
    expect([first, second, third].map((note) => note.gridIndex)).toEqual([1, 2, 3])
    expect(notes.activeNotes.every((note) => note.fret === 3 && note.string === 1)).toBe(true)
    expect(selection.selectedNoteKey).toBe(third.key)
  })

  it('cycles chronologically through stacked events while Shift keeps multiselect', () => {
    const { notes, selection, input } = setup()
    seed(notes, [
      { key: 'late', fret: 7, string: 3, gridIndex: 5, lengthBlocks: 1, placedAtMs: 30 },
      { key: 'early', fret: 7, string: 3, gridIndex: 1, lengthBlocks: 1, placedAtMs: 10 },
      { key: 'middle', fret: 7, string: 3, gridIndex: 3, lengthBlocks: 1, placedAtMs: 20 },
    ])

    input.selectExistingNote('late', { cycleStack: true })
    expect(selection.selectedNoteKey).toBe('late')
    input.selectExistingNote('late', { cycleStack: true })
    expect(selection.selectedNoteKey).toBe('early')
    input.selectExistingNote('early', { cycleStack: true })
    expect(selection.selectedNoteKey).toBe('middle')
    input.selectExistingNote('late', { shiftKey: true })
    expect(selection.selectedNoteKeys).toEqual(['late', 'middle'])
    expect(notes.activeNotes).toHaveLength(3)
  })

  it('repeats color, duration and rhythm at the next snapped event boundary', () => {
    const { notes, selection, input } = setup()
    seed(notes, [
      {
        key: 'source',
        fret: 8,
        string: 4,
        color: '#ff8800',
        noteValue: '1/8',
        gridIndex: 2.1,
        lengthBlocks: 0.5,
        subdivision: 2,
      },
    ])
    selection.selectNote('source')

    const repeated = input.repeatSelected()

    expect(repeated).toMatchObject({
      fret: 8,
      string: 4,
      color: '#ff8800',
      noteValue: '1/8',
      gridIndex: 2.75,
      lengthBlocks: 0.5,
      subdivision: 2,
    })
    expect(repeated.key).not.toBe('source')
    expect(selection.selectedNoteKey).toBe(repeated.key)
    expect(notes.undoStack).toHaveLength(1)
  })

  it('keeps consecutive repeats as separate Undo steps', () => {
    const { notes, selection, input } = setup()
    seed(notes, [
      { key: 'source', fret: 8, string: 4, gridIndex: 1, lengthBlocks: 1 },
    ])
    selection.selectNote('source')

    const first = input.repeatSelected()
    const second = input.repeatSelected()

    expect(notes.activeNotes.map((note) => note.key)).toEqual(['source', first.key, second.key])
    expect(notes.undo()).toBe(true)
    expect(notes.activeNotes.map((note) => note.key)).toEqual(['source', first.key])
    expect(notes.undo()).toBe(true)
    expect(notes.activeNotes.map((note) => note.key)).toEqual(['source'])
  })

  it('deletes only the primary selection and Undo restores add, repeat and delete', () => {
    const { notes, selection, input } = setup()
    const added = input.addAtPosition(2, 1)
    expect(notes.undo()).toBe(true)
    expect(notes.activeNotes).toHaveLength(0)
    expect(notes.redo()).toBe(true)

    selection.selectNote(added.key)
    const repeated = input.repeatSelected()
    expect(notes.activeNotes).toHaveLength(2)
    expect(notes.undo()).toBe(true)
    expect(notes.activeNotes.map((note) => note.key)).toEqual([added.key])
    expect(notes.redo()).toBe(true)

    selection.setSelectedNotes([repeated.key, added.key])
    input.deleteSelected()
    expect(notes.activeNotes.map((note) => note.key)).toEqual([added.key])
    expect(selection.selectedNoteKey).toBe(added.key)
    expect(notes.undo()).toBe(true)
    expect(notes.activeNotes).toHaveLength(2)
  })

  it('keeps selection available but blocks mutations in view mode or a read-only pane', () => {
    const { notes, selection, uiMode, editable, input } = setup()
    seed(notes, [{ key: 'view-note', fret: 4, string: 2, gridIndex: 1, lengthBlocks: 1 }])
    uiMode.setSurfaceMode(SURFACE_MODES.VIEW)

    input.selectExistingNote('view-note')
    expect(selection.selectedNoteKey).toBe('view-note')
    expect(input.addAtPosition(5, 2)).toBeNull()
    expect(input.repeatSelected()).toBeNull()
    expect(input.deleteSelected()).toBeNull()
    expect(notes.activeNotes.map((note) => note.key)).toEqual(['view-note'])

    uiMode.setSurfaceMode(SURFACE_MODES.COMPOSE)
    editable.value = false
    expect(input.repeatSelected()).toBeNull()
    expect(input.deleteSelected()).toBeNull()
  })
})

describe('safe melody timing helpers', () => {
  it('uses triplet snap spacing for a triplet repeat', () => {
    expect(
      nextRepeatGridIndex(
        { gridIndex: 1, lengthBlocks: 0.3333, subdivision: 3 },
        { snapEnabled: true },
      ),
    ).toBeCloseTo(1.3333, 4)
  })

  it('uses the exact event end when snap is disabled', () => {
    expect(
      nextRepeatGridIndex(
        { gridIndex: 2.1, lengthBlocks: 0.55, subdivision: 2 },
        { snapEnabled: false },
      ),
    ).toBe(2.65)
  })

  it('formats a grid position as bar and beat', () => {
    expect(musicalPositionForNote({ gridIndex: 5.5 }, { beatTop: 4, beatBottom: 4 })).toEqual({
      bar: 2,
      beat: 1.5,
    })
  })
})
