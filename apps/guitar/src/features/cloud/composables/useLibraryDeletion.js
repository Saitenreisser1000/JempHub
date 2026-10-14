import { ref } from 'vue'

export function useLibraryDeletion({ library, auth }) {
  const pendingItem = ref(null)
  const busy = ref(false)
  const failed = ref(false)

  function canDelete(item) {
    return Boolean(item?.id && auth.user?.id && item.owner_id === auth.user.id)
  }

  function request(item) {
    if (busy.value || !canDelete(item)) return
    pendingItem.value = { id: item.id, title: item.title, owner_id: item.owner_id }
    failed.value = false
  }

  function cancel() {
    if (busy.value) return
    pendingItem.value = null
    failed.value = false
  }

  async function confirm() {
    if (busy.value || !pendingItem.value) return false
    // Recheck ownership: authentication can change while the dialog is open.
    if (!canDelete(pendingItem.value)) {
      failed.value = true
      return false
    }
    busy.value = true
    failed.value = false
    try {
      const deleted = await library.deleteItem(pendingItem.value.id)
      if (!deleted) {
        failed.value = true
        return false
      }
      pendingItem.value = null
      return true
    } catch {
      failed.value = true
      return false
    } finally {
      busy.value = false
    }
  }

  return { pendingItem, busy, failed, canDelete, request, cancel, confirm }
}
