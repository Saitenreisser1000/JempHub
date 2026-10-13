import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { useSongEditorActions } from './useSongEditorActions'

beforeEach(() => vi.stubGlobal('window', { alert: vi.fn() }))
afterEach(() => vi.unstubAllGlobals())

function setup() {
  const library = reactive({
    currentItem: { id: 'original', owner_id: 'me', title: 'Original', kind: 'song' },
    clearCurrentItem: vi.fn(() => { library.currentItem = null }),
    updateItem: vi.fn().mockResolvedValue({ id: 'original' }),
    createItem: vi.fn().mockResolvedValue({ id: 'new' }),
  })
  const notes = reactive({ activeNotes: [{ fret: 3, string: 1 }], clearNotes: vi.fn() })
  const timelineSettings = {
    beatTop: 4, beatBottom: 4, timelineLengthBlocks: 8,
    setBeatTop: vi.fn(), setBeatBottom: vi.fn(), setPickupEnabled: vi.fn(),
    setPickupBeats: vi.fn(), setShuffleEnabled: vi.fn(), setLoopEnabled: vi.fn(),
    setTimelineLengthBlocks: vi.fn(),
  }
  const actions = useSongEditorActions({
    instrument: {}, auth: { isSignedIn: true, user: { id: 'me' } }, notes,
    selection: { clearSelection: vi.fn() }, handPositions: { setHandPositions: vi.fn() },
    transport: { tempo: 120, setTempo: vi.fn(), setPlayState: vi.fn(), setPlayheadMs: vi.fn() },
    timelineSettings, library, harmony: {}, fretboardOverlay: { setTextItems: vi.fn() },
    numFrets: ref(12), songName: ref('Song'), importFilesInputEl: ref(null), t: (key) => key,
  })
  return { actions, library, notes }
}

it('detaches a new song from the previous cloud item before the next save', async () => {
  const { actions, library, notes } = setup()
  actions.openNewSongDialog()
  expect(library.clearCurrentItem).not.toHaveBeenCalled()
  actions.newSongTitle.value = 'New song'
  actions.applyNewSong()
  expect(library.currentItem).toBeNull()
  expect(notes.clearNotes).toHaveBeenCalledOnce()
  await actions.saveCurrentSong()
  expect(library.updateItem).not.toHaveBeenCalled()
  expect(actions.saveAsNewOpen.value).toBe(true)
})
it('keeps the cloud identity and notes when changing song settings', async () => {
  const { actions, library, notes } = setup()
  actions.openSongSettingsDialog()
  actions.applyNewSong()
  expect(library.clearCurrentItem).not.toHaveBeenCalled()
  expect(notes.clearNotes).not.toHaveBeenCalled()
  await actions.saveCurrentSong()
  expect(library.updateItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'original' }))
})
it('releases the save lock after rejection so the user can retry', async () => {
  const { actions, library } = setup()
  library.updateItem.mockRejectedValueOnce(new Error('Offline'))
  await actions.saveCurrentSong()
  expect(window.alert).toHaveBeenCalledWith('Offline')
  expect(actions.saveBusy.value).toBe(false)
  await actions.saveCurrentSong()
  expect(library.updateItem).toHaveBeenCalledTimes(2)
})
it('keeps Save As open after failure and allows a successful retry', async () => {
  const { actions, library } = setup()
  actions.openSaveAsNew()
  library.createItem.mockRejectedValueOnce(new Error('Offline'))
  expect(await actions.saveAsNewToCloud()).toBe(false)
  expect(actions.saveAsNewOpen.value).toBe(true)
  expect(actions.saveAsNewBusy.value).toBe(false)
  expect(await actions.saveAsNewToCloud()).toBe(true)
  expect(actions.saveAsNewOpen.value).toBe(false)
})
it('prevents parallel overwrite and Save As requests', async () => {
  const { actions, library } = setup()
  let resolveSave
  library.updateItem.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve }))
  actions.openSaveAsNew()
  const saving = actions.saveCurrentSong()
  await actions.saveCurrentSong()
  expect(await actions.saveAsNewToCloud()).toBe(false)
  expect(library.updateItem).toHaveBeenCalledOnce()
  expect(library.createItem).not.toHaveBeenCalled()
  resolveSave({ id: 'original' })
  await saving
  expect(actions.saveBusy.value).toBe(false)
})
it('reports store-returned errors without leaving Save As busy', async () => {
  const { actions, library } = setup()
  actions.openSaveAsNew()
  library.createItem.mockResolvedValue(null)
  library.error = new Error('Save unavailable')
  expect(await actions.saveAsNewToCloud()).toBe(false)
  expect(window.alert).toHaveBeenCalledWith('Save unavailable')
  expect(actions.saveAsNewBusy.value).toBe(false)
})
