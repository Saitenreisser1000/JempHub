import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readJson } from '@/infra/storage/jsonStorage'
import { persistRefs } from '@/infra/pinia/persistRefs'

const STORAGE_KEY = 'guitarjemp.shareContacts.v1'

function normalizeContact(raw) {
  return {
    id: String(raw?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(raw?.name || '').trim(),
    email: String(raw?.email || '').trim(),
    whatsapp: String(raw?.whatsapp || '').trim(),
  }
}

export const useShareContactsStore = defineStore('shareContacts', () => {
  const stored = readJson(STORAGE_KEY) ?? {}
  const base = Array.isArray(stored.contacts) ? stored.contacts : []
  const contacts = ref(base.map(normalizeContact))

  function addContact() {
    contacts.value = [...contacts.value, normalizeContact({})]
  }

  function updateContactField(id, field, value) {
    const key = String(field || '')
    if (!['name', 'email', 'whatsapp'].includes(key)) return
    const targetId = String(id || '')
    contacts.value = contacts.value.map((row) => {
      if (String(row.id) !== targetId) return row
      return { ...row, [key]: String(value || '').trim() }
    })
  }

  function removeContact(id) {
    const targetId = String(id || '')
    contacts.value = contacts.value.filter((row) => String(row.id) !== targetId)
  }

  persistRefs(STORAGE_KEY, { contacts })

  return {
    contacts,
    addContact,
    updateContactField,
    removeContact,
  }
})
