import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, isSupabaseConfigured } from '@/infra/supabase/client'

function isMissingTableError(err) {
  const code = err?.code
  const msg = String(err?.message ?? '')
  return code === '42P01' || msg.includes('does not exist')
}

export const useLibraryStore = defineStore('library', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentItem = ref(null)
  const currentItemContent = ref(null)

  function cloneJson(v) {
    if (v == null) return null
    try {
      return JSON.parse(JSON.stringify(v))
    } catch {
      return null
    }
  }

  function setCurrentItem(item) {
    if (!item) {
      currentItem.value = null
      currentItemContent.value = null
      return
    }
    currentItem.value = {
      id: item?.id ?? null,
      owner_id: item?.owner_id ?? null,
      kind: item?.kind ?? null,
      title: item?.title ?? null,
      visibility: item?.visibility ?? null,
      category: item?.category ?? null,
      created_at: item?.created_at ?? null,
      updated_at: item?.updated_at ?? null,
    }

    // Baseline content for Reset.
    currentItemContent.value = cloneJson(item?.content ?? null)
  }

  function clearCurrentItem() {
    currentItem.value = null
    currentItemContent.value = null
  }

  async function refresh() {
    error.value = null
    items.value = []

    if (!isSupabaseConfigured || !supabase) return

    loading.value = true
    const { data, error: err } = await supabase
      .from('library_items')
      .select('id, kind, title, visibility, category, content, created_at, updated_at, owner_id')
      .order('updated_at', { ascending: false })
      .limit(100)

    loading.value = false

    if (err) {
      if (isMissingTableError(err)) return
      error.value = err
      return
    }

    items.value = Array.isArray(data) ? data : []

    // Keep currentItem in sync (title/updated_at etc.) if it still exists.
    const currentId = currentItem.value?.id
    if (currentId) {
      const next = items.value.find((i) => i?.id === currentId)
      if (next) setCurrentItem(next)
    }
  }

  async function createItem({ kind, title, visibility, category, content } = {}) {
    error.value = null

    if (!isSupabaseConfigured || !supabase) {
      error.value = new Error('Supabase is not configured.')
      return null
    }

    const payload = {
      kind: String(kind ?? 'song'),
      title: String(title ?? '').trim(),
      visibility: String(visibility ?? 'private'),
      category: category ? String(category).trim() : null,
      content: content ?? {},
    }

    const { data, error: err } = await supabase
      .from('library_items')
      .insert(payload)
      .select('id, kind, title, visibility, category, content, created_at, updated_at, owner_id')
      .single()

    if (err) {
      error.value = err
      return null
    }
    setCurrentItem(data)
    await refresh()
    return data ?? null
  }

  async function updateItem({ id, content } = {}) {
    error.value = null

    if (!isSupabaseConfigured || !supabase) {
      error.value = new Error('Supabase is not configured.')
      return null
    }

    const itemId = String(id ?? '').trim()
    if (!itemId) {
      error.value = new Error('No item selected.')
      return null
    }

    const payload = {
      content: content ?? {},
    }

    const { data, error: err } = await supabase
      .from('library_items')
      .update(payload)
      .eq('id', itemId)
      .select('id, kind, title, visibility, category, content, created_at, updated_at, owner_id')
      .single()

    if (err) {
      error.value = err
      return null
    }

    setCurrentItem(data)
    await refresh()
    return data ?? null
  }

  async function updateCurrentItemContent(content) {
    const id = currentItem.value?.id
    return updateItem({ id, content })
  }

  async function deleteItem(id) {
    error.value = null

    if (!isSupabaseConfigured || !supabase) {
      error.value = new Error('Supabase is not configured.')
      return false
    }

    const itemId = String(id ?? '').trim()
    if (!itemId) {
      error.value = new Error('No item selected.')
      return false
    }

    const { error: err } = await supabase
      .from('library_items')
      .delete()
      .eq('id', itemId)

    if (err) {
      error.value = err
      return false
    }

    if (String(currentItem.value?.id ?? '') === itemId) clearCurrentItem()
    await refresh()
    return true
  }

  return {
    items,
    loading,
    error,
    currentItem,
    currentItemContent,
    setCurrentItem,
    clearCurrentItem,
    refresh,
    createItem,
    updateItem,
    updateCurrentItemContent,
    deleteItem,
  }
})
