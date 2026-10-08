import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createNoteKey, parseFretStringKey, normalizeNote } from '@/domain/note'
import { normalizeNoteValue } from '@/config/noteValues'
import { defaultLengthBlocksForMode, nextGridIndexFromNotes } from '@/domain/timelinePlacement'
import { snapStepBlocksForMode } from '@/domain/timelineInteractions'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { DEFAULT_TIME_PER_BLOCK_MS, TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'

export const useNotesStore = defineStore('notes', () => {
  // Notes are event objects with a generated unique key.
  // gridIndex: 1-based raster position (can be fractional)
  // lengthBlocks: note length in raster blocks (can be fractional, e.g. 0.25)
  // subdivision: rhythmic subdivision marker (2 = binary, 3 = triplet)
  // placedAtMs: wall-clock timestamp when note was created
  const activeNotes = ref([])

  // Undo/Redo history (transient, not persisted).
  const undoStack = ref([])
  const redoStack = ref([])
  let lastUndoTag = null
  let lastUndoAtMs = 0

  const TIME_PER_BLOCK_MS = DEFAULT_TIME_PER_BLOCK_MS

  function gridIndexToTimeMs(gridIndex) {
    const i = Number(gridIndex)
    const safe = Number.isFinite(i) && i > 0 ? i : 1
    return (safe - 1) * TIME_PER_BLOCK_MS
  }

  function lengthBlocksToDurationMs(lengthBlocks) {
    const n = Number(lengthBlocks)
    const safe = Number.isFinite(n) && n > 0 ? n : 1
    return safe * TIME_PER_BLOCK_MS
  }

  function findIndexByKey(key) {
    return activeNotes.value.findIndex((n) => n?.key === key)
  }

  function snapshotNotes() {
    return (activeNotes.value ?? []).map((n) => ({ ...n }))
  }

  function snapshotState() {
    const transport = useTransportStore()
    const t = Number(transport.playheadMs)
    return {
      notes: snapshotNotes(),
      playheadMs: Number.isFinite(t) && t >= 0 ? t : 0,
    }
  }

  function restoreNotes(snapshot) {
    activeNotes.value = Array.isArray(snapshot) ? snapshot.map((n) => ({ ...n })) : []
  }

  function restoreState(state) {
    const transport = useTransportStore()
    restoreNotes(state?.notes)
    transport.setPlayheadMs(state?.playheadMs)
  }

  function pushUndoPoint(tag = 'edit', { coalesceMs = 400 } = {}) {
    const now = Date.now()
    const t = String(tag || 'edit')
    if (t === lastUndoTag && now - lastUndoAtMs < coalesceMs) return

    undoStack.value.push(snapshotState())
    redoStack.value = []
    lastUndoTag = t
    lastUndoAtMs = now
  }

  function undo() {
    if (!undoStack.value.length) return false
    const current = snapshotState()
    const prev = undoStack.value.pop()
    redoStack.value.push(current)
    restoreState(prev)
    return true
  }

  function redo() {
    if (!redoStack.value.length) return false
    const current = snapshotState()
    const next = redoStack.value.pop()
    undoStack.value.push(current)
    restoreState(next)
    return true
  }

  function createNoteFromKey(key) {
    const settings = useTimelineSettingsStore()
    const transport = useTransportStore()
    const { fret, string } = parseFretStringKey(key)

    // Default placement: append after existing notes.
    let gridIndex = nextGridIndexFromNotes(activeNotes.value, { mode: settings.selectedMode })

    // If user moved the playhead, new notes start at the playhead.
    const tMs = Number(transport.playheadMs)
    if (Number.isFinite(tMs) && tMs > 0) {
      const idx = tMs / TIME_PER_BLOCK_MS + 1
      if (Number.isFinite(idx) && idx > 0) {
        if (settings.snapEnabled && transport.playState !== 'playing') {
          const snapStep = snapStepBlocksForMode(settings.simGroupMode, TIMELINE_SNAP_STEP_BLOCKS)
          const snappedBlocks = Math.round((idx - 1) / snapStep) * snapStep
          gridIndex = Math.max(1, snappedBlocks + 1)
        } else {
          gridIndex = idx
        }
      }
    }

    const lengthMode =
      settings.selectedMode === 'sim' ? settings.lastRhythmMode : settings.selectedMode
    let lengthBlocks = defaultLengthBlocksForMode(lengthMode)
    const rawSimGroupMode = settings.simGroupMode
    const simGroupMode = rawSimGroupMode === 'dot' ? 'dotted' : rawSimGroupMode
    const subdivision = simGroupMode === '3' ? 3 : 2
    if (simGroupMode === 'dotted' && Number(lengthBlocks) > 0.25) {
      lengthBlocks = Number(lengthBlocks) * 1.5
    } else if (simGroupMode === '3') {
      // Triplet length = base note value * 2/3.
      lengthBlocks = Number((Number(lengthBlocks) * (2 / 3)).toFixed(4))
    }
    return {
      key: createNoteKey(),
      fret,
      string,
      color: settings.selectedColor,
      noteValue: normalizeNoteValue(lengthMode) || '1/4',
      gridIndex,
      lengthBlocks,
      subdivision,
      placedAtMs: Date.now(),
    }
  }

  function setNoteGridIndex(key, gridIndex) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return
    const i = Number(gridIndex)
    const safe = Number.isFinite(i) && i > 0 ? i : 1
    const prev = Number(activeNotes.value[idx]?.gridIndex)
    if (Number.isFinite(prev) && prev === safe) return

    pushUndoPoint('move')
    activeNotes.value[idx].gridIndex = safe
  }

  function setNoteLength(key, lengthBlocks) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return

    const n = Number(lengthBlocks)
    const safe = Number.isFinite(n) && n > 0 ? n : 1

    const prev = Number(activeNotes.value[idx]?.lengthBlocks)
    if (Number.isFinite(prev) && prev === safe) return

    pushUndoPoint('resize')
    activeNotes.value[idx].lengthBlocks = safe
  }

  function setManyGridIndices(entries) {
    if (!Array.isArray(entries) || !entries.length) return 0
    const changes = []
    for (const entry of entries) {
      const key = String(entry?.key || '')
      if (!key) continue
      const idx = findIndexByKey(key)
      if (idx === -1) continue
      const i = Number(entry?.gridIndex)
      const safe = Number.isFinite(i) && i > 0 ? i : 1
      const prev = Number(activeNotes.value[idx]?.gridIndex)
      if (Number.isFinite(prev) && prev === safe) continue
      changes.push({ idx, safe })
    }
    if (!changes.length) return 0
    pushUndoPoint('moveBatch')
    for (const c of changes) activeNotes.value[c.idx].gridIndex = c.safe
    return changes.length
  }

  function setManyLengths(entries) {
    if (!Array.isArray(entries) || !entries.length) return 0
    const changes = []
    for (const entry of entries) {
      const key = String(entry?.key || '')
      if (!key) continue
      const idx = findIndexByKey(key)
      if (idx === -1) continue
      const n = Number(entry?.lengthBlocks)
      const safe = Number.isFinite(n) && n > 0 ? n : 1
      const prev = Number(activeNotes.value[idx]?.lengthBlocks)
      if (Number.isFinite(prev) && prev === safe) continue
      changes.push({ idx, safe })
    }
    if (!changes.length) return 0
    pushUndoPoint('resizeBatch')
    for (const c of changes) activeNotes.value[c.idx].lengthBlocks = c.safe
    return changes.length
  }

  function setNotePosition(key, { fret, string } = {}) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return

    const nextFret = Number(fret)
    const nextString = Number(string)
    if (!Number.isFinite(nextFret) || nextFret < 0) return
    if (!Number.isFinite(nextString) || nextString < 1) return

    const prevFret = Number(activeNotes.value[idx]?.fret)
    const prevString = Number(activeNotes.value[idx]?.string)
    if (prevFret === nextFret && prevString === nextString) return

    pushUndoPoint('movePitch')
    activeNotes.value[idx].fret = nextFret
    activeNotes.value[idx].string = nextString
  }

  function setManyPositions(entries) {
    if (!Array.isArray(entries) || !entries.length) return 0
    const changes = []
    for (const entry of entries) {
      const key = String(entry?.key || '')
      if (!key) continue
      const idx = findIndexByKey(key)
      if (idx === -1) continue

      const nextFret = Number(entry?.fret)
      const nextString = Number(entry?.string)
      if (!Number.isFinite(nextFret) || nextFret < 0) continue
      if (!Number.isFinite(nextString) || nextString < 1) continue

      const prevFret = Number(activeNotes.value[idx]?.fret)
      const prevString = Number(activeNotes.value[idx]?.string)
      if (prevFret === nextFret && prevString === nextString) continue

      changes.push({ idx, nextFret, nextString })
    }
    if (!changes.length) return 0

    pushUndoPoint('movePitchBatch')
    for (const c of changes) {
      activeNotes.value[c.idx].fret = c.nextFret
      activeNotes.value[c.idx].string = c.nextString
    }
    return changes.length
  }

  function setNoteColor(key, color) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return
    const nextColor = String(color || '').trim()
    if (!nextColor) return
    const prevColor = String(activeNotes.value[idx]?.color || '').trim()
    if (prevColor === nextColor) return

    pushUndoPoint('recolor')
    activeNotes.value[idx].color = nextColor
  }

  function setManyColors(entries) {
    if (!Array.isArray(entries) || !entries.length) return 0
    const changes = []
    for (const entry of entries) {
      const key = String(entry?.key || '')
      if (!key) continue
      const idx = findIndexByKey(key)
      if (idx === -1) continue
      const nextColor = String(entry?.color || '').trim()
      if (!nextColor) continue
      const prevColor = String(activeNotes.value[idx]?.color || '').trim()
      if (prevColor === nextColor) continue
      changes.push({ idx, nextColor })
    }
    if (!changes.length) return 0

    pushUndoPoint('recolorBatch')
    for (const c of changes) activeNotes.value[c.idx].color = c.nextColor
    return changes.length
  }

  function setNotes(notesArray) {
    // Accept both legacy keys and note-objects; normalize to the canonical note shape.
    const normalized = []
    for (const item of notesArray ?? []) {
      const note = normalizeNote(item, { fallbackGridIndex: normalized.length + 1 })
      if (note) normalized.push(note)
    }

    activeNotes.value = normalized
  }

  function addNote(key) {
    const k = String(key)
    pushUndoPoint('add')
    const note = createNoteFromKey(k)
    activeNotes.value.push(note)
    return note
  }

  function addNotes(notesArray, { tag = 'addMany' } = {}) {
    if (!Array.isArray(notesArray) || !notesArray.length) return []

    const normalized = []
    const fallbackStart = activeNotes.value.length + 1
    for (const item of notesArray) {
      const note = normalizeNote(item, { fallbackGridIndex: fallbackStart + normalized.length })
      if (note) normalized.push(note)
    }
    if (!normalized.length) return []

    pushUndoPoint(tag)
    activeNotes.value.push(...normalized)
    return normalized
  }

  function removeNote(key) {
    const i = findIndexByKey(String(key))
    if (i > -1) pushUndoPoint('delete')
    if (i > -1) activeNotes.value.splice(i, 1)
  }

  function clearNotes() {
    if (activeNotes.value.length) pushUndoPoint('clear')
    activeNotes.value = []

    // UX: clearing notes should reset the timeline cursor.
    const transport = useTransportStore()
    transport.setPlayheadMs(0)
  }

  function getNoteDurationMs(note) {
    return lengthBlocksToDurationMs(note?.lengthBlocks)
  }

  return {
    activeNotes,
    undoStack,
    redoStack,
    undo,
    redo,
    setNotes,
    addNote,
    addNotes,
    removeNote,
    clearNotes,
    setNoteGridIndex,
    setNoteLength,
    setManyGridIndices,
    setManyLengths,
    setNotePosition,
    setManyPositions,
    setNoteColor,
    setManyColors,
    getNoteDurationMs,
  }
})
