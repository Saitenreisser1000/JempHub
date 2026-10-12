import { computed, ref } from 'vue'
import { useUiModeStore } from '@/store/useUiMode'

const DOT_GROUP_NAMES_STORAGE_KEY = 'guitarjemp.dotGroupNames.v1'

function readStoredDotGroupNames() {
  try {
    const raw = localStorage.getItem(DOT_GROUP_NAMES_STORAGE_KEY)
    const parsed = JSON.parse(String(raw || '{}'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function useAppDotGroups({ notes, selection, timelineSettings, timelineRef }) {
  const uiMode = useUiModeStore()
  const dotGroupNames = ref(readStoredDotGroupNames())
  const dotGroupMenu = ref({
    open: false,
    x: 0,
    y: 0,
    color: '',
  })

  const usedDotGroups = computed(() => {
    const items = Array.isArray(notes.activeNotes) ? [...notes.activeNotes] : []
    items.sort((a, b) => {
      const ga = Number(a?.gridIndex) || 0
      const gb = Number(b?.gridIndex) || 0
      if (ga !== gb) return ga - gb
      const ta = Number(a?.placedAtMs) || 0
      const tb = Number(b?.placedAtMs) || 0
      if (ta !== tb) return ta - tb
      return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
    })

    const seen = new Set()
    const out = []
    for (const note of items) {
      const color = String(note?.color || '').trim()
      if (!color || seen.has(color)) continue
      seen.add(color)
      const customLabel = String(dotGroupNames.value?.[color] || '').trim()
      out.push({
        id: `dot-group-${out.length + 1}`,
        color,
        label: customLabel || `#${out.length + 1}`,
        defaultLabel: `#${out.length + 1}`,
      })
    }
    return out
  })

  const allDotGroupsSelected = computed(
    () => !String(timelineSettings.activeDotGroupColor || '').trim(),
  )
  const hasDotGroups = computed(() => usedDotGroups.value.length > 0)

  function persistDotGroupNames() {
    try {
      localStorage.setItem(DOT_GROUP_NAMES_STORAGE_KEY, JSON.stringify(dotGroupNames.value || {}))
    } catch {
      // ignore persistence errors
    }
  }

  function openDotGroupMenu(event, group) {
    if (!uiMode.surfacePolicy.canEditNotes) return
    event?.preventDefault?.()
    dotGroupMenu.value = {
      open: true,
      x: Number(event?.clientX) || 0,
      y: Number(event?.clientY) || 0,
      color: String(group?.color || ''),
    }
  }

  function closeDotGroupMenu() {
    dotGroupMenu.value = {
      open: false,
      x: 0,
      y: 0,
      color: '',
    }
  }

  function renameDotGroup() {
    if (!uiMode.surfacePolicy.canEditNotes) return
    const color = String(dotGroupMenu.value.color || '').trim()
    if (!color) return
    const group = usedDotGroups.value.find((item) => item.color === color)
    const current = String(dotGroupNames.value?.[color] || group?.defaultLabel || '').trim()
    const next = window.prompt('Tongroup umbenennen', current)
    if (next == null) {
      closeDotGroupMenu()
      return
    }
    const trimmed = String(next).trim()
    const updated = { ...(dotGroupNames.value || {}) }
    if (!trimmed || trimmed === String(group?.defaultLabel || '').trim()) delete updated[color]
    else updated[color] = trimmed
    dotGroupNames.value = updated
    persistDotGroupNames()
    closeDotGroupMenu()
  }

  function deleteDotGroup(color = dotGroupMenu.value.color) {
    if (!uiMode.surfacePolicy.canEditNotes) return
    const target = String(color || '').trim()
    if (!target) return
    const removedKeys = new Set(notes.removeNotesByColor(target))
    if (removedKeys.size) {
      selection.setSelectedNotes(selection.selectedNoteKeys.filter((key) => !removedKeys.has(key)))
      if (String(timelineSettings.activeDotGroupColor || '').trim() === target) {
        timelineSettings.setActiveDotGroupColor('')
      }
    }
    // Keep the custom name so Undo restores the group with its label.
    closeDotGroupMenu()
  }

  function onWindowPointerDown(event) {
    if (!dotGroupMenu.value.open) return
    const target = event?.target
    if (target?.closest?.('.dot-group-context-menu')) return
    closeDotGroupMenu()
  }

  function activateAllDotGroups() {
    if (!hasDotGroups.value) return
    timelineSettings.setActiveDotGroupColor('')
  }

  function activateDotGroup(color) {
    const nextColor = String(color || '').trim()
    timelineSettings.setActiveDotGroupColor(nextColor)
    if (!nextColor) return
    const firstNote = (Array.isArray(notes.activeNotes) ? [...notes.activeNotes] : [])
      .filter((note) => String(note?.color || '').trim() === nextColor)
      .sort((a, b) => {
        const ga = Number(a?.gridIndex) || 0
        const gb = Number(b?.gridIndex) || 0
        if (ga !== gb) return ga - gb
        const ta = Number(a?.placedAtMs) || 0
        const tb = Number(b?.placedAtMs) || 0
        if (ta !== tb) return ta - tb
        return String(a?.key || '').localeCompare(String(b?.key || ''))
      })[0]
    const firstGridIndex = Number(firstNote?.gridIndex)
    if (Number.isFinite(firstGridIndex) && firstGridIndex > 0) {
      timelineRef.value?.seekToGridIndex?.(firstGridIndex)
    }
  }

  return {
    dotGroupNames,
    dotGroupMenu,
    usedDotGroups,
    allDotGroupsSelected,
    hasDotGroups,
    openDotGroupMenu,
    closeDotGroupMenu,
    renameDotGroup,
    deleteDotGroup,
    onWindowPointerDown,
    activateAllDotGroups,
    activateDotGroup,
  }
}
