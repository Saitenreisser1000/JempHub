import { computed, ref } from 'vue'
import { buildSongSnapshot } from '@/domain/song/songSnapshot'
import { buildExchangeClip } from '@/domain/exchange/clipExchange'
import { toMusicXml } from '@/domain/exchange/musicxml'
import { toMidiBytes } from '@/domain/exchange/midi'
import { toPdfBytes } from '@/domain/exchange/pdf'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { planImportedFretboardLayout } from '@/domain/exchange/importFretboardLayout'
import { getTuning } from '@/domain/music/tunings'
import { createNoteKey } from '@/domain/note'
import { downloadBinaryFile, downloadTextFile } from '@/infra/files/download'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'

export function useSongEditorActions({
  instrument,
  auth,
  notes,
  selection,
  handPositions,
  transport,
  timelineSettings,
  library,
  harmony,
  fretboardOverlay,
  numFrets,
  songName,
  importFilesInputEl,
  t,
}) {
  const newSongOpen = ref(false)
  const songDialogMode = ref('new')
  const newSongTitle = ref('')
  const newSongBeatTop = ref(4)
  const newSongBeatBottom = ref(4)
  const newSongKey = ref('C')
  const newSongBars = ref(2)
  const newSongPickupEnabled = ref(false)
  const newSongPickupBeats = ref(0)
  const newSongShuffleEnabled = ref(false)
  const newSongBpm = ref(120)
  const saveAsNewOpen = ref(false)
  const saveAsNewTitle = ref('')
  const saveAsNewVisibility = ref('private')
  const saveAsNewCategory = ref('')
  const saveAsNewBusy = ref(false)
  const saveBusy = ref(false)

  const SONG_KEY_OPTIONS = new Set(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])

  const hasNotes = computed(() => (notes.activeNotes?.length ?? 0) > 0)
  const canSaveAsNew = computed(() => hasNotes.value)
  const canOverwriteCurrentLibraryItem = computed(() => {
    const currentId = String(library.currentItem?.id ?? '').trim()
    const ownerId = String(library.currentItem?.owner_id ?? '').trim()
    const meId = String(auth.user?.id ?? '').trim()
    if (!auth.isSignedIn) return false
    if (!currentId || !ownerId || !meId) return false
    return ownerId === meId
  })

  function exportBaseName() {
    const raw = String(songName.value || 'guitarjemp-export').trim()
    const normalized = raw
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
    return normalized || 'guitarjemp-export'
  }

  function buildCurrentExportClip() {
    return buildExchangeClip({
      notes: notes.activeNotes,
      instrument,
      transport,
      settings: timelineSettings,
    })
  }

  function exportMusicXml() {
    const clip = buildCurrentExportClip()
    const xml = toMusicXml(clip, { title: exportBaseName() })
    downloadTextFile(`${exportBaseName()}.musicxml`, xml, 'application/vnd.recordare.musicxml+xml;charset=utf-8')
  }

  function exportMidi() {
    const clip = buildCurrentExportClip()
    const bytes = toMidiBytes(clip)
    downloadBinaryFile(`${exportBaseName()}.mid`, bytes, 'audio/midi')
  }

  function exportPdf() {
    const clip = buildCurrentExportClip()
    const keySignature = String(harmony.scaleRoot || harmony.chordRoot || newSongKey.value || 'C').toUpperCase()
    const bytes = toPdfBytes(clip, {
      title: String(songName.value || exportBaseName()),
      keySignature,
      fretCount: Number(numFrets.value) || 12,
    })
    downloadBinaryFile(`${exportBaseName()}.pdf`, bytes, 'application/pdf')
  }

  function isMusicXmlFilename(name) {
    return /\.(musicxml|xml)$/i.test(String(name || '').trim())
  }

  function sortedImportFiles(fileList) {
    return [...(fileList ?? [])]
      .filter((file) => file instanceof File)
      .filter((file) => isMusicXmlFilename(file.name))
      .sort((a, b) => {
        const aPath = String(a.webkitRelativePath || a.name || '').toLowerCase()
        const bPath = String(b.webkitRelativePath || b.name || '').toLowerCase()
        return aPath.localeCompare(bPath)
      })
  }

  function importedClipEndBlock(clip) {
    let max = 0
    for (const note of clip?.notes ?? []) {
      const gridIndex = Number(note?.gridIndex)
      const lengthBlocks = Number(note?.lengthBlocks)
      if (!Number.isFinite(gridIndex) || !Number.isFinite(lengthBlocks)) continue
      max = Math.max(max, gridIndex - 1 + lengthBlocks)
    }
    return max
  }

  function buildImportedNotes(clips) {
    const merged = []
    for (const clip of clips) {
      for (const note of clip?.notes ?? []) {
        merged.push({
          ...note,
          key: createNoteKey(),
          gridIndex: Number(note.gridIndex),
          placedAtMs: Date.now(),
        })
      }
    }
    return merged
  }

  function applyImportedClipSettings(firstClip, mergedNotes, { handPositions: importedHandPositions = [], requiredNumFrets = 12 } = {}) {
    if (!firstClip) return

    songName.value = String(firstClip.title || songName.value || '').trim()
    transport.setTempo(firstClip.tempo)
    timelineSettings.setBeatTop(firstClip.beatTop)
    timelineSettings.setBeatBottom(firstClip.beatBottom)

    const importedEnd = importedClipEndBlock({ notes: mergedNotes })
    const nextTimelineLength = Math.max(Number(timelineSettings.timelineLengthBlocks) || 0, importedEnd)
    if (nextTimelineLength > 0) timelineSettings.setTimelineLengthBlocks(nextTimelineLength)

    if (requiredNumFrets > (Number(numFrets.value) || 0)) {
      numFrets.value = requiredNumFrets
    }

    handPositions.setHandPositions(importedHandPositions)
    fretboardOverlay.setTextItems([])
    selection.clearSelection()
    transport.setPlayState('stopped')
    transport.setPlayheadMs(0)
  }

  async function importMusicXmlFiles(fileList) {
    const files = sortedImportFiles(fileList)
    if (!files.length) return

    try {
      const tuning = getTuning(instrument.tuningId)
      const clips = []
      const importMaxFret = Math.max(36, Number(numFrets.value) || 0)
      for (const file of files) {
        const xmlText = await file.text()
        const clip = parseMusicXmlToClip(xmlText, {
          openMidi: tuning?.openMidi ?? [],
          maxFret: importMaxFret,
        })
        if (Array.isArray(clip?.notes) && clip.notes.length) clips.push(clip)
      }

      if (!clips.length) {
        window.alert(t('app.importNoNotes'))
        return
      }

      const mergedNotes = buildImportedNotes(clips)
      const layout = planImportedFretboardLayout(mergedNotes, {
        numFrets: Number(numFrets.value) || 12,
        openMidi: tuning?.openMidi ?? [],
      })
      notes.setNotes(layout.notes)
      applyImportedClipSettings(clips[0], layout.notes, layout)
    } catch (error) {
      const message = String(error?.message || error || t('app.importFailed'))
      window.alert(`${t('app.importFailed')} ${message}`.trim())
    }
  }

  function clearImportInputValue(inputEl) {
    if (!inputEl) return
    inputEl.value = ''
  }

  function openImportFiles() {
    clearImportInputValue(importFilesInputEl.value)
    importFilesInputEl.value?.click()
  }

  async function onImportFilesChange(event) {
    const input = event?.target
    await importMusicXmlFiles(input?.files)
    clearImportInputValue(input)
  }

  async function saveCurrentSong() {
    if (saveBusy.value || saveAsNewBusy.value) return

    const snapshot = buildSongSnapshot({
      name: songName.value,
      instrument,
      transport,
      timelineSettings,
      notes,
      handPositions,
      fretboardOverlay,
    })

    if (!canOverwriteCurrentLibraryItem.value) {
      openSaveAsNew()
      return
    }

    const id = String(library.currentItem?.id ?? '').trim()
    if (!id) {
      openSaveAsNew()
      return
    }

    saveBusy.value = true
    const updated = await library.updateItem({ id, content: snapshot })
    saveBusy.value = false

    if (!updated) {
      const msg = String(library.error?.message ?? library.error ?? 'Save failed')
      window.alert(msg)
    }
  }

  async function saveAsNewToCloud() {
    if (saveAsNewBusy.value) return
    if (!auth.isSignedIn) return false
    if (!hasNotes.value) return false

    const title = String(saveAsNewTitle.value ?? '').trim()
    if (!title) return false

    const kind = String(library.currentItem?.kind ?? 'song')
    const category = String(saveAsNewCategory.value ?? '').trim()
    const visibility = String(saveAsNewVisibility.value ?? 'private')

    saveAsNewBusy.value = true
    const created = await library.createItem({
      kind,
      title,
      visibility,
      category,
      content: buildSongSnapshot({
        name: songName.value,
        instrument,
        transport,
        timelineSettings,
        notes,
        handPositions,
        fretboardOverlay,
      }),
    })
    saveAsNewBusy.value = false

    if (!created) {
      const msg = String(library.error?.message ?? library.error ?? 'Save As New failed')
      window.alert(msg)
      return false
    }

    saveAsNewOpen.value = false
    return true
  }

  function openSaveAsNew() {
    const fromNameField = String(songName.value ?? '').trim()
    const base = String(library.currentItem?.title ?? '').trim()
    const currentCategory = String(library.currentItem?.category ?? '').trim()
    if (fromNameField) saveAsNewTitle.value = fromNameField
    else saveAsNewTitle.value = base ? `${base} (copy)` : 'New Recording'
    saveAsNewVisibility.value = 'private'
    saveAsNewCategory.value = currentCategory
    saveAsNewOpen.value = true
  }

  function fillSongDialogFromCurrentState() {
    newSongTitle.value = String(songName.value || '').trim()
    newSongBeatTop.value = Number(timelineSettings.beatTop) || 4
    newSongBeatBottom.value = Number(timelineSettings.beatBottom) || 4
    const key = String(harmony.scaleRoot || harmony.chordRoot || 'C').toUpperCase()
    newSongKey.value = SONG_KEY_OPTIONS.has(key) ? key : 'C'
    const barSize = Math.max(
      1,
      (Number(timelineSettings.beatTop) || 4) * (4 / (Number(timelineSettings.beatBottom) || 4)),
    )
    const bars = Math.max(1, Math.round((Number(timelineSettings.timelineLengthBlocks) || 0) / barSize))
    newSongBars.value = bars || 2
    newSongPickupEnabled.value = Boolean(timelineSettings.pickupEnabled)
    newSongPickupBeats.value = Math.max(0, Number(timelineSettings.pickupBeats) || 0)
    newSongShuffleEnabled.value = Boolean(timelineSettings.shuffleEnabled)
    newSongBpm.value = Number(transport.tempo) || 120
  }

  function openNewSongDialog() {
    songDialogMode.value = 'new'
    fillSongDialogFromCurrentState()
    newSongOpen.value = true
  }

  function openSongSettingsDialog() {
    songDialogMode.value = 'edit'
    fillSongDialogFromCurrentState()
    newSongOpen.value = true
  }

  function applyNewSong() {
    const title = String(newSongTitle.value || '').trim()
    songName.value = title
    const beatTop = Math.max(1, Math.floor(Number(newSongBeatTop.value) || 4))
    const beatBottomRaw = Math.floor(Number(newSongBeatBottom.value) || 4)
    const beatBottom = [1, 2, 4, 8].includes(beatBottomRaw) ? beatBottomRaw : 4
    const bars = Math.max(1, Math.floor(Number(newSongBars.value) || 2))
    const bpm = Math.max(30, Math.min(260, Math.floor(Number(newSongBpm.value) || 120)))
    const pickupBeats = Math.max(0, Math.floor(Number(newSongPickupBeats.value) || 0))
    const pickupEnabled = Boolean(newSongPickupEnabled.value) && pickupBeats > 0
    const shuffleEnabled = Boolean(newSongShuffleEnabled.value)
    const key = String(newSongKey.value || 'C').toUpperCase()

    if (songDialogMode.value === 'new') {
      notes.clearNotes()
      selection.clearSelection()
      handPositions.setHandPositions([])
      fretboardOverlay.setTextItems([])
      transport.setPlayState('stopped')
      transport.setPlayheadMs(0)
    }

    transport.setTempo(bpm)
    timelineSettings.setBeatTop(beatTop)
    timelineSettings.setBeatBottom(beatBottom)
    timelineSettings.setPickupEnabled(pickupEnabled)
    timelineSettings.setPickupBeats(pickupBeats)
    timelineSettings.setShuffleEnabled(shuffleEnabled)
    timelineSettings.setLoopEnabled(false)

    const blocksPerBar = Math.max(1, Number((beatTop * (4 / beatBottom)).toFixed(3)))
    timelineSettings.setTimelineLengthBlocks(Number((bars * blocksPerBar).toFixed(3)))

    if (SONG_KEY_OPTIONS.has(key)) {
      harmony.scaleRoot = key
      harmony.chordRoot = key
    }

    newSongOpen.value = false
  }

  function applyConfiguredDefaultTimelineLength() {
    const top = Number(timelineSettings.beatTop) || 4
    const bottom = Number(timelineSettings.beatBottom) || 4
    const blocksPerBar = Math.max(1, Number((top * (4 / bottom)).toFixed(3)))
    const bars = Math.max(1, Number(TIMELINE_LAYOUT.bars.defaultCount) || 2)
    timelineSettings.setTimelineLengthBlocks(Number((blocksPerBar * bars).toFixed(3)))
  }

  function resetEditorToDefaultLength() {
    notes.clearNotes()
    selection.clearSelection()
    applyConfiguredDefaultTimelineLength()
  }

  return {
    hasNotes,
    canSaveAsNew,
    canOverwriteCurrentLibraryItem,
    newSongOpen,
    songDialogMode,
    newSongTitle,
    newSongBeatTop,
    newSongBeatBottom,
    newSongKey,
    newSongBars,
    newSongPickupEnabled,
    newSongPickupBeats,
    newSongShuffleEnabled,
    newSongBpm,
    saveAsNewOpen,
    saveAsNewTitle,
    saveAsNewVisibility,
    saveAsNewCategory,
    saveAsNewBusy,
    saveBusy,
    saveCurrentSong,
    exportMusicXml,
    exportMidi,
    exportPdf,
    openImportFiles,
    onImportFilesChange,
    saveAsNewToCloud,
    openSaveAsNew,
    openNewSongDialog,
    openSongSettingsDialog,
    applyNewSong,
    applyConfiguredDefaultTimelineLength,
    resetEditorToDefaultLength,
  }
}
