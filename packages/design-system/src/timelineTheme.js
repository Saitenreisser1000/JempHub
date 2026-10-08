export const TIMELINE_THEME = {
  main: {
    resizeHandleLineColor: 'rgb(255 255 255 / 0.42)',
    mainBgMix: 'linear-gradient(180deg, rgb(70 81 97 / 0.94), rgb(56 65 79 / 0.97))',
    viewportBgMix: 'linear-gradient(180deg, rgb(43 50 62 / 0.99), rgb(33 39 48 / 0.99))',
    viewportShadow:
      'inset 0 1px 0 rgb(255 255 255 / 0.04), inset 0 18px 26px -22px rgb(255 255 255 / 0.05), inset 0 -14px 22px -16px rgb(0 0 0 / 0.42), inset 18px 0 18px -11px rgb(0 0 0 / 0.26), inset -18px 0 18px -11px rgb(0 0 0 / 0.26)',
    columnCardBgMix: 'linear-gradient(180deg, rgb(61 72 87 / 0.97), rgb(49 58 71 / 0.98))',
    stringNamesBgMix: 'linear-gradient(180deg, rgb(72 84 101 / 0.94), rgb(59 69 83 / 0.98))',
    auxDividerColor: 'rgb(208 138 67 / 0.45)',
    markerColor: 'color-mix(in srgb, #d08a43 72%, #f7e2bf 28%)',
    loopBarColor: 'linear-gradient(90deg, rgb(208 138 67 / 0.86), rgb(232 185 118 / 0.9))',
    loopHandleBg: 'linear-gradient(180deg, rgb(52 61 75 / 0.96), rgb(37 44 55 / 0.98))',
    lengthHandleColor: 'rgb(255 255 255 / 0.48)',
    marqueeBg: 'color-mix(in srgb, #d08a43 14%, transparent)',
  },
  track: {
    baseBg: 'linear-gradient(180deg, rgb(71 82 98 / 0.9), rgb(54 63 76 / 0.95))',
    centerLine: 'rgb(255 255 255 / 0.12)',
    barLine: 'rgb(255 255 255 / 0.18)',
    barLineStart: 'rgb(255 255 255 / 0.3)',
    barLineLabel: 'rgb(161 173 191 / 0.84)',
    barLineLabelShadow: '0 1px 0 rgb(0 0 0 / 0.42)',
    playheadColor: '#f09a4a',
    gridSubLine: 'rgb(255 255 255 / calc(var(--sub-opacity, 0.35) * 0.5))',
    gridBeatLine: 'rgb(255 255 255 / calc(var(--beat-opacity, 1) * 0.2))',
    defaultNoteColors: ['#D5763D', '#2E7D6E', '#4A78B0', '#B85C4C', '#7F8F4E', '#6E66A9'],
  },
}
