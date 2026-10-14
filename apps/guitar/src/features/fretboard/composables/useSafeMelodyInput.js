import { computed, unref } from 'vue'
import { createNoteKey } from '@/domain/note'
import { snapStepBlocksForMode } from '@/domain/timelineInteractions'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useUiModeStore } from '@/store/useUiMode'

function safePositiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function roundGridValue(value) {
  return Number(Number(value).toFixed(4))
}

export function nextRepeatGridIndex(note, { snapEnabled = true } = {}) {
  const gridIndex = safePositiveNumber(note?.gridIndex, 1)
  const lengthBlocks = safePositiveNumber(note?.lengthBlocks, 1)
  const endBlock = gridIndex - 1 + lengthBlocks

  if (!snapEnabled) return roundGridValue(endBlock + 1)

  const snapMode = Number(note?.subdivision) === 3 ? '3' : ''
  const snapStep = snapStepBlocksForMode(snapMode, TIMELINE_SNAP_STEP_BLOCKS)
  const snappedBlock = Math.ceil((endBlock - 1e-8) / snapStep) * snapStep
  return roundGridValue(snappedBlock + 1)
}

export function musicalPositionForNote(note, { beatTop = 4, beatBottom = 4 } = {}) {
  const gridIndex = safePositiveNumber(note?.gridIndex, 1)
  const numerator = Math.max(1, Math.floor(safePositiveNumber(beatTop, 4)))
  const denominator = [1, 2, 4, 8].includes(Number(beatBottom)) ? Number(beatBottom) : 4
  const blocksPerBeat = 4 / denominator
  const blocksPerBar = numerator * blocksPerBeat
  const startBlock = Math.max(0, gridIndex - 1)
  const bar = Math.floor(startBlock / blocksPerBar) + 1
  const beat = ((startBlock % blocksPerBar) / blocksPerBeat) + 1
  return { bar, beat: roundGridValue(beat) }
}

function compareStackNotes(a, b) {
  const gridA = safePositiveNumber(a?.gridIndex, 1)
  const gridB = safePositiveNumber(b?.gridIndex, 1)
  if (gridA !== gridB) return gridA - gridB
  const placedA = Number(a?.placedAtMs) || 0
  const placedB = Number(b?.placedAtMs) || 0
  if (placedA !== placedB) return placedA - placedB
  return String(a?.key || '').localeCompare(String(b?.key || ''))
}

export function useSafeMelodyInput({ editable = true } = {}) {
  const notes = useNotesStore()
  const selection = useSelectionStore()
  const settings = useTimelineSettingsStore()
  const uiMode = useUiModeStore()

  const canEdit = computed(
    () => Boolean(unref(editable)) && Boolean(uiMode.surfacePolicy.canEditNotes),
  )
  const selectedNote = computed(() => {
    const key = String(selection.selectedNoteKey || '')
    return key ? (notes.activeNotes.find((note) => String(note?.key || '') === key) ?? null) : null
  })

  function notesAtPosition(fret, string) {
    const targetFret = Number(fret)
    const targetString = Number(string)
    return notes.activeNotes
      .filter(
        (note) =>
          Number(note?.fret) === targetFret && Number(note?.string) === targetString,
      )
      .slice()
      .sort(compareStackNotes)
  }

  function selectExistingNote(noteKey, { shiftKey = false, cycleStack = false } = {}) {
    const requestedKey = String(noteKey || '')
    const requested = notes.activeNotes.find((note) => String(note?.key || '') === requestedKey)
    if (!requested) return null

    if (shiftKey) {
      selection.toggleNoteInSelection(requestedKey)
      return requested
    }

    let target = requested
    if (cycleStack) {
      const stack = notesAtPosition(requested.fret, requested.string)
      const selectedKey = String(selection.selectedNoteKey || '')
      const currentIndex = stack.findIndex((note) => String(note?.key || '') === selectedKey)
      if (currentIndex >= 0 && stack.length > 1) target = stack[(currentIndex + 1) % stack.length]
    }

    selection.selectNote(target.key)
    return target
  }

  function addOrSelectAtPosition(fret, string) {
    const stack = notesAtPosition(fret, string)
    if (stack.length) {
      const target = selectExistingNote(stack[stack.length - 1]?.key, { cycleStack: true })
      return target ? { kind: 'selected', note: target } : null
    }
    if (!canEdit.value) return null

    const note = notes.addNote(`${Number(fret)}-${Number(string)}`)
    if (note?.key) selection.selectNote(note.key)
    return note ? { kind: 'added', note } : null
  }

  function repeatSelected() {
    if (!canEdit.value) return null
    const source = selectedNote.value
    if (!source) return null

    const repeated = {
      ...source,
      key: createNoteKey(),
      gridIndex: nextRepeatGridIndex(source, { snapEnabled: settings.snapEnabled }),
      placedAtMs: Date.now(),
    }
    const [added] = notes.addNotes([repeated], { tag: 'repeat' })
    if (added?.key) selection.selectNote(added.key)
    return added ?? null
  }

  function deleteSelected() {
    if (!canEdit.value) return null
    const key = String(selection.selectedNoteKey || '')
    if (!key) return null
    const removed = notes.activeNotes.find((note) => String(note?.key || '') === key)
    if (!removed) return null

    notes.removeNote(key)
    const remainingSelection = selection.selectedNoteKeys.filter(
      (selectedKey) => String(selectedKey) !== key,
    )
    if (remainingSelection.length) selection.setSelectedNotes(remainingSelection)
    else selection.clearSelection()
    return removed
  }

  return {
    canEdit,
    selectedNote,
    notesAtPosition,
    selectExistingNote,
    addOrSelectAtPosition,
    repeatSelected,
    deleteSelected,
  }
}
