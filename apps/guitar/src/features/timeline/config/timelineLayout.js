export const TIMELINE_LAYOUT = {
  main: {
    defaultHeightPx: 360,
    minHeightPx: 180,
    maxViewportOffsetPx: 40,
    resizeHandleHeightPx: 10,
  },
  secondaryMenu: {
    sizes: { s: 64, m: 224, l: 320 },
    order: ['s', 'm', 'l'],
  },
  zoom: {
    uiMinPxPerBlock: 12,
    uiMaxPxPerBlock: 120,
    uiStepPxPerBlock: 2,
    wheelMinPxPerBlock: 8,
    wheelMaxPxPerBlock: 200,
    wheelStepPxPerBlock: 4,
  },
  tracks: {
    startOffsetPx: 6,
    defaultRowHeightPx: 44,
    minRowHeightPx: 12,
    minRowsAreaPx: 24,
    minColumnsHeightPx: 140,
    columnsReservedBottomPx: 64,
    stringNameColWidthPx: 17,
    gridVisibility: {
      subStrongMinPxPerBlock: 42,
      subWeakMinPxPerBlock: 22,
      beatMinPxPerBlock: 12,
      subStrongOpacity: 0.35,
      subWeakOpacity: 0.2,
      beatWeakOpacity: 0.7,
    },
  },
  headers: {
    loopHeaderPx: 18,
    markerHeaderPx: 18,
    markerLayerHeightPx: 16,
    markerLayerBottomGapPx: 2,
    loopBracketLayerHeightPx: 16,
  },
  marquee: {
    autoScrollMarginPx: 56,
  },
  bars: {
    defaultCount: 2,
    maxCount: 512,
  },
  breakpoints: {
    tabletMax: 1200,
    mobileMax: 860,
    tabletUiScale: 0.96,
    mobileUiScale: 0.92,
  },
  topRow: {
    optionsMenuMinWidthPx: 220,
    beatBottomItems: [1, 2, 4, 8],
  },
}
