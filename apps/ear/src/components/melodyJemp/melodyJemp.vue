<template>
    <exercise-card :disabled="lockInput">
            <template #intro>
                {{ $t('nav.melody') }}
            </template>
            <template #controls>
            <div class="choose-header">
                <v-menu location="bottom start" :close-on-content-click="false">
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            variant="text"
                            size="small"
                            color="primary"
                            prepend-icon="mdi-tune-variant"
                        >
                            {{ $t('app.level') }}
                        </v-btn>
                    </template>
                    <v-card min-width="220" class="pa-2">
                        <div class="menu-label">{{ $t('common.difficulty') }}</div>
                        <v-btn-toggle
                            v-model="difficulty"
                            class="text-white difficulty-toggle"
                            density="compact"
                            active-class="primary"
                            background-color="secondary"
                            mandatory
                        >
                            <v-btn value="easy" size="small">{{ $t('common.easy') }}</v-btn>
                            <v-btn value="advanced" size="small">{{ $t('common.advanced') }}</v-btn>
                            <v-btn value="expert" size="small">{{ $t('common.expert') }}</v-btn>
                        </v-btn-toggle>
                    </v-card>
                </v-menu>
                <v-menu location="bottom end" :close-on-content-click="false">
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            variant="text"
                            size="small"
                            color="primary"
                            prepend-icon="mdi-cog"
                        >
                            {{ $t('common.options') }}
                        </v-btn>
                    </template>
                <v-card min-width="220" class="pa-2">
                    <v-switch
                        v-model="autoplay"
                        :label="$t('common.autoplay')"
                        class="my-0"
                        density="compact"
                        hide-details
                    />
                    <v-switch
                        v-model="showFirstToneHint"
                        :label="$t('common.showFirstNote')"
                        class="my-0"
                        density="compact"
                        hide-details
                    />
                    <v-select
                        v-model="bpm"
                        :items="bpmOptions"
                        item-title="label"
                        item-value="value"
                        label="BPM"
                        density="compact"
                        hide-details
                        class="mt-1"
                    />
                    <v-select
                        v-model="resultDisplayMs"
                        :items="resultDisplayOptions"
                        item-title="label"
                        item-value="value"
                        :label="$t('common.resultDisplay')"
                        density="compact"
                        hide-details
                        class="mt-1"
                    />
                </v-card>
            </v-menu>
        </div>
        <v-select
            v-model="melodyLength"
            :items="lengthOptions"
            item-title="label"
            item-value="value"
            :label="$t('common.selectMelodyLength')"
            hide-details
            class="melody-length-select flex-grow-0 mt-2"
        />
        </template>

            <template #staff>
            <div class="between-slot">
                <div class="staff-input-wrap">
                    <staff-renderer
                        :notes="notationNotes"
                        :comparison-notes="showCheckOverlay ? mismatchSolutionNotes : []"
                        :mismatch-indices="showCheckOverlay ? mismatchIndices : []"
                        :correct-indices="showCheckOverlay ? correctIndices : []"
                        :show-position-numbers="true"
                        :position-number-states="showCheckOverlay ? resultNumberStates : []"
                        :position-number-count="melodyLength"
                        :strike-mismatch-notes="true"
                        :auto-follow-insert-marker="true"
                        :show-persistent-scrollbar="true"
                        :reset-scroll-token="scrollResetToken"
                        :clef="notationClef"
                        :feedback-state="notationFeedbackState"
                        :octave-offset="notationOctaveOffset"
                        :optimize-layout="false"
                        :preview-note="hoverNote"
                        :show-insert-marker="targetMelody.length > 0"
                        :insert-index="activeDisplayIndex"
                        :insert-count="melodyLength"
                        @slot-positions="handleSlotPositions"
                    />
                    <div
                        class="staff-input-overlay"
                        @click="handleStaffClick"
                        @mousemove="handleStaffHover"
                        @mouseleave="clearStaffHover"
                        @touchstart.prevent="handleStaffTouchStart"
                        @touchmove.prevent="handleStaffTouchMove"
                        @touchend.prevent="handleStaffTouchEnd"
                        @touchcancel.prevent="handleStaffTouchCancel"
                    ></div>
                    <div
                        v-if="hoverNote"
                        class="hover-note"
                        :style="{ left: `${hoverLeft}px`, top: `${hoverTop}px` }"
                    >
                        {{ formatDisplayNoteName(hoverNote) }}
                    </div>
                    <div
                        v-if="loupeVisible"
                        class="note-loupe"
                        :style="{ left: `${loupeLeft}px`, top: `${loupeTop}px` }"
                    >
                        <div class="loupe-staff">
                            <span
                                v-for="n in 5"
                                :key="`loupe-line-${n}`"
                                class="loupe-line"
                            ></span>
                            <span
                                v-for="(y, idx) in loupeLedgerTops"
                                :key="`loupe-ledger-${idx}`"
                                class="loupe-ledger"
                                :style="{ top: `${y}px` }"
                            ></span>
                            <span class="loupe-note" :style="{ top: `${loupeNoteTop}px` }"></span>
                        </div>
                        <div class="loupe-label">{{ formatDisplayNoteName(loupeNote) }}</div>
                    </div>
                </div>
            </div>
            </template>
            <template #transport>
            <div class="mb-2 mt-2 transport-grid">
                <v-btn color="success" height="52" class="depth-btn" @click="playAgain">
                    <v-icon v-if="targetMelody.length" size="24">mdi-replay</v-icon>
                    <span v-else>{{ $t('common.start') }}</span>
                </v-btn>
                <v-btn class="button depth-btn" color="primary" height="52" @click="checkAnswer">
                    <span>{{ $t('common.check') }}</span>
                </v-btn>
            </div>
            </template>

            <template #answers>
            <div class="mb-2">
                <v-btn class="mr-2" variant="tonal" size="small" @click="undoInput">{{ $t('common.undo') }}</v-btn>
                <v-btn class="mr-2" variant="tonal" size="small" @click="clearInput">{{ $t('common.clear') }}</v-btn>
                <v-btn color="error" size="small" :disabled="!targetMelody.length" @click="playRandomMelody">
                    <v-icon size="20">mdi-skip-next</v-icon>
                </v-btn>
            </div>
            </template>
    </exercise-card>
</template>

<script>
import { mapGetters } from 'vuex'
import ExerciseCard from "@/components/common/ExerciseCard";
import toneCalcService from "@/components/mixins/toneCalcService";
import playSounds from "@/components/mixins/playSounds";
import responseMixin from "@/components/mixins/responseMixin";
import StaffRenderer from "@/features/notation/components/StaffRenderer";
import { BPM_OPTIONS, MELODY_LENGTH_OPTIONS } from "@/domain/music/definitions";
import { matchesTonePool } from "@/domain/music/difficulty";

export default {
    name: "melodyJemp",
    components: { ExerciseCard, StaffRenderer },
    mixins: [toneCalcService, playSounds, responseMixin],
    data() {
        return {
            lockInput: false,
            autoplay: true,
            melodyLength: 5,
            bpm: 80,
            resultDisplayMs: 1500,
            resultDisplayOptions: [
                { label: '0.5s', value: 500 },
                { label: '1.0s', value: 1000 },
                { label: '1.5s', value: 1500 },
                { label: '2.0s', value: 2000 },
                { label: '3.0s', value: 3000 }
            ],
            difficulty: 'easy',
            targetMelody: [],
            userMelody: [],
            resColor: '#9DA0A9',
            firstTone: '',
            showFirstToneHint: true,
            hoverNote: '',
            hoverLeft: 0,
            hoverTop: 0,
            showCheckOverlay: false,
            suppressClickUntil: 0,
            lastTapAt: 0,
            touchState: null,
            activeDisplayIndex: 0,
            staffSlotXs: [],
            loupeVisible: false,
            loupeNote: '',
            loupeLeft: 0,
            loupeTop: 0,
            loupeNoteTop: 24,
            scrollResetToken: 0
        }
    },
    computed: {
        ...mapGetters(['getToneChain']),
        lengthOptions() {
            return MELODY_LENGTH_OPTIONS
        },
        bpmOptions() {
            return BPM_OPTIONS
        },
        notePalette() {
            return this.getToneChain.filter((tone) => tone.id < 63 && matchesTonePool(tone, this.difficulty))
        },
        notationNotes() {
            return this.enteredMelodyNotes
        },
        targetMelodyNames() {
            return this.targetMelody.map((t) => t.name)
        },
        enteredMelodyNotes() {
            if (this.showFirstToneHint && this.targetMelody.length > 0) {
                return [this.targetMelody[0].name, ...this.userMelody].slice(0, this.melodyLength)
            }
            return this.userMelody.slice(0, this.melodyLength)
        },
        notationClef() {
            if (!this.notationNotes.length) return 'treble'
            const maxOctave = Math.max(...this.notationNotes.map((n) => Number((/(\d)$/.exec(n) || [])[1] || 4) + this.notationOctaveOffset))
            return maxOctave <= 3 ? 'bass' : 'treble'
        },
        notationOctaveOffset() {
            return 1
        },
        notationFeedbackState() {
            if (this.resColor === 'green') return 'success'
            if (this.resColor === 'indianred') return 'error'
            return 'neutral'
        },
        maxInputLength() {
            return this.showFirstToneHint ? Math.max(0, this.melodyLength - 1) : this.melodyLength
        },
        mismatchIndices() {
            const target = this.targetMelodyNames
            const entered = this.enteredMelodyNotes
            const length = Math.max(target.length, entered.length)
            const mismatches = []
            for (let i = 0; i < length; i++) {
                if (target[i] !== entered[i]) mismatches.push(i)
            }
            return mismatches
        },
        correctIndices() {
            const target = this.targetMelodyNames
            const entered = this.enteredMelodyNotes
            const length = Math.min(target.length, entered.length)
            const correct = []
            for (let i = 0; i < length; i++) {
                if (target[i] === entered[i]) correct.push(i)
            }
            return correct
        },
        mismatchSolutionNotes() {
            const target = this.targetMelodyNames
            const entered = this.enteredMelodyNotes
            const length = Math.max(target.length, entered.length)
            const notes = []
            for (let i = 0; i < length; i++) {
                notes.push(target[i] !== entered[i] ? target[i] : null)
            }
            return notes
        },
        resultNumberStates() {
            const target = this.targetMelodyNames
            const entered = this.enteredMelodyNotes
            const states = []
            for (let i = 0; i < this.melodyLength; i++) {
                states.push(target[i] === entered[i] ? 'correct' : 'wrong')
            }
            return states
        },
        toneIdByName() {
            const map = {}
            for (const tone of this.getToneChain) map[tone.name] = tone.toneID
            return map
        },
        loupeLedgerTops() {
            const tops = []
            const topLine = 8
            const bottomLine = 40
            const step = 8 // one staff line distance in loupe
            const y = this.loupeNoteTop

            if (y < topLine) {
                for (let lineY = 0; lineY >= y - 0.1; lineY -= step) tops.push(lineY)
            } else if (y > bottomLine) {
                for (let lineY = bottomLine + step; lineY <= y + 0.1; lineY += step) tops.push(lineY)
            }
            return tops
        }
    },
    methods: {
        isMobileInputMode() {
            if (typeof window === 'undefined') return false
            return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900
        },
        triggerHaptic() {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(10)
            }
        },
        showLoupe(noteName, picked) {
            if (!picked) return
            this.loupeNote = noteName
            this.loupeLeft = picked.xInWrap
            // Keep enough vertical distance so higher expert-range notes stay inside the loupe.
            this.loupeTop = Math.max(-28, picked.snappedYInWrap - 170)
            this.loupeNoteTop = this.loupeNoteTopFor(noteName)
            this.loupeVisible = true
        },
        loupeNoteTopFor(noteName) {
            const clef = this.notationClef
            const bottomIndex = clef === 'bass' ? 18 : 30 // same base as staff renderer
            const idx = this.diatonicIndex(noteName, this.notationOctaveOffset)
            const bottomY = 40 // bottom staff line in loupe
            const stepPx = 4    // one diatonic step in loupe
            const y = bottomY - ((idx - bottomIndex) * stepPx)
            return Math.max(-8, Math.min(52, y))
        },
        formatDisplayNoteName(noteName) {
            const match = /^([A-Ga-g])([^0-9]*)(\d)$/.exec(noteName || '')
            if (!match) return noteName || ''

            const letter = match[1]
            const accidental = match[2] || ''
            const internalOctave = Number(match[3])
            const displayOctave = internalOctave - 2

            if (displayOctave <= 0) {
                return `${letter.toLowerCase()}${accidental.toLowerCase()}`
            }
            return `${letter.toUpperCase()}${accidental}${displayOctave}`
        },
        handleSlotPositions(xs) {
            this.staffSlotXs = Array.isArray(xs) ? xs : []
        },
        nextFreeDisplayIndex() {
            const minDisplay = this.showFirstToneHint ? 1 : 0
            for (let i = 0; i < this.maxInputLength; i++) {
                if (!this.userMelody[i]) return minDisplay + i
            }
            return this.melodyLength
        },
        displayIndexToUserIndex(displayIndex) {
            const minDisplay = this.showFirstToneHint ? 1 : 0
            return displayIndex - minDisplay
        },
        restoreInsertMarker() {
            this.activeDisplayIndex = this.nextFreeDisplayIndex()
        },
        playAgain() {
            if (!this.targetMelody.length) {
                this.playRandomMelody()
                return
            }
            this.playTones()
        },
        playRandomMelody() {
            this.clearInput()
            this.resetResponse()
            this.showCheckOverlay = false

            const pool = this.notePalette
            if (!pool.length) return

            this.targetMelody = []
            for (let i = 0; i < this.melodyLength; i++) {
                const idx = this.randomRangeInt({ min: 0, max: pool.length })
                this.targetMelody.push(pool[idx])
            }
            this.userMelody = Array(this.maxInputLength).fill(null)
            this.restoreInsertMarker()
            this.scrollResetToken += 1
            this.playTones()
        },
        playTones() {
            if (!this.targetMelody.length) return
            this.setInputlock(true)
            this.firstTone = this.targetMelody[0]
            let start = 200
            const delay = Math.round(60000 / this.bpm)
            for (const tone of this.targetMelody) {
                this.setExactTimeout(() => {
                    this.playAudio(tone.tone)
                }, start, 20)
                start += delay
            }
            this.setExactTimeout(() => { this.setInputlock(false) }, start + 100, 20)
        },
        addInputNote(noteName, displayIndex = this.activeDisplayIndex) {
            const minDisplay = this.showFirstToneHint ? 1 : 0
            const clampedDisplay = Math.max(minDisplay, Math.min(this.melodyLength - 1, displayIndex))
            const userIndex = this.displayIndexToUserIndex(clampedDisplay)
            if (userIndex < 0 || userIndex >= this.maxInputLength) return
            this.showCheckOverlay = false
            this.userMelody.splice(userIndex, 1, noteName)
            this.restoreInsertMarker()
            this.triggerHaptic()
        },
        handleStaffClick(event) {
            if (!this.targetMelody.length) return
            if (Date.now() < this.suppressClickUntil) return
            const picked = this.pickNoteFromPointerEvent(event)
            if (!picked || !picked.noteName) return
            this.activeDisplayIndex = picked.slotIndex
            this.addInputNote(picked.noteName, picked.slotIndex)
        },
        handleStaffTouchStart(event) {
            if (!this.targetMelody.length) return
            const touch = event.changedTouches?.[0]
            if (!touch) return
            const picked = this.pickNoteFromPointerEvent({
                currentTarget: event.currentTarget,
                clientX: touch.clientX,
                clientY: touch.clientY
            })
            this.touchState = {
                startedAt: Date.now(),
                startX: touch.clientX,
                startY: touch.clientY,
                slotIndex: picked?.slotIndex ?? this.activeDisplayIndex
            }
            if (picked && Number.isFinite(picked.slotIndex)) {
                const minDisplay = this.showFirstToneHint ? 1 : 0
                this.activeDisplayIndex = Math.max(minDisplay, Math.min(this.melodyLength - 1, picked.slotIndex))
            }
            if (picked?.noteName) {
                this.hoverNote = picked.noteName
                this.hoverLeft = picked.xInWrap + 10
                this.hoverTop = Math.max(0, picked.snappedYInWrap - 22)
                this.showLoupe(picked.noteName, picked)
            }
        },
        handleStaffTouchMove(event) {
            const touch = event.changedTouches?.[0]
            if (!touch || !this.touchState) return
            const picked = this.pickNoteFromPointerEvent({
                currentTarget: event.currentTarget,
                clientX: touch.clientX,
                clientY: touch.clientY
            })
            if (picked?.noteName) {
                this.hoverNote = picked.noteName
                this.hoverLeft = picked.xInWrap + 10
                this.hoverTop = Math.max(0, picked.snappedYInWrap - 22)
                this.showLoupe(picked.noteName, picked)
            }
        },
        handleStaffTouchEnd(event) {
            const touch = event.changedTouches?.[0]
            if (!touch || !this.touchState) return
            this.suppressClickUntil = Date.now() + 400

            const elapsed = Date.now() - this.touchState.startedAt
            const dx = touch.clientX - this.touchState.startX
            const dy = touch.clientY - this.touchState.startY
            const absDx = Math.abs(dx)
            const absDy = Math.abs(dy)
            const distance = Math.hypot(dx, dy)
            const isLongPress = elapsed >= 220

            if (absDy >= 24 && absDy > Math.abs(dx)) {
                const step = Math.round((-dy) / 24)
                this.adjustInputAt(step, this.touchState.slotIndex)
                this.touchState = null
                this.clearStaffHover()
                this.restoreInsertMarker()
                return
            }

            // Horizontal drags on the staff are treated as navigation gestures, not note input.
            if (!isLongPress && absDx >= 12 && absDx > absDy) {
                this.touchState = null
                this.clearStaffHover()
                this.restoreInsertMarker()
                return
            }

            const isDoubleTap = !isLongPress && (Date.now() - this.lastTapAt < 320)
            this.lastTapAt = Date.now()
            if (isDoubleTap) {
                this.toggleAccidentalAt(this.touchState.slotIndex)
                this.touchState = null
                this.clearStaffHover()
                this.restoreInsertMarker()
                return
            }

            // Prevent accidental sets after larger pointer movement.
            const maxTapDistance = isLongPress ? 26 : 10
            if (distance > maxTapDistance) {
                this.touchState = null
                this.clearStaffHover()
                this.restoreInsertMarker()
                return
            }

            const picked = this.pickNoteFromPointerEvent({
                currentTarget: event.currentTarget,
                clientX: touch.clientX,
                clientY: touch.clientY
            })
            if (picked?.noteName) {
                this.activeDisplayIndex = picked.slotIndex
                this.addInputNote(picked.noteName, picked.slotIndex)
            }
            this.touchState = null
            this.clearStaffHover()
            this.restoreInsertMarker()
        },
        handleStaffTouchCancel() {
            this.touchState = null
            this.clearStaffHover()
            this.restoreInsertMarker()
        },
        adjustInputAt(step, displayIndex) {
            if (!Number.isFinite(step) || step === 0 || !this.maxInputLength) return
            const minDisplay = this.showFirstToneHint ? 1 : 0
            const targetDisplay = Math.max(minDisplay, Math.min(this.melodyLength - 1, displayIndex))
            const userIndex = this.displayIndexToUserIndex(targetDisplay)
            const current = this.userMelody[userIndex]
            if (!current) return
            // Sort by pitch for deterministic stepping.
            const pitchSorted = [...new Set(this.notePalette.map((tone) => tone.name))]
                .sort((a, b) => (this.toneIdByName[a] || 0) - (this.toneIdByName[b] || 0))
            const index = pitchSorted.indexOf(current)
            if (index < 0) return
            const nextIndex = Math.max(0, Math.min(pitchSorted.length - 1, index + step))
            this.userMelody.splice(userIndex, 1, pitchSorted[nextIndex])
            this.showCheckOverlay = false
            this.activeDisplayIndex = targetDisplay
            this.triggerHaptic()
        },
        toggleAccidentalAt(displayIndex) {
            const minDisplay = this.showFirstToneHint ? 1 : 0
            const targetDisplay = Math.max(minDisplay, Math.min(this.melodyLength - 1, displayIndex))
            const userIndex = this.displayIndexToUserIndex(targetDisplay)
            const current = this.userMelody[userIndex]
            if (!current) return
            const currentTone = this.notePalette.find((tone) => tone.name === current)
            if (!currentTone || !Array.isArray(currentTone.enh)) return
            const candidates = currentTone.enh
                .map((id) => this.getToneChain[id])
                .filter((tone) => tone && this.notePalette.some((p) => p.name === tone.name))
            if (!candidates.length) return
            const currentIdx = candidates.findIndex((tone) => tone.name === current)
            const next = candidates[(currentIdx + 1 + candidates.length) % candidates.length] || candidates[0]
            this.userMelody.splice(userIndex, 1, next.name)
            this.showCheckOverlay = false
            this.activeDisplayIndex = targetDisplay
            this.triggerHaptic()
        },
        handleStaffHover(event) {
            const picked = this.pickNoteFromPointerEvent(event)
            if (!picked || !picked.noteName) {
                this.clearStaffHover()
                return
            }
            this.hoverNote = picked.noteName
            this.hoverLeft = picked.xInWrap + 10
            this.hoverTop = Math.max(0, picked.snappedYInWrap - 22)
            this.showLoupe(picked.noteName, picked)
        },
        clearStaffHover() {
            this.hoverNote = ''
            this.loupeVisible = false
        },
        pickNoteFromPointerEvent(event) {
            const overlay = event.currentTarget
            const wrap = overlay.closest('.staff-input-wrap')
            if (!wrap) return null
            const svg = wrap.querySelector('svg')
            if (!svg) return null

            const wrapRect = wrap.getBoundingClientRect()
            const svgRect = svg.getBoundingClientRect()
            const xInWrap = event.clientX - wrapRect.left
            const xInSvg = event.clientX - svgRect.left
            const yInSvg = event.clientY - svgRect.top
            // Allow a small margin above/below the SVG to better catch edge/ledger note positions.
            const clampedYInSvg = Math.max(-24, Math.min(svgRect.height + 24, yInSvg))
            const noteName = this.mapYToNoteName(clampedYInSvg)
            const snappedYInSvg = this.noteYForClef(noteName, this.notationClef)
            const snappedYInWrap = (svgRect.top - wrapRect.top) + snappedYInSvg
            let slotIndex = 0
            const maxSlots = Math.max(1, this.melodyLength)
            if (this.staffSlotXs.length >= 2) {
                const centers = this.staffSlotXs.slice(0, maxSlots)
                // Use midpoint boundaries between real rendered slot centers.
                let chosen = centers.length - 1
                for (let i = 0; i < centers.length - 1; i++) {
                    const boundary = (centers[i] + centers[i + 1]) / 2
                    if (xInSvg < boundary) {
                        chosen = i
                        break
                    }
                }
                slotIndex = Math.max(0, Math.min(maxSlots - 1, chosen))
            } else {
                const leftPadding = 90
                const rightPadding = 22
                const usable = Math.max(20, svgRect.width - leftPadding - rightPadding)
                const normalized = Math.max(0, Math.min(usable, xInSvg - leftPadding))
                const slotIndexRaw = Math.floor((normalized / usable) * maxSlots)
                slotIndex = Math.max(0, Math.min(maxSlots - 1, slotIndexRaw))
            }

            return { noteName, xInWrap, snappedYInWrap, slotIndex }
        },
        mapYToNoteName(y) {
            const candidates = this.notePalette.map((tone) => tone.name)
            if (!candidates.length) return ''

            let best = candidates[0]
            let bestDist = Number.POSITIVE_INFINITY
            for (const name of candidates) {
                const expectedY = this.noteYForClef(name, this.notationClef)
                const dist = Math.abs(expectedY - y)
                if (dist < bestDist) {
                    bestDist = dist
                    best = name
                }
            }
            return best
        },
        noteYForClef(noteName, clef) {
            // SVG coordinates from StaffRenderer/VexFlow: bottom line at y≈55, 5px per diatonic step.
            const bottomIndex = clef === 'bass' ? 18 : 30 // bass G2, treble E4
            const bottomY = 55
            const idx = this.diatonicIndex(noteName, this.notationOctaveOffset)
            const drawingOffsetPx = 40 // one ninth (8 diatonic steps) downward correction
            return bottomY - (idx - bottomIndex) * 5 + drawingOffsetPx
        },
        diatonicIndex(noteName, octaveOffset = 0) {
            const match = /^([A-Ga-g])[^0-9]*(\d)$/.exec(noteName || '')
            if (!match) return 0
            const letter = match[1].toLowerCase()
            const octave = Number(match[2]) + octaveOffset
            const map = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 }
            return octave * 7 + map[letter]
        },
        undoInput() {
            this.showCheckOverlay = false
            const lastFilled = this.findLastFilledUserIndex()
            if (lastFilled < 0) {
                this.activeDisplayIndex = this.showFirstToneHint ? 1 : 0
                return
            }
            this.userMelody.splice(lastFilled, 1, null)
            const minDisplay = this.showFirstToneHint ? 1 : 0
            this.activeDisplayIndex = minDisplay + lastFilled
        },
        clearInput() {
            this.showCheckOverlay = false
            this.userMelody = Array(this.maxInputLength).fill(null)
            this.activeDisplayIndex = this.showFirstToneHint ? 1 : 0
            this.scrollResetToken += 1
            this.loupeVisible = false
        },
        findLastFilledUserIndex() {
            for (let i = this.userMelody.length - 1; i >= 0; i--) {
                if (this.userMelody[i]) return i
            }
            return -1
        },
        checkAnswer() {
            const target = this.targetMelodyNames
            const entered = this.enteredMelodyNotes
            const sameLength = entered.length === target.length
            const equal = sameLength && entered.every((n, i) => n === target[i])
            this.showCheckOverlay = true
            this.resColor = equal ? 'green' : 'indianred'
            this.recordExerciseResult('melody', equal)
            if (equal && this.autoplay) {
                this.setExactTimeout(() => {
                    this.playRandomMelody()
                }, this.resultDisplayMs, 20)
            }
        }
    },
    watch: {
        showFirstToneHint() {
            this.clearInput()
            this.resetResponse()
            this.showCheckOverlay = false
        }
    }
}
</script>

<style scoped>
.choose-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}
.menu-label {
    color: rgba(0, 0, 0, 0.68);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.2;
    margin: 4px 0 6px;
}
.difficulty-toggle :deep(.v-btn) {
    text-transform: none !important;
    min-width: 52px;
}
.melody-length-select :deep(.v-field) {
    min-height: 56px !important;
}
.melody-length-select {
    flex: 0 0 auto !important;
}
.between-slot {
    margin-top: 14px;
    margin-bottom: 18px;
}
.staff-input-wrap {
    position: relative;
    cursor: crosshair;
    padding-top: 28px;
    padding-bottom: 56px;
}
.staff-input-overlay {
    position: absolute;
    top: 28px;
    right: 0;
    bottom: 44px;
    left: 0;
    z-index: 2;
    touch-action: pan-x;
}
.hover-note {
    position: absolute;
    z-index: 3;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.72);
    color: #fff;
    font-size: 12px;
    line-height: 1.1;
    pointer-events: none;
}
.note-loupe {
    position: absolute;
    z-index: 4;
    transform: translateX(-50%);
    min-width: 72px;
    padding: 4px 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.22);
    pointer-events: none;
}
.loupe-staff {
    position: relative;
    width: 60px;
    height: 48px;
}
.loupe-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(0, 0, 0, 0.48);
}
.loupe-line:nth-child(1) { top: 8px; }
.loupe-line:nth-child(2) { top: 16px; }
.loupe-line:nth-child(3) { top: 24px; }
.loupe-line:nth-child(4) { top: 32px; }
.loupe-line:nth-child(5) { top: 40px; }
.loupe-note {
    position: absolute;
    left: 24px;
    width: 12px;
    height: 9px;
    border-radius: 50%;
    background: #111;
    transform: translateY(-50%);
}
.loupe-ledger {
    position: absolute;
    left: 20px;
    width: 20px;
    height: 1px;
    background: rgba(0, 0, 0, 0.7);
}
.loupe-label {
    margin-top: 2px;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #111;
}
.container{
    padding: 0;
}
.transport-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 8px;
    padding: 0;
}
.depth-btn {
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.28);
    filter: brightness(0.96);
}
</style>
