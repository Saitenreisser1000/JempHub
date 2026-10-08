<template>
    <exercise-card :disabled="lockInput">
        <template #intro>
            {{ $t('nav.intonation') }}
        </template>

        <template #controls>
            <exercise-toolbar>
                <template #level>
                    <div class="menu-label">{{ $t('common.difficulty') }}</div>
                    <v-btn-toggle
                        v-model="centSpread"
                        class="text-white spread-toggle"
                        density="compact"
                        active-class="primary"
                        background-color="secondary"
                        mandatory
                    >
                        <v-btn :value="25" size="small">1 (25¢)</v-btn>
                        <v-btn :value="15" size="small">2 (15¢)</v-btn>
                        <v-btn :value="10" size="small">3 (10¢)</v-btn>
                        <v-btn :value="5" size="small">4 (5¢)</v-btn>
                    </v-btn-toggle>

                    <div class="menu-label mt-3">{{ $t('intonation.interval') }}</div>
                    <div class="interval-checkbox-grid">
                        <v-checkbox
                            v-for="interval in playableIntervals()"
                            :key="interval.value"
                            v-model="selectedIntervalValues"
                            :label="intervalTitle(interval)"
                            :value="interval.value"
                            density="compact"
                            hide-details
                        />
                    </div>
                </template>
                <template #options>
                    <div class="menu-label">{{ $t('intonation.tuning') }}</div>
                    <v-checkbox
                        v-model="autoplay"
                        :label="$t('common.autoplay')"
                        density="compact"
                        hide-details
                    />
                    <v-btn-toggle
                        v-model="tuning"
                        class="text-white choice-toggle mb-2"
                        density="compact"
                        active-class="primary"
                        background-color="secondary"
                        mandatory
                    >
                        <v-btn value="equal" size="small">{{ $t('intonation.equal') }}</v-btn>
                        <v-btn value="just" size="small">{{ $t('intonation.just') }}</v-btn>
                    </v-btn-toggle>

                    <div class="menu-label">{{ $t('intonation.sound') }}</div>
                    <v-btn-toggle
                        v-model="soundMode"
                        class="text-white sound-toggle mb-2"
                        density="compact"
                        active-class="primary"
                        background-color="secondary"
                        mandatory
                    >
                        <v-btn
                            v-for="sound in soundModes"
                            :key="sound.value"
                            :value="sound.value"
                            size="small"
                        >
                            {{ $t(sound.labelKey) }}
                        </v-btn>
                    </v-btn-toggle>

                    <div class="menu-label">{{ $t('common.direction') }}</div>
                    <v-btn-toggle
                        v-model="playOrder"
                        class="text-white direction-toggle"
                        density="compact"
                        active-class="primary"
                        background-color="secondary"
                        mandatory
                    >
                        <v-btn value="increase" size="small">{{ $t('common.up') }}</v-btn>
                        <v-btn value="decrease" size="small">{{ $t('common.down') }}</v-btn>
                        <v-btn value="simultaneous" size="small">=</v-btn>
                    </v-btn-toggle>
                </template>
            </exercise-toolbar>
        </template>

        <template #staff>
            <div class="staff-result-wrap">
                <staff-renderer
                    class="intonation-staff"
                    :notes="notationNotes"
                    :clef="notationClef"
                    :clef-octave="notationClefOctave"
                    :mode="notationMode"
                    :octave-offset="notationOctaveOffset"
                    :feedback-state="notationFeedbackState"
                    :chord-groups="notationChordGroups"
                    :chord-group-labels="notationVariantLabels"
                    :chord-group-states="notationVariantStates"
                ></staff-renderer>
                <div v-if="showActiveInterval" class="active-interval">
                    {{ $t('intonation.currentInterval') }}: {{ intervalTitle(activeInterval) }}
                </div>
                <div v-if="answered" class="result-text">
                    {{ resultText }}
                </div>
                <div v-if="showVariantReplayButtons" class="notation-play-row">
                    <v-btn
                        v-for="variant in variants"
                        :key="`staff-play-${variant.index}`"
                        class="notation-play-btn depth-btn"
                        color="primary"
                        icon
                        :disabled="!started || lockInput"
                        @click="playVariant(variant)"
                    >
                        <v-icon size="22">mdi-play</v-icon>
                    </v-btn>
                    <div
                        v-for="variant in variants"
                        :key="`staff-play-label-${variant.index}`"
                        class="notation-play-label"
                    >
                        #{{ variant.index }}
                    </div>
                </div>
                <div v-else class="notation-action-row">
                    <v-btn
                        color="success"
                        height="44"
                        class="notation-action-btn depth-btn"
                        :disabled="lockInput"
                        @click="playAgain"
                    >
                        <v-icon size="22">mdi-play</v-icon>
                        <span>Play</span>
                    </v-btn>
                </div>
            </div>
        </template>

        <template #answers>
            <div class="answer-grid">
                <v-btn
                    v-for="variant in variants"
                    :key="`answer-${variant.index}`"
                    color="primary"
                    class="answer-btn depth-btn"
                    :disabled="!started || lockInput"
                    @click="guessResult(variant.index)"
                >
                    {{ variant.index }}
                </v-btn>
            </div>
            <v-btn
                v-if="showVariantReplayButtons"
                color="error"
                height="44"
                class="answer-next-btn depth-btn"
                :disabled="lockInput"
                @click="playRandom"
            >
                <v-icon size="22">mdi-skip-next</v-icon>
                <span>{{ $t('common.next') }}</span>
            </v-btn>
        </template>
    </exercise-card>
</template>

<script>
    import {mapGetters} from 'vuex'
    import ExerciseCard from "@/components/common/ExerciseCard";
    import ExerciseToolbar from "@/components/common/ExerciseToolbar";
    import playSounds from "@/components/mixins/playSounds";
    import toneCalcService from "@/components/mixins/toneCalcService";
    import responseMixin from "@/components/mixins/responseMixin";
    import StaffRenderer from "@/features/notation/components/StaffRenderer";
    import { playIntonationSample, preloadIntonationInstrument } from "@/domain/audio/intonationSamplePlayer";

    const INTONATION_INTERVALS = [
        { value: 'random', labelKey: 'intonation.random', random: true },
        { value: 'b2', labelKey: 'intervals.flat2', semitones: 1, justCents: 111.73 },
        { value: '2', labelKey: 'intervals.major2', semitones: 2, justCents: 203.91 },
        { value: 'b3', labelKey: 'intervals.flat3', semitones: 3, justCents: 315.64 },
        { value: '3', labelKey: 'intervals.major3', semitones: 4, justCents: 386.31 },
        { value: '4', labelKey: 'intervals.perfect4', semitones: 5, justCents: 498.04 },
        { value: '#4', labelKey: 'intervals.tritone', semitones: 6, justCents: 590.22 },
        { value: '5', labelKey: 'intervals.perfect5', semitones: 7, justCents: 701.96 },
        { value: 'b6', labelKey: 'intervals.flat6', semitones: 8, justCents: 813.69 },
        { value: '6', labelKey: 'intervals.major6', semitones: 9, justCents: 884.36 },
        { value: 'b7', labelKey: 'intervals.flat7', semitones: 10, justCents: 1017.60 },
        { value: '7', labelKey: 'intervals.major7', semitones: 11, justCents: 1088.27 },
        { value: '8', labelKey: 'intervals.octave', semitones: 12, justCents: 1200 },
        { value: 'b9', labelKey: 'intervals.flat9', semitones: 13, justCents: 1311.73 },
        { value: '9', labelKey: 'intervals.major9', semitones: 14, justCents: 1403.91 }
    ]
    const DEFAULT_INTERVAL_VALUES = ['b3', '3', '4', '5']
    const INTONATION_SOUND_MODES = [
        { value: 'piano', labelKey: 'intonation.soundPiano' },
        { value: 'brass', labelKey: 'intonation.soundBrass' },
        { value: 'woodwinds', labelKey: 'intonation.soundWoodwinds' },
        { value: 'strings', labelKey: 'intonation.soundStrings' }
    ]

    export default {
        name: "intonationJemp",
        components: {ExerciseCard, ExerciseToolbar, StaffRenderer},
        mixins: [toneCalcService, playSounds, responseMixin],
        data() {
            return {
                lockInput: false,
                tuning: 'equal',
                centSpread: 15,
                intervals: INTONATION_INTERVALS,
                selectedIntervalValues: DEFAULT_INTERVAL_VALUES,
                activeInterval: null,
                autoplay: true,
                soundModes: INTONATION_SOUND_MODES,
                soundMode: 'piano',
                playOrder: 'simultaneous',
                rootTone: null,
                targetTone: null,
                variants: [],
                playedVariantIndices: [],
                correctVariant: null,
                started: false,
                answered: false,
                resColor: '#9DA0A9',
                resultDisplayMs: 1500
            }
        },
        computed: {
            ...mapGetters(['getToneChain']),
            resultText() {
                if (!this.answered) return ''
                return this.resColor === 'green'
                    ? this.$t('stats.correct')
                    : `${this.$t('stats.correct')}: ${this.correctVariant}`
            },
            showActiveInterval() {
                return this.started && this.selectedIntervals.length !== 1 && this.activeInterval
            },
            selectedIntervals() {
                const selected = this.playableIntervals()
                    .filter((interval) => this.selectedIntervalValues.includes(interval.value))
                return selected.length ? selected : this.playableIntervals()
            },
            notationNotes() {
                if (!this.rootTone || !this.targetTone) return []
                if (this.playOrder === 'decrease') return [this.targetTone.name, this.rootTone.name]
                return [this.rootTone.name, this.targetTone.name]
            },
            notationChordGroups() {
                if (!this.notationNotes.length || !this.visibleNotationVariants.length) return []
                return this.visibleNotationVariants.map(() => this.notationNotes)
            },
            notationVariantLabels() {
                if (!this.visibleNotationVariants.length) return []
                if (!this.answered) {
                    return this.visibleNotationVariants.map((variant) => String(variant.index))
                }
                return this.visibleNotationVariants.map((variant) => {
                    if (variant.offset === 0) return '✓'
                    return variant.offset > 0 ? '↑' : '↓'
                })
            },
            notationVariantStates() {
                if (!this.visibleNotationVariants.length) return []
                if (!this.answered) return this.visibleNotationVariants.map(() => 'neutral')
                return this.visibleNotationVariants.map((variant) => {
                    if (variant.offset === 0) return 'success'
                    return variant.offset > 0 ? 'high' : 'low'
                })
            },
            visibleNotationVariants() {
                const played = new Set(this.playedVariantIndices)
                return this.variants.filter((variant) => played.has(variant.index))
            },
            showVariantReplayButtons() {
                return this.variants.length > 0 && this.visibleNotationVariants.length === this.variants.length
            },
            notationOctaveOffset() {
                return 1
            },
            notationAdjustedOctaves() {
                return this.notationNotes
                    .map((n) => /(\d)$/.exec(n))
                    .filter(Boolean)
                    .map((m) => Number(m[1]) + this.notationOctaveOffset)
            },
            notationClef() {
                if (!this.notationAdjustedOctaves.length) return 'treble'
                return Math.max(...this.notationAdjustedOctaves) <= 3 ? 'bass' : 'treble'
            },
            notationClefOctave() {
                if (!this.notationAdjustedOctaves.length) return ''
                if (this.notationClef === 'bass') {
                    return Math.min(...this.notationAdjustedOctaves) <= 2 ? '8vb' : ''
                }
                return Math.max(...this.notationAdjustedOctaves) >= 6 ? '8va' : ''
            },
            notationMode() {
                return 'chord-sequence'
            },
            notationFeedbackState() {
                if (this.resColor === 'green') return 'success'
                if (this.resColor === 'indianred') return 'error'
                return 'neutral'
            }
        },
        methods: {
            intervalTitle(item) {
                return item && item.labelKey ? this.$t(item.labelKey) : item.value
            },
            playableIntervals() {
                return this.intervals.filter((interval) => !interval.random)
            },
            resolveActiveInterval() {
                const intervals = this.selectedIntervals
                return intervals[this.randomRangeInt({min: 0, max: intervals.length})]
            },
            targetCents(interval = this.activeInterval) {
                return this.tuning === 'equal' ? interval.semitones * 100 : interval.justCents
            },
            rateForCents(cents) {
                return Math.pow(2, cents / 1200)
            },
            randomRootTone() {
                const maxToneId = 32 - this.activeInterval.semitones
                const pool = this.getToneChain.filter((tone) => (
                    /^[A-G][23]$/.test(tone.name) &&
                    tone.toneID >= 14 &&
                    tone.toneID <= maxToneId
                ))
                return pool[this.randomRangeInt({min: 0, max: pool.length})]
            },
            toneBySemitoneDistance(root, semitones) {
                return this.getToneChain.find((tone) => (
                    tone.toneID === root.toneID + semitones &&
                    tone.tone === tone.name.replace('#', 's')
                )) || this.getToneChain.find((tone) => tone.toneID === root.toneID + semitones)
            },
            shuffle(items) {
                const copy = items.slice()
                for (let i = copy.length - 1; i > 0; i--) {
                    const j = this.randomRangeInt({min: 0, max: i + 1})
                    ;[copy[i], copy[j]] = [copy[j], copy[i]]
                }
                return copy
            },
            buildVariants() {
                const offsets = this.shuffle([0, -this.centSpread, this.centSpread])
                this.variants = offsets.map((offset, idx) => ({
                    index: idx + 1,
                    offset,
                    centsFromEqual: this.targetCents() - (this.activeInterval.semitones * 100) + offset
                }))
                this.correctVariant = this.variants.find((variant) => variant.offset === 0).index
            },
            playRandom() {
                this.answered = false
                this.resColor = '#9DA0A9'
                this.playedVariantIndices = []
                this.activeInterval = this.resolveActiveInterval()
                this.rootTone = this.randomRootTone()
                this.targetTone = this.toneBySemitoneDistance(this.rootTone, this.activeInterval.semitones)
                this.buildVariants()
                this.started = true
                this.playAllVariants()
            },
            playAgain() {
                if (!this.started) {
                    this.playRandom()
                    return
                }
                this.playAllVariants()
            },
            playAllVariants() {
                if (!this.rootTone || !this.targetTone) return
                this.setInputlock(true)
                let start = 150
                for (const variant of this.variants) {
                    this.setExactTimeout(() => this.playVariant(variant), start, 20)
                    start += this.playOrder === 'simultaneous' ? 1500 : 1900
                }
                this.setExactTimeout(() => this.setInputlock(false), start + 300, 20)
            },
            playVariant(variant) {
                if (!this.rootTone || !this.targetTone || !variant) return
                this.markVariantPlayed(variant.index)
                const rootOptions = {fadeMs: 900}
                const targetOptions = {
                    rate: this.rateForCents(variant.centsFromEqual),
                    fadeMs: 900
                }

                if (this.playOrder === 'increase') {
                    this.playIntonationTone(this.rootTone.tone, rootOptions)
                    this.setExactTimeout(() => this.playIntonationTone(this.targetTone.tone, targetOptions), 520, 20)
                    return
                }

                if (this.playOrder === 'decrease') {
                    this.playIntonationTone(this.targetTone.tone, targetOptions)
                    this.setExactTimeout(() => this.playIntonationTone(this.rootTone.tone, rootOptions), 520, 20)
                    return
                }

                this.playIntonationTone(this.rootTone.tone, rootOptions)
                this.playIntonationTone(this.targetTone.tone, targetOptions)
            },
            playIntonationTone(tone, options = {}) {
                if (this.soundMode === 'piano') {
                    this.playAudio(tone, options)
                    return
                }
                this.ensureAudioContextRunning()
                preloadIntonationInstrument(this.soundMode)
                    .then(() => playIntonationSample(this.soundMode, tone, options))
                    .catch(() => {
                        this.playAudio(tone, options)
                    })
            },
            markVariantPlayed(index) {
                if (this.playedVariantIndices.includes(index)) return
                this.playedVariantIndices = [...this.playedVariantIndices, index]
            },
            guessResult(index) {
                if (!this.started || this.answered) return
                const correct = index === this.correctVariant
                this.answered = true
                this.resColor = correct ? 'green' : 'indianred'
                this.recordExerciseResult('intonation', correct)
                if (correct && this.autoplay) {
                    this.setExactTimeout(() => {
                        this.playRandom()
                    }, this.resultDisplayMs, 20)
                }
            }
        },
        watch: {
            soundMode() {
                if (this.soundMode === 'piano') return
                this.ensureAudioContextRunning()
                preloadIntonationInstrument(this.soundMode).catch(() => {})
            },
            tuning() {
                this.started = false
                this.answered = false
                this.variants = []
                this.playedVariantIndices = []
                this.resColor = '#9DA0A9'
            },
            selectedIntervalValues: {
                deep: true,
                handler() {
                    this.started = false
                    this.answered = false
                    this.activeInterval = null
                    this.variants = []
                    this.playedVariantIndices = []
                    this.resColor = '#9DA0A9'
                }
            }
        }
    }
</script>

<style scoped>
    .menu-label {
        color: rgba(0, 0, 0, 0.68);
        font-size: 0.78rem;
        font-weight: 600;
        line-height: 1.2;
        margin: 4px 0 6px;
    }
    .choice-toggle,
    .spread-toggle,
    .direction-toggle,
    .sound-toggle {
        width: 100%;
    }
    .choice-toggle :deep(.v-btn),
    .spread-toggle :deep(.v-btn),
    .direction-toggle :deep(.v-btn),
    .sound-toggle :deep(.v-btn) {
        flex: 1 1 0;
        min-width: 0 !important;
        text-transform: none !important;
    }
    .sound-toggle {
        flex-wrap: wrap;
        height: auto !important;
        gap: 8px;
    }
    .sound-toggle :deep(.v-btn) {
        flex-basis: 50%;
        min-height: 52px !important;
        padding: 0 12px !important;
    }
    .sound-toggle :deep(.v-btn__content) {
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1.15;
        white-space: normal;
    }
    .interval-checkbox-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: 8px;
        max-height: 230px;
        overflow-y: auto;
    }
    .interval-checkbox-grid :deep(.v-label) {
        font-size: 0.82rem;
    }
    .staff-result-wrap {
        position: relative;
        padding-bottom: 64px;
    }
    .intonation-staff {
        width: 100%;
    }
    .active-interval {
        color: rgba(0, 0, 0, 0.66);
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.2;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
        text-align: center;
        top: 4px;
    }
    .answer-grid {
        display: grid;
        gap: 8px;
        width: 100%;
    }
    .answer-grid {
        grid-template-columns: repeat(3, 1fr);
    }
    .answer-btn {
        height: 44px;
        min-width: 0 !important;
    }
    .answer-next-btn {
        margin-top: 18px;
        min-width: 0 !important;
        text-transform: none !important;
        width: 100%;
    }
    .answer-next-btn :deep(.v-btn__content) {
        gap: 6px;
    }
    .result-text {
        color: rgba(0, 0, 0, 0.72);
        font-size: 0.85rem;
        font-weight: 700;
        line-height: 1.2;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
        text-align: center;
        bottom: 48px;
    }
    .notation-play-row {
        align-items: center;
        bottom: 0;
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        left: 0;
        position: absolute;
        right: 0;
    }
    .notation-play-label {
        color: rgba(0, 0, 0, 0.68);
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1;
        text-align: center;
    }
    .notation-action-row {
        align-items: center;
        bottom: 0;
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr;
        left: 0;
        position: absolute;
        right: 0;
    }
    .notation-play-btn {
        height: 40px !important;
        justify-self: center;
        min-width: 40px !important;
        width: 40px;
    }
    .notation-action-btn {
        min-width: 0 !important;
        text-transform: none !important;
    }
    .notation-action-btn :deep(.v-btn__content) {
        gap: 6px;
    }
    .depth-btn {
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.28);
        filter: brightness(0.96);
    }
</style>
