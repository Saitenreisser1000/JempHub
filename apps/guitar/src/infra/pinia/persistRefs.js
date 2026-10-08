import { watch } from 'vue'
import { writeJson } from '@/infra/storage/jsonStorage'

export function persistRefs(storageKey, refsRecord, { flush = 'post' } = {}) {
  const entries = Object.entries(refsRecord)
  const sources = entries.map(([, r]) => r)

  watch(
    sources,
    () => {
      const snapshot = {}
      for (const [key, r] of entries) snapshot[key] = r.value
      writeJson(storageKey, snapshot)
    },
    { flush },
  )
}
