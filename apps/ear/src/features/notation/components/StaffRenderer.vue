<template>
  <div class="staff-frame" :class="feedbackClass">
    <div
      ref="staffScroll"
      class="staff-scroll"
      :class="{ 'with-persistent-scrollbar': showPersistentScrollbar }"
      @scroll="onStaffScroll"
    >
      <div ref="staffRoot" class="staff-renderer" :style="staffRendererStyle"></div>
      <div v-if="showNextZone" class="next-position-zone" :style="nextZoneStyle"></div>
    </div>
    <div
      v-if="showPersistentScrollbar"
      ref="persistentTrack"
      class="persistent-scrollbar"
      :class="{ 'is-disabled': !isScrollable }"
      @click="onPersistentTrackClick"
      @pointerdown="onPersistentPointerDown"
      @pointermove="onPersistentPointerMove"
      @pointerup="onPersistentPointerUp"
      @pointercancel="onPersistentPointerUp"
    >
      <div
        v-show="isScrollable"
        class="persistent-scrollbar-thumb"
        :style="persistentThumbStyle"
        @pointerdown.stop.prevent="onPersistentPointerDown"
      ></div>
    </div>
    <v-icon v-if="feedbackState === 'success'" class="feedback-icon success">mdi-check-circle</v-icon>
    <v-icon v-if="feedbackState === 'error'" class="feedback-icon error">mdi-close-circle</v-icon>
  </div>
</template>

<script>
import { Factory, Stem } from 'vexflow'

const CLEF_BOUNDS = {
  treble: { bottom: 30, top: 38 }, // E4..F5
  bass: { bottom: 18, top: 26 }    // G2..A3
}

const LAYOUT_CANDIDATES = [
  { clef: 'treble', clefOctave: '' },
  { clef: 'treble', clefOctave: '8vb' },
  { clef: 'treble', clefOctave: '8va' },
  { clef: 'bass', clefOctave: '' },
  { clef: 'bass', clefOctave: '8vb' },
  { clef: 'bass', clefOctave: '8va' }
]

export default {
  name: 'StaffRenderer',
  emits: ['slot-positions'],
  data() {
    return {
      renderWidth: 320,
      renderedSlotXs: [],
      lastAutoScrolledInsertIndex: -1,
      isScrollable: false,
      persistentThumbLeftPx: 0,
      persistentThumbWidthPx: 0,
      persistentDragActive: false
    }
  },
  props: {
    notes: {
      type: Array,
      default: () => []
    },
    clef: {
      type: String,
      default: 'treble'
    },
    mode: {
      type: String,
      default: 'melody' // melody | chord
    },
    clefOctave: {
      type: String,
      default: ''
    },
    octaveOffset: {
      type: Number,
      default: 1
    },
    optimizeLayout: {
      type: Boolean,
      default: true
    },
    comparisonNotes: {
      type: Array,
      default: () => []
    },
    chordGroups: {
      type: Array,
      default: () => []
    },
    chordGroupLabels: {
      type: Array,
      default: () => []
    },
    chordGroupStates: {
      type: Array,
      default: () => []
    },
    mismatchIndices: {
      type: Array,
      default: () => []
    },
    correctIndices: {
      type: Array,
      default: () => []
    },
    showPositionNumbers: {
      type: Boolean,
      default: false
    },
    positionNumberStates: {
      type: Array,
      default: () => []
    },
    positionNumberCount: {
      type: Number,
      default: 0
    },
    strikeMismatchNotes: {
      type: Boolean,
      default: false
    },
    showInsertMarker: {
      type: Boolean,
      default: false
    },
    autoFollowInsertMarker: {
      type: Boolean,
      default: false
    },
    showPersistentScrollbar: {
      type: Boolean,
      default: false
    },
    resetScrollToken: {
      type: Number,
      default: 0
    },
    insertIndex: {
      type: Number,
      default: -1
    },
    insertCount: {
      type: Number,
      default: 0
    },
    previewNote: {
      type: String,
      default: ''
    },
    feedbackState: {
      type: String,
      default: 'neutral'
    }
  },
  mounted() {
    this.renderStaff()
  },
  watch: {
    notes: {
      deep: true,
      handler() {
        this.renderStaff()
      }
    },
    clef() {
      this.renderStaff()
    },
    mode() {
      this.renderStaff()
    },
    clefOctave() {
      this.renderStaff()
    },
    octaveOffset() {
      this.renderStaff()
    },
    comparisonNotes: {
      deep: true,
      handler() {
        this.renderStaff()
      }
    },
    chordGroups: {
      deep: true,
      handler() {
        this.renderStaff()
      }
    },
    chordGroupLabels: {
      deep: true,
      handler() {
        this.renderStaff()
      }
    },
    chordGroupStates: {
      deep: true,
      handler() {
        this.renderStaff()
      }
    },
    mismatchIndices: {
      deep: true,
      handler() {
        this.renderStaff()
      }
    },
    resetScrollToken() {
      this.$nextTick(() => this.resetScrollToStart())
    },
    previewNote() {
      this.renderStaff()
    }
  },
  methods: {
    resetScrollToStart() {
      const sc = this.$refs.staffScroll
      if (!sc) return
      sc.scrollLeft = 0
      this.lastAutoScrolledInsertIndex = -1
      this.updatePersistentScrollbar()
    },
    drawMismatchStrikes(vf, noteObjects, mismatchIndices) {
      if (!this.strikeMismatchNotes) return
      if (!vf || !Array.isArray(noteObjects) || !Array.isArray(mismatchIndices)) return
      const ctx = vf.getContext()
      if (!ctx) return

      ctx.save()
      ctx.setStrokeStyle('rgba(0,0,0,0.95)')
      ctx.setLineWidth(2)
      for (const i of mismatchIndices) {
        const note = noteObjects[i]
        if (!note || typeof note.getYs !== 'function') continue
        const ys = note.getYs()
        if (!ys || !ys.length) continue
        const y = ys[0]
        const x1 = typeof note.getNoteHeadBeginX === 'function'
          ? note.getNoteHeadBeginX() - 1
          : (typeof note.getAbsoluteX === 'function' ? note.getAbsoluteX() + 2 : 0)
        const x2 = typeof note.getNoteHeadEndX === 'function'
          ? note.getNoteHeadEndX() + 1
          : x1 + 12
        if (!Number.isFinite(x1) || !Number.isFinite(x2) || !Number.isFinite(y)) continue
        ctx.beginPath()
        ctx.moveTo(x1, y + 5)
        ctx.lineTo(x2, y - 5)
        ctx.moveTo(x1, y - 5)
        ctx.lineTo(x2, y + 5)
        ctx.stroke()
      }
      ctx.restore()
    },
    drawCorrectChecks(vf, noteObjects, correctIndices) {
      if (!Array.isArray(noteObjects) || !Array.isArray(correctIndices)) return
      if (!correctIndices.length) return
      const ctx = vf?.getContext?.()
      if (!ctx) return

      ctx.save()
      ctx.setStrokeStyle('rgba(46,125,50,0.98)')
      ctx.setLineWidth(2)
      for (const i of correctIndices) {
        const note = noteObjects[i]
        if (!note || typeof note.getYs !== 'function') continue
        const ys = note.getYs()
        if (!ys || !ys.length) continue
        const y = ys[0]
        const xBase = typeof note.getNoteHeadEndX === 'function'
          ? note.getNoteHeadEndX() + 4
          : (typeof note.getAbsoluteX === 'function' ? note.getAbsoluteX() + 12 : 0)
        if (!Number.isFinite(xBase) || !Number.isFinite(y)) continue

        ctx.beginPath()
        ctx.moveTo(xBase, y + 1)
        ctx.lineTo(xBase + 3, y + 4)
        ctx.lineTo(xBase + 9, y - 4)
        ctx.stroke()
      }
      ctx.restore()
    },
    drawPositionNumbers(vf, noteObjects) {
      if (!this.showPositionNumbers) return
      if (!vf || !Array.isArray(noteObjects) || !noteObjects.length) return
      const ctx = vf.getContext()
      if (!ctx) return

      const count = this.positionNumberCount > 0
        ? Math.min(this.positionNumberCount, noteObjects.length)
        : noteObjects.length
      const y = 14
      ctx.save()
      ctx.setFont('600 12px Arial, sans-serif')
      for (let i = 0; i < count; i++) {
        const note = noteObjects[i]
        if (!note || typeof note.getAbsoluteX !== 'function') continue
        const x = note.getAbsoluteX() + 2
        if (!Number.isFinite(x)) continue
        const state = this.positionNumberStates[i]
        const color = state === 'correct'
          ? 'rgba(46,125,50,0.98)'
          : state === 'wrong'
            ? 'rgba(198,40,40,0.98)'
            : 'rgba(0,0,0,0.86)'
        ctx.setFillStyle(color)
        ctx.fillText(String(i + 1), x, y)
      }
      ctx.restore()
    },
    noteLabel(name) {
      if (!name) return ''
      const parsed = this.parseNote(String(name).replace(/s(?=\d$)/, '#'))
      if (!parsed) return String(name)

      const letter = parsed.octave <= 1
        ? parsed.letter.toUpperCase()
        : parsed.letter.toLowerCase()
      const suffix = parsed.octave <= 2 ? '' : String(parsed.octave - 2)
      return `${letter}${parsed.accidental}${suffix}`
    },
    noteLabelX(note) {
      if (!note) return null
      const begin = typeof note.getNoteHeadBeginX === 'function' ? note.getNoteHeadBeginX() : null
      const end = typeof note.getNoteHeadEndX === 'function' ? note.getNoteHeadEndX() : null
      if (Number.isFinite(begin) && Number.isFinite(end)) return (begin + end) / 2
      if (typeof note.getAbsoluteX === 'function') return note.getAbsoluteX() + 6
      return null
    },
    drawCenteredText(ctx, label, x, y) {
      const text = String(label)
      const width = text.length * 6
      ctx.fillText(text, x - (width / 2), y)
    },
    drawNoteLabels(vf, noteObjects, noteNames, options = {}) {
      if (!vf || !Array.isArray(noteObjects) || !Array.isArray(noteNames)) return
      const ctx = vf.getContext()
      if (!ctx) return

      const labels = noteNames.map((name) => this.noteLabel(name))
      const y = options.y || 122
      ctx.save()
      ctx.setFont('600 11px Arial, sans-serif')

      if (this.mode === 'chord') {
        const label = labels.filter(Boolean).join(' ')
        const x = this.noteLabelX(noteObjects[0])
        if (label && Number.isFinite(x)) {
          ctx.setFillStyle(options.color || 'rgba(0,0,0,0.78)')
          this.drawCenteredText(ctx, label, x, y)
        }
        ctx.restore()
        return
      }

      const mismatchSet = new Set(this.mismatchIndices || [])
      for (let i = 0; i < Math.min(noteObjects.length, labels.length); i++) {
        const label = labels[i]
        if (!label) continue
        const x = this.noteLabelX(noteObjects[i])
        if (!Number.isFinite(x)) continue
        const color = options.color || (mismatchSet.has(i) ? 'rgba(198,40,40,0.98)' : 'rgba(0,0,0,0.78)')
        ctx.setFillStyle(color)
        this.drawCenteredText(ctx, label, x, y)
      }
      ctx.restore()
    },
    drawChordGroupLabels(vf, noteObjects) {
      if (!vf || !Array.isArray(noteObjects) || !noteObjects.length) return
      if (!Array.isArray(this.chordGroupLabels) || !this.chordGroupLabels.length) return
      const ctx = vf.getContext()
      if (!ctx) return

      ctx.save()
      for (let i = 0; i < Math.min(noteObjects.length, this.chordGroupLabels.length); i++) {
        const label = this.chordGroupLabels[i]
        if (!label) continue
        const note = noteObjects[i]
        const x = this.noteLabelX(note)
        if (!Number.isFinite(x)) continue
        const state = this.chordGroupStates[i]
        const color = state === 'success'
          ? 'rgba(46,125,50,0.98)'
          : state === 'high'
            ? 'rgba(198,40,40,0.98)'
            : state === 'low'
              ? 'rgba(2,119,189,0.98)'
              : 'rgba(0,0,0,0.78)'
        ctx.setFillStyle(color)
        ctx.setFont(state === 'success' || state === 'high' || state === 'low'
          ? '800 20px Arial, sans-serif'
          : '700 12px Arial, sans-serif'
        )
        this.drawCenteredText(ctx, label, x, 122)
      }
      ctx.restore()
    },
    parseNote(noteName) {
      const match = /^([A-Ga-g])([#bxs]{1,2}|bb|##)?(\d)$/.exec(noteName || '')
      if (!match) return null
      return {
        letter: match[1].toLowerCase(),
        accidental: (match[2] || '').toLowerCase(),
        octave: Number(match[3])
      }
    },
    toVexflowToken(noteName, octaveOffsetOverride = this.renderedOctaveOffset) {
      const parsed = this.parseNote(noteName)
      if (!parsed) return null

      const letter = parsed.letter
      const rawAccidental = parsed.accidental
      const octave = Math.max(0, Math.min(8, parsed.octave + octaveOffsetOverride))

      let accidental = ''
      if (rawAccidental === '#' || rawAccidental === 's') accidental = '#'
      else if (rawAccidental === '##' || rawAccidental === 'ss' || rawAccidental === 'x') accidental = '##'
      else if (rawAccidental === 'b') accidental = 'b'
      else if (rawAccidental === 'bb') accidental = 'bb'

      return `${letter}${accidental}${String(octave)}`
    },
    diatonicIndex(letter, octave) {
      const map = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 }
      return octave * 7 + map[letter]
    },
    ledgerLinesForIndex(index, bounds) {
      if (index < bounds.bottom) return Math.floor((bounds.bottom - index) / 2)
      if (index > bounds.top) return Math.floor((index - bounds.top) / 2)
      return 0
    },
    octaveCompensation(clefOctave) {
      if (clefOctave === '8vb') return 1
      if (clefOctave === '8va') return -1
      return 0
    },
    evaluateLayout(layout) {
      const bounds = CLEF_BOUNDS[layout.clef]
      const comp = this.octaveCompensation(layout.clefOctave)
      let maxLedger = 0
      let sumLedger = 0
      const layoutNotes = this.mode === 'chord-sequence'
        ? this.chordGroups.flat()
        : this.notes

      for (const name of layoutNotes) {
        const parsed = this.parseNote(name)
        if (!parsed) continue
        const shownOctave = Math.max(0, Math.min(8, parsed.octave + this.octaveOffset + comp))
        const idx = this.diatonicIndex(parsed.letter, shownOctave)
        const ledgers = this.ledgerLinesForIndex(idx, bounds)
        maxLedger = Math.max(maxLedger, ledgers)
        sumLedger += ledgers
      }

      // Strongly enforce <= 3 ledger lines, then optimize readability.
      const overflowPenalty = Math.max(0, maxLedger - 3) * 100
      const octaveSignPenalty = layout.clefOctave ? 1 : 0
      return overflowPenalty + (maxLedger * 10) + sumLedger + octaveSignPenalty
    },
    chooseBestLayout() {
      let best = LAYOUT_CANDIDATES[0]
      let bestScore = Number.POSITIVE_INFINITY
      for (const candidate of LAYOUT_CANDIDATES) {
        const score = this.evaluateLayout(candidate)
        if (score < bestScore) {
          best = candidate
          bestScore = score
        }
      }
      return best
    },
    placeholderToken() {
      // Keep placeholders inside the stave to avoid visible ledger-line artifacts.
      return this.renderedClef === 'bass' ? 'd3' : 'b4'
    },
    buildMelodySpec(tokens, beats) {
      const spec = []
      const placeholderIndices = []
      const ghost = this.placeholderToken()
      for (let i = 0; i < beats; i++) {
        if (tokens[i]) {
          spec.push(`${tokens[i]}/q`)
        } else {
          // Keep horizontal spacing with an invisible ghost note.
          spec.push(`${ghost}/q`)
          placeholderIndices.push(i)
        }
      }
      return { spec: spec.join(', '), placeholderIndices }
    },
    buildAnchorSpec(beats) {
      const anchor = this.placeholderToken()
      return Array.from({ length: Math.max(1, beats) }, () => `${anchor}/q`).join(', ')
    },
    setStemDirection(noteObjects, direction) {
      for (const note of noteObjects || []) {
        if (note && typeof note.setStemDirection === 'function') {
          note.setStemDirection(direction)
        }
      }
    },
    updateRenderedSlotXs(noteObjects) {
      const xs = []
      for (const note of noteObjects || []) {
        if (note && typeof note.getAbsoluteX === 'function') {
          const x = note.getAbsoluteX()
          if (Number.isFinite(x)) xs.push(x)
        }
      }
      this.renderedSlotXs = xs
      this.$emit('slot-positions', xs)
    },
    onStaffScroll() {
      this.updatePersistentScrollbar()
    },
    updatePersistentScrollbar() {
      const sc = this.$refs.staffScroll
      const track = this.$refs.persistentTrack
      if (!sc) {
        this.isScrollable = false
        this.persistentThumbLeftPx = 0
        this.persistentThumbWidthPx = 0
        return
      }
      const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth)
      this.isScrollable = maxScroll > 1
      if (!this.isScrollable || !track) {
        this.persistentThumbLeftPx = 0
        this.persistentThumbWidthPx = 0
        return
      }
      const trackWidth = Math.max(1, track.clientWidth)
      const minThumb = 28
      const thumbWidth = Math.max(minThumb, (sc.clientWidth / sc.scrollWidth) * trackWidth)
      const travel = Math.max(0, trackWidth - thumbWidth)
      const left = maxScroll > 0 ? (sc.scrollLeft / maxScroll) * travel : 0
      this.persistentThumbWidthPx = thumbWidth
      this.persistentThumbLeftPx = left
    },
    onPersistentTrackClick(event) {
      if (this.persistentDragActive) return
      const sc = this.$refs.staffScroll
      const track = this.$refs.persistentTrack
      if (!sc || !track || !this.isScrollable) return
      const rect = track.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
      const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth)
      const ratio = rect.width > 0 ? x / rect.width : 0
      sc.scrollLeft = ratio * maxScroll
      this.updatePersistentScrollbar()
    },
    onPersistentPointerDown(event) {
      const sc = this.$refs.staffScroll
      const track = this.$refs.persistentTrack
      if (!sc || !track || !this.isScrollable) return
      this.persistentDragActive = true
      if (typeof track.setPointerCapture === 'function') {
        track.setPointerCapture(event.pointerId)
      }
      this.onPersistentPointerMove(event)
    },
    onPersistentPointerMove(event) {
      if (!this.persistentDragActive) return
      const sc = this.$refs.staffScroll
      const track = this.$refs.persistentTrack
      if (!sc || !track || !this.isScrollable) return
      const rect = track.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
      const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth)
      const ratio = rect.width > 0 ? x / rect.width : 0
      sc.scrollLeft = ratio * maxScroll
      this.updatePersistentScrollbar()
    },
    onPersistentPointerUp(event) {
      const track = this.$refs.persistentTrack
      if (track && typeof track.releasePointerCapture === 'function') {
        try {
          track.releasePointerCapture(event.pointerId)
        } catch (e) {
          // ignore
        }
      }
      this.persistentDragActive = false
    },
    resolveSlotX() {
      if (this.renderedSlotXs.length > 0) {
        const slots = Math.max(1, this.insertCount)
        const idx = Math.max(0, Math.min(slots - 1, this.insertIndex))
        return this.renderedSlotXs[Math.min(idx, this.renderedSlotXs.length - 1)]
      }
      const width = this.renderWidth || 320
      const leftPadding = 90
      const rightPadding = 22
      const slots = Math.max(1, this.insertCount)
      const usable = Math.max(20, width - leftPadding - rightPadding)
      const clampedIndex = Math.max(0, Math.min(slots - 1, this.insertIndex))
      return leftPadding + ((clampedIndex + 0.5) * usable) / slots
    },
    maybeAutoScrollToInsertMarker(scrollContainer) {
      if (!this.autoFollowInsertMarker || !this.showNextMarker) return
      if (!scrollContainer) return
      if (this.lastAutoScrolledInsertIndex === this.insertIndex) return
      this.lastAutoScrolledInsertIndex = this.insertIndex

      const x = this.resolveSlotX()
      const leftVisible = scrollContainer.scrollLeft
      const rightVisible = leftVisible + scrollContainer.clientWidth
      const margin = 40
      if (x < leftVisible + margin) {
        scrollContainer.scrollLeft = Math.max(0, x - margin)
        return
      }
      if (x > rightVisible - margin) {
        const maxScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth)
        scrollContainer.scrollLeft = Math.min(maxScroll, x - scrollContainer.clientWidth + margin)
      }
    },
    renderStaff() {
      const root = this.$refs.staffRoot
      if (!root) return
      const scrollContainer = root.parentElement
      const prevScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0
      root.innerHTML = ''
      this.renderedSlotXs = []

      const baseWidth = Math.max(300, root.parentElement?.clientWidth || root.clientWidth || 320)
      const chordGroupCount = this.mode === 'chord-sequence' ? this.chordGroups.length : 0
      const noteCountForWidth = Math.max(
        this.notes.length,
        chordGroupCount,
        this.comparisonNotes.length,
        this.insertCount
      )
      const chordSequenceWidth = chordGroupCount > 0 ? 120 + (chordGroupCount * 90) : baseWidth
      const extendedWidth = noteCountForWidth > 6 ? 100 + (noteCountForWidth * 52) : baseWidth
      const preferredWidth = this.mode === 'chord-sequence'
        ? Math.max(extendedWidth, chordSequenceWidth)
        : extendedWidth
      const width = Math.max(baseWidth, preferredWidth)
      this.renderWidth = width
      const vf = new Factory({
        renderer: { elementId: root, width, height: 145 }
      })
      const score = vf.EasyScore()
      const system = vf.System({ x: 10, y: 15, width: width - 20 })

      const parsed = this.notes.map((n) => this.toVexflowToken(n, this.renderedOctaveOffset))
      const parsedComparison = this.comparisonNotes.map((n) => this.toVexflowToken(n, this.renderedOctaveOffset))
      const parsedChordGroups = this.chordGroups.map((group) => (
        Array.isArray(group)
          ? group.map((n) => this.toVexflowToken(n, this.renderedOctaveOffset)).filter(Boolean)
          : []
      )).filter((group) => group.length)
      const parsedPreview = this.mode === 'melody'
        ? this.toVexflowToken(this.previewNote, this.renderedOctaveOffset)
        : null

      if (!parsed.length && !parsedPreview && !parsedComparison.length && !parsedChordGroups.length) {
        const stave = system.addStave({ voices: [] })
        if (this.renderedClefOctave) stave.addClef(this.renderedClef, undefined, this.renderedClefOctave)
        else stave.addClef(this.renderedClef)
        vf.draw()
        if (scrollContainer) scrollContainer.scrollLeft = prevScrollLeft
        return
      }

      if (this.mode === 'chord-sequence' && parsedChordGroups.length) {
        const spec = parsedChordGroups.map((group) => `(${group.join(' ')})/q`).join(', ')
        const beats = parsedChordGroups.length
        const notes = score.notes(spec, { clef: this.renderedClef })
        const voice = score.voice(notes, { time: `${beats}/4` })
        voice.setStrict(false)
        const stave = system.addStave({ voices: [voice] })
        if (this.renderedClefOctave) stave.addClef(this.renderedClef, undefined, this.renderedClefOctave)
        else stave.addClef(this.renderedClef)
        vf.draw()
        this.drawChordGroupLabels(vf, notes)
        this.updateRenderedSlotXs(notes)
        if (scrollContainer) scrollContainer.scrollLeft = prevScrollLeft
        this.$nextTick(() => this.updatePersistentScrollbar())
        return
      }

      if (this.mode === 'melody' && parsedComparison.length) {
        const beats = Math.max(parsed.length, parsedComparison.length)
        const mainSpec = this.buildMelodySpec(parsed, beats)
        const comparisonSpec = this.buildMelodySpec(parsedComparison, beats)
        const anchorNotes = score.notes(this.buildAnchorSpec(beats), { clef: this.renderedClef })
        const anchorVoice = score.voice(anchorNotes, { time: `${beats}/4` })
        const mainNotes = score.notes(mainSpec.spec, { clef: this.renderedClef })
        const comparisonVoice = score.voice(
          score.notes(comparisonSpec.spec, { clef: this.renderedClef }),
          { time: `${beats}/4` }
        )
        const mainVoice = score.voice(mainNotes, { time: `${beats}/4` })
        anchorVoice.setStrict(false)
        comparisonVoice.setStrict(false)
        mainVoice.setStrict(false)
        this.setStemDirection(mainNotes, Stem.UP)
        for (const note of anchorNotes) {
          note.setStyle({
            fillStyle: 'rgba(0,0,0,0)',
            strokeStyle: 'rgba(0,0,0,0)'
          })
        }

        for (const i of this.mismatchIndices) {
          if (mainNotes[i] && parsed[i]) {
            mainNotes[i].setStyle({
              fillStyle: 'rgba(198,40,40,1)',
              strokeStyle: 'rgba(198,40,40,1)'
            })
          }
        }
        for (const i of comparisonSpec.placeholderIndices) {
          if (comparisonVoice.getTickables()[i]) {
            comparisonVoice.getTickables()[i].setStyle({
              fillStyle: 'rgba(0,0,0,0)',
              strokeStyle: 'rgba(0,0,0,0)'
            })
          }
        }
        for (const i of mainSpec.placeholderIndices) {
          if (mainNotes[i]) {
            mainNotes[i].setStyle({
              fillStyle: 'rgba(0,0,0,0)',
              strokeStyle: 'rgba(0,0,0,0)'
            })
          }
        }

        const stave = system.addStave({ voices: [anchorVoice, comparisonVoice, mainVoice] })
        if (this.renderedClefOctave) stave.addClef(this.renderedClef, undefined, this.renderedClefOctave)
        else stave.addClef(this.renderedClef)
        vf.draw()
        this.drawMismatchStrikes(vf, mainNotes, this.mismatchIndices)
        this.drawCorrectChecks(vf, mainNotes, this.correctIndices)
        this.drawPositionNumbers(vf, anchorNotes)
        this.drawNoteLabels(vf, mainNotes, this.notes)
        this.drawNoteLabels(vf, comparisonVoice.getTickables(), this.comparisonNotes, {
          color: 'rgba(198,40,40,0.98)'
        })
        this.updateRenderedSlotXs(anchorNotes)
        if (scrollContainer) scrollContainer.scrollLeft = prevScrollLeft
        this.maybeAutoScrollToInsertMarker(scrollContainer)
        this.$nextTick(() => this.updatePersistentScrollbar())
        return
      }

      const melodyTokens = parsed.slice()
      let previewIndex = -1
      if (this.mode === 'melody' && parsedPreview) {
        previewIndex = Math.max(0, Math.min(
          Math.max(0, (this.insertCount || melodyTokens.length || 1) - 1),
          this.insertIndex >= 0 ? this.insertIndex : melodyTokens.length
        ))
        melodyTokens[previewIndex] = parsedPreview
      }
      const melodyBeats = Math.max(melodyTokens.length, this.insertCount || 0)
      const notesSpec = this.mode === 'chord'
        ? `(${parsed.filter(Boolean).join(' ')})/q`
        : this.buildMelodySpec(melodyTokens, melodyBeats)

      const beats = this.mode === 'chord' ? 1 : melodyBeats
      const notes = score.notes(this.mode === 'chord' ? notesSpec : notesSpec.spec, { clef: this.renderedClef })
      if (this.mode === 'melody') {
        for (const i of this.mismatchIndices || []) {
          if (notes[i] && parsed[i]) {
            notes[i].setStyle({
              fillStyle: 'rgba(198,40,40,1)',
              strokeStyle: 'rgba(198,40,40,1)'
            })
          }
        }
        for (const i of notesSpec.placeholderIndices || []) {
          if (notes[i]) {
            notes[i].setStyle({
              fillStyle: 'rgba(0,0,0,0)',
              strokeStyle: 'rgba(0,0,0,0)'
            })
          }
        }
      }
      if (this.mode === 'melody' && parsedPreview && notes.length > 0 && previewIndex >= 0) {
        notes[previewIndex].setStyle({
          fillStyle: 'rgba(0,0,0,0.5)',
          strokeStyle: 'rgba(0,0,0,0.5)'
        })
      }
      const voice = score.voice(
        notes,
        { time: `${beats}/4` }
      )
      const anchorNotes = this.mode === 'melody'
        ? score.notes(this.buildAnchorSpec(beats), { clef: this.renderedClef })
        : []
      const anchorVoice = this.mode === 'melody'
        ? score.voice(anchorNotes, { time: `${beats}/4` })
        : null
      if (anchorVoice) {
        anchorVoice.setStrict(false)
        for (const note of anchorNotes) {
          note.setStyle({
            fillStyle: 'rgba(0,0,0,0)',
            strokeStyle: 'rgba(0,0,0,0)'
          })
        }
      }
      voice.setStrict(false)
      const staveVoices = anchorVoice ? [anchorVoice, voice] : [voice]
      const stave = system.addStave({ voices: staveVoices })
      if (this.renderedClefOctave) stave.addClef(this.renderedClef, undefined, this.renderedClefOctave)
      else stave.addClef(this.renderedClef)
      vf.draw()
      this.drawMismatchStrikes(vf, notes, this.mismatchIndices)
      this.drawCorrectChecks(vf, notes, this.correctIndices)
      this.drawPositionNumbers(vf, anchorVoice ? anchorNotes : notes)
      this.drawNoteLabels(vf, notes, this.notes)
      this.updateRenderedSlotXs(anchorVoice ? anchorNotes : notes)
      if (scrollContainer) scrollContainer.scrollLeft = prevScrollLeft
      this.maybeAutoScrollToInsertMarker(scrollContainer)
      this.$nextTick(() => this.updatePersistentScrollbar())
    }
  },
  computed: {
    staffRendererStyle() {
      return { width: `${Math.round(this.renderWidth)}px` }
    },
    showNextMarker() {
      if (!this.showInsertMarker) return false
      if (this.insertIndex < 0 || this.insertCount <= 0) return false
      return this.insertIndex < this.insertCount
    },
    showNextZone() {
      return this.showNextMarker
    },
    nextSlotX() {
      return Math.round(this.resolveSlotX())
    },
    nextMarkerStyle() {
      return {
        left: `${this.nextSlotX}px`,
        transform: 'translateX(-50%)'
      }
    },
    nextZoneStyle() {
      let slotWidth = this.insertCount > 0
        ? Math.max(28, (this.renderWidth - 112) / this.insertCount)
        : 36
      if (this.renderedSlotXs.length >= 2) {
        const idx = Math.max(1, Math.min(this.renderedSlotXs.length - 1, this.insertIndex))
        slotWidth = Math.max(28, Math.abs(this.renderedSlotXs[idx] - this.renderedSlotXs[idx - 1]) * 0.85)
      }
      return {
        left: `${this.nextSlotX}px`,
        width: `${Math.round(slotWidth)}px`,
        transform: 'translateX(-50%)'
      }
    },
    resolvedLayout() {
      if (!this.optimizeLayout) return { clef: this.clef, clefOctave: this.clefOctave }
      return this.chooseBestLayout()
    },
    renderedClef() {
      return this.resolvedLayout.clef
    },
    renderedClefOctave() {
      return this.resolvedLayout.clefOctave
    },
    renderedOctaveOffset() {
      if (this.renderedClefOctave === '8vb') return this.octaveOffset + 1
      if (this.renderedClefOctave === '8va') return this.octaveOffset - 1
      return this.octaveOffset
    },
    feedbackClass() {
      if (this.feedbackState === 'success') return 'is-success'
      if (this.feedbackState === 'error') return 'is-error'
      return 'is-neutral'
    },
    persistentThumbStyle() {
      return {
        width: `${Math.round(this.persistentThumbWidthPx)}px`,
        transform: `translateX(${Math.round(this.persistentThumbLeftPx)}px)`
      }
    }
  }
}
</script>

<style scoped>
.staff-frame {
  position: relative;
  width: 100%;
  border-radius: 8px;
  padding: 4px 4px 0;
  transition: background-color 120ms ease;
}

.staff-renderer {
  min-width: 100%;
  min-height: 138px;
}

.staff-scroll {
  position: relative;
  width: 100%;
  overflow-x: scroll;
  overflow-y: hidden;
  scrollbar-gutter: stable both-edges;
  padding-bottom: 4px;
}

.staff-scroll::-webkit-scrollbar {
  height: 10px;
}

.staff-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.staff-scroll::-webkit-scrollbar-thumb {
  background: rgba(33, 150, 243, 0.72);
  border-radius: 999px;
}

.staff-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 150, 243, 0.9);
}

.staff-scroll.with-persistent-scrollbar {
  scrollbar-width: none;
}

.staff-scroll.with-persistent-scrollbar::-webkit-scrollbar {
  display: none;
}

.persistent-scrollbar {
  height: 20px;
  margin-top: 18px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.14);
  position: relative;
  z-index: 5;
  cursor: pointer;
  touch-action: pan-x;
  transition: opacity 120ms ease;
}

.persistent-scrollbar-thumb {
  position: absolute;
  left: 0;
  top: 3px;
  height: 14px;
  border-radius: 999px;
  background: rgba(33, 150, 243, 0.88);
}

.persistent-scrollbar.is-disabled {
  opacity: 0.25;
  pointer-events: none;
}

.next-position-zone {
  position: absolute;
  top: 18px;
  height: 84px;
  border-radius: 8px;
  background: rgba(33, 150, 243, 0.16);
  pointer-events: none;
}

.staff-frame.is-success {
  background: rgba(46, 125, 50, 0.24);
}

.staff-frame.is-error {
  background: rgba(198, 40, 40, 0.24);
}

.staff-frame.is-neutral {
  background: transparent;
}

.feedback-icon {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 20px;
  line-height: 20px;
}

.feedback-icon.success {
  color: #2e7d32;
}

.feedback-icon.error {
  color: #c62828;
}

</style>
