import { expect, it, vi } from 'vitest'
import { useLibraryDeletion } from './useLibraryDeletion'

const song = { id: 'song', owner_id: 'me', title: 'My song' }
function setup() {
  const library = { deleteItem: vi.fn().mockResolvedValue(true) }
  const auth = { user: { id: 'me' } }
  return { library, auth, ...useLibraryDeletion({ library, auth }) }
}

it('does not delete before confirmation and supports cancellation', () => {
  const state = setup()
  state.request(song)
  expect(state.pendingItem.value.title).toBe('My song')
  expect(state.library.deleteItem).not.toHaveBeenCalled()
  state.cancel()
  expect(state.pendingItem.value).toBeNull()
  expect(state.library.deleteItem).not.toHaveBeenCalled()
})

it('rejects other owners and rechecks a changed login before confirmation', async () => {
  const state = setup()
  state.request({ ...song, owner_id: 'someone-else' })
  expect(state.pendingItem.value).toBeNull()
  state.request(song)
  state.auth.user = null
  expect(await state.confirm()).toBe(false)
  expect(state.failed.value).toBe(true)
  expect(state.library.deleteItem).not.toHaveBeenCalled()
})

it('retains the dialog and unlocks retry after rejected requests', async () => {
  const state = setup()
  state.request(song)
  state.library.deleteItem.mockRejectedValueOnce(new Error('Offline'))
  expect(await state.confirm()).toBe(false)
  expect(state.pendingItem.value.id).toBe(song.id)
  expect(state.failed.value).toBe(true)
  expect(state.busy.value).toBe(false)
  expect(await state.confirm()).toBe(true)
  expect(state.pendingItem.value).toBeNull()
  expect(state.failed.value).toBe(false)
})

it('keeps a store-reported failure open rather than announcing success', async () => {
  const state = setup()
  state.request(song)
  state.library.deleteItem.mockResolvedValue(false)
  expect(await state.confirm()).toBe(false)
  expect(state.pendingItem.value).not.toBeNull()
  expect(state.failed.value).toBe(true)
})

it('prevents duplicate requests, target changes and dismissal while deleting', async () => {
  const state = setup()
  let finish
  state.library.deleteItem.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  state.request(song)
  const pending = state.confirm()
  state.request({ ...song, id: 'other-song' })
  state.cancel()
  expect(await state.confirm()).toBe(false)
  expect(state.pendingItem.value.id).toBe('song')
  expect(state.library.deleteItem).toHaveBeenCalledExactlyOnceWith('song')
  finish(true)
  expect(await pending).toBe(true)
  expect(state.busy.value).toBe(false)
  expect(state.pendingItem.value).toBeNull()
})
