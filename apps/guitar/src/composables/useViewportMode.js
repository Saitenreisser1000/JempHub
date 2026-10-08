import { computed, ref } from 'vue'

const PHONE_VIEW_BREAKPOINT_PX = 860
const VIEWPORT_DEBUG_PRESETS = [
  { key: 'off', label: 'Off', widthPx: null, heightPx: null },
  { key: 'iphone-se', label: 'iPhone SE (667x375)', widthPx: 667, heightPx: 375 },
  { key: 'iphone-14-pro', label: 'iPhone 14 Pro (852x393)', widthPx: 852, heightPx: 393 },
  { key: 'pixel-7', label: 'Pixel 7 (915x412)', widthPx: 915, heightPx: 412 },
  { key: 'galaxy-s20', label: 'Galaxy S20 (800x360)', widthPx: 800, heightPx: 360 },
]

export function useViewportMode() {
  const viewMode = ref('desktop')
  const isPortraitViewport = ref(false)
  const viewportHeightUnitPx = ref(1)
  const debugViewportOpen = ref(false)
  const debugViewportPreset = ref('off')
  const debugViewportWidthPx = ref(null)
  const debugViewportHeightPx = ref(null)

  const isDevMode = computed(() => Boolean(import.meta.env.DEV))
  const debugViewportFrameActive = computed(
    () => isDevMode.value && String(debugViewportPreset.value || 'off') !== 'off',
  )
  const effectiveViewportHeightPx = computed(() => {
    const debugHeight = Number(debugViewportHeightPx.value)
    if (Number.isFinite(debugHeight) && debugHeight > 0) return debugHeight
    return (Number(viewportHeightUnitPx.value) || 1) * 100
  })
  const effectiveViewportWidthPx = computed(() => {
    const debugWidth = Number(debugViewportWidthPx.value)
    if (Number.isFinite(debugWidth) && debugWidth > 0) return debugWidth
    if (typeof window === 'undefined') return 1280
    return Number(window.innerWidth) || 1280
  })
  const effectiveViewMode = computed(() => {
    if (debugViewportFrameActive.value) return 'phone'
    return String(viewMode.value || 'desktop')
  })
  const isPhoneView = computed(() => effectiveViewMode.value === 'phone')
  const isWatchView = computed(() => effectiveViewMode.value === 'watch')
  const isCompactView = computed(() => isPhoneView.value || isWatchView.value)
  const effectiveIsPortrait = computed(() => {
    if (debugViewportFrameActive.value) {
      return Number(effectiveViewportHeightPx.value) > Number(effectiveViewportWidthPx.value)
    }
    return Boolean(isPortraitViewport.value)
  })
  const showPhoneRotateOverlay = computed(() => false)
  const appLayoutStyle = computed(() => ({
    '--app-vh': debugViewportFrameActive.value
      ? `${Math.max(0.01, Number(effectiveViewportHeightPx.value) / 100 || 1)}px`
      : null,
    '--app-debug-width': debugViewportFrameActive.value
      ? `${Math.max(320, Number(effectiveViewportWidthPx.value) || 1280)}px`
      : null,
    '--app-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
  }))

  function updateViewportOrientationFlag() {
    if (typeof window === 'undefined') return
    isPortraitViewport.value = window.innerHeight > window.innerWidth
  }

  function updateViewportHeightUnit() {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    const height = Number(vv?.height) || Number(window.innerHeight)
    if (!Number.isFinite(height) || height <= 0) return
    viewportHeightUnitPx.value = height / 100
  }

  function applyViewportDebugPreset(presetKey) {
    const key = String(presetKey || 'off')
    const preset = VIEWPORT_DEBUG_PRESETS.find((p) => p.key === key) || VIEWPORT_DEBUG_PRESETS[0]
    debugViewportPreset.value = preset.key
    debugViewportWidthPx.value = Number.isFinite(preset.widthPx) ? Number(preset.widthPx) : null
    debugViewportHeightPx.value = Number.isFinite(preset.heightPx) ? Number(preset.heightPx) : null
  }

  function shouldDefaultToPhoneView() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    const narrow = window.matchMedia(`(max-width: ${PHONE_VIEW_BREAKPOINT_PX}px)`).matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    return narrow && coarse
  }

  return {
    PHONE_VIEW_BREAKPOINT_PX,
    VIEWPORT_DEBUG_PRESETS,
    viewMode,
    isPortraitViewport,
    viewportHeightUnitPx,
    debugViewportOpen,
    debugViewportPreset,
    debugViewportWidthPx,
    debugViewportHeightPx,
    isDevMode,
    debugViewportFrameActive,
    effectiveViewportHeightPx,
    effectiveViewportWidthPx,
    effectiveViewMode,
    isPhoneView,
    isWatchView,
    isCompactView,
    effectiveIsPortrait,
    showPhoneRotateOverlay,
    appLayoutStyle,
    updateViewportOrientationFlag,
    updateViewportHeightUnit,
    applyViewportDebugPreset,
    shouldDefaultToPhoneView,
  }
}
