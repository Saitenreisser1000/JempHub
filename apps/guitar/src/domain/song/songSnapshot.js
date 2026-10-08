export function buildSongSnapshot({
  name,
  instrument,
  transport,
  timelineSettings,
  notes,
  handPositions,
  fretboardOverlay,
} = {}) {
  return {
    version: 1,
    meta: {
      name: String(name ?? '').trim(),
    },
    instrument: {
      instrumentType: instrument?.instrumentType,
      tuningId: instrument?.tuningId,
      numStrings: instrument?.numStrings,
    },
    transport: {
      tempo: transport?.tempo,
    },
    timelineSettings: {
      selectedMode: timelineSettings?.selectedMode,
      lastRhythmMode: timelineSettings?.lastRhythmMode,
      snapEnabled: timelineSettings?.snapEnabled,
      soundPreviewEnabled: timelineSettings?.soundPreviewEnabled,
      clickEnabled: timelineSettings?.clickEnabled,
      countInEnabled: timelineSettings?.countInEnabled,
      loopEnabled: timelineSettings?.loopEnabled,
      loopStartBlock: timelineSettings?.loopStartBlock,
      loopEndBlock: timelineSettings?.loopEndBlock,
      beatTop: timelineSettings?.beatTop,
      beatBottom: timelineSettings?.beatBottom,
      pickupEnabled: timelineSettings?.pickupEnabled,
      pickupBeats: timelineSettings?.pickupBeats,
      zoomPxPerBlock: timelineSettings?.zoomPxPerBlock,
      timelineLengthBlocks: timelineSettings?.timelineLengthBlocks,
      selectedColor: timelineSettings?.selectedColor,
    },
    notes: notes?.activeNotes ?? [],
    handPositions: handPositions?.handPositions ?? [],
    fretboardOverlay: {
      textItems: fretboardOverlay?.textItems ?? [],
    },
  }
}
