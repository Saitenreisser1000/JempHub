import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { useLibraryStore } from './useLibrary'

const { query, deleteQuery } = vi.hoisted(() => ({ query: vi.fn(), deleteQuery: vi.fn() }))
vi.mock('@/infra/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: { from: () => ({ select: () => ({ order: () => ({ limit: query }) }), delete: () => ({ eq: deleteQuery }) }) },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  query.mockReset()
  deleteQuery.mockReset()
})

it('preserves the visible list on a rejected refresh and permits retry', async () => {
  const store = useLibraryStore()
  store.items = [{ id: 'cached', title: 'Cached song' }]
  query.mockRejectedValueOnce(new Error('Offline'))
  await store.refresh()
  expect(store.items[0].id).toBe('cached')
  expect(store.error.message).toBe('Offline')
  expect(store.loading).toBe(false)
  query.mockResolvedValueOnce({ data: [{ id: 'fresh' }], error: null })
  await store.refresh()
  expect(store.items).toEqual([{ id: 'fresh' }])
  expect(store.error).toBeNull()
})

it('handles API-reported errors without discarding the visible list', async () => {
  const store = useLibraryStore()
  store.items = [{ id: 'cached' }]
  query.mockResolvedValue({ data: null, error: { message: 'Temporary failure' } })
  await store.refresh()
  expect(store.items).toEqual([{ id: 'cached' }])
  expect(store.error.message).toBe('Temporary failure')
  expect(store.loading).toBe(false)
})

it('prevents overlapping refreshes and keeps content visible while loading', async () => {
  const store = useLibraryStore()
  store.items = [{ id: 'cached' }]
  let finish
  query.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = store.refresh()
  expect(store.loading).toBe(true)
  expect(store.items).toEqual([{ id: 'cached' }])
  await store.refresh()
  expect(query).toHaveBeenCalledOnce()
  finish({ data: [], error: null })
  await pending
  expect(store.items).toEqual([])
  expect(store.loading).toBe(false)
})

it('updates the selected song metadata after a successful refresh', async () => {
  const store = useLibraryStore()
  store.setCurrentItem({ id: 'song', title: 'Old title' })
  query.mockResolvedValue({ data: [{ id: 'song', title: 'Updated title', content: { notes: [] } }], error: null })
  await store.refresh()
  expect(store.currentItem.title).toBe('Updated title')
  expect(store.currentItemContent).toEqual({ notes: [] })
})

it('removes a successfully deleted song even when the subsequent refresh fails', async () => {
  const store = useLibraryStore()
  store.items = [{ id: 'deleted' }, { id: 'keep' }]
  store.setCurrentItem({ id: 'deleted' })
  deleteQuery.mockResolvedValue({ error: null })
  query.mockRejectedValue(new Error('Offline'))
  expect(await store.deleteItem('deleted')).toBe(true)
  expect(store.items).toEqual([{ id: 'keep' }])
  expect(store.currentItem).toBeNull()
  expect(store.loading).toBe(false)
})
