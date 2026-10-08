<template>
    <exercise-card :disabled="lockInput">
        <template #intro>
            {{ $t('nav.scales') }}
        </template>
        <template #controls>
            <scaleChoose
                v-model:autoplay="autoplay"
                v-model:offset-first="offsetFirst"
                v-model:difficulty="difficulty"
                v-model:play-order="playOrder"
                v-model:result-display-ms="resultDisplayMs"
            />
        </template>
        <template #staff>
                <div class="staff-result-wrap">
                    <staff-renderer :notes="notationNotes" :clef="notationClef" :clef-octave="notationClefOctave" mode="melody" :octave-offset="notationOctaveOffset" :feedback-state="notationFeedbackState"></staff-renderer>
                    <div v-if="successDetail" class="success-detail">{{ successDetail }}</div>
                </div>
        </template>
        <template #transport>
            <scalePlay :started="!!firstTone" @playAgain="playAgain" @playRandomScale="playRandom"></scalePlay>
        </template>
        <template #answers>
            <guess-scale @guessResult="guessResult" :selection="getSelectedScales" :difficulty="difficulty"></guess-scale>
        </template>
    </exercise-card>
</template>

<script>
    import ExerciseCard from "@/components/common/ExerciseCard";
    import scaleChoose from "@/components/scaleJemp/scaleChoose";
    import scalePlay from "@/components/scaleJemp/scalePlay";
    import guessScale from "@/components/scaleJemp/guessScale";
    import {mapGetters} from 'vuex'
    import toneCalcService from "@/components/mixins/toneCalcService";
    import playSounds from "@/components/mixins/playSounds";
    import responseMixin from "@/components/mixins/responseMixin";
    import StaffRenderer from "@/features/notation/components/StaffRenderer";
    import { scaleRootRange } from "@/domain/music/difficulty";

    export default {
        name: "scaleJemp",
        components: {ExerciseCard, guessScale, scaleChoose, scalePlay, StaffRenderer},
        data() {
            return {
                lockInput: false,
                playLock: false, //avoid secondtone starting a playloop

                offsetFirst: true,
                result: '',
                resColor: '#9DA0A9',

                scale: '',
                randomScale: '',
                reducedScale: '',
                successDetail: '',
                showFullScale: false,
                autoplay: true,
                difficulty: 'scale1',
                firstTone: '',
                playOrder: ['increase'],
                randomOrder: 'increase',
                resultDisplayMs: 1500
            }
        },
        computed: {
            ...mapGetters(['getToneChain','getSelectedScales']),
            notationNotes() {
                if (!Array.isArray(this.scale)) return []
                const tones = this.showFullScale
                    ? this.scale
                    : [this.firstTone || this.scale[0]]
                return tones.filter((tone) => tone && tone.name).map((tone) => tone.name)
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
            notationFeedbackState() {
                if (this.resColor === 'green') return 'success'
                if (this.resColor === 'indianred') return 'error'
                return 'neutral'
            }
        },
        mixins: [toneCalcService, playSounds, responseMixin],
        methods: {
            toneLabel(tone) {
                return tone && tone.name ? tone.name.replace(/\d$/, '') : ''
            },
            scaleTitle(item) {
                if ((this.difficulty === 'scale1' || this.difficulty === 'scale2') && item && item.value === 1) {
                    return this.$t('scales.major')
                }
                if ((this.difficulty === 'scale1' || this.difficulty === 'scale2') && item && item.value === 6) {
                    return this.$t('scales.minor')
                }
                return item && item.labelKey ? this.$t(item.labelKey) : item.text
            },

            playRandom() {
                this.successDetail = ''
                this.showFullScale = false
                if (!Array.isArray(this.getSelectedScales) || this.getSelectedScales.length === 0) {
                    this.setResult(this.$t('feedback.chooseScale'));
                    this.resColor = 'indianred';
                    return;
                }

                //calc random scale
                const rootRange = scaleRootRange(this.difficulty);
                let randomRoot = this.randomRangeInt(rootRange);
                let randomScale = this.randomRangeInt({min: 0, max: this.getSelectedScales.length});
                randomScale = this.getSelectedScales[randomScale];
                this.randomScale = randomScale;

                //fetch scale
                this.scale = this.getScale(randomRoot, randomScale.scale);
                this.reducedScale = this.scale.slice(1);
                this.randomOrder = this.playOrder[0] || 'increase';
                if (this.playOrder.length > 1) {
                    this.randomOrder = this.playOrder[this.randomRangeInt({min: 0, max: this.playOrder.length})]
                }

                //set response
                this.setResult(randomScale.text);
                this.resetResponse();

                //play
                this.playTones()
                //this.logger({root: this.scale[0].name, scale: this.scale});
            },

            playTones() {
                this.setInputlock(true);
                this.playLock = false;
                this.firstTone = this.randomOrder === 'decrease'
                    ? this.scale[this.scale.length - 1]
                    : this.scale[0]
                this.playAudio(this.firstTone.tone)
            },

            playSecond(){
                let timeOffset = 170;
                if(this.offsetFirst){
                    timeOffset = 500;
                }

                if(!this.playLock) {
                    this.playLock = true;
                    this.setExactTimeout(() => {
                        this.playScale()
                    }, timeOffset, 20)

                }
            },

            playScale() {
                let start = 200;
                let delay = 350;
                let sequence = this.reducedScale;

                if (this.randomOrder === 'decrease') {
                    sequence = this.scale.slice(0, -1).reverse();
                } else if (this.randomOrder === 'simultaneous') {
                    sequence = this.scale.slice(1).concat(this.scale.slice(0, -1).reverse());
                }

                for (let tones of sequence) {
                    this.setExactTimeout(() => {
                        this.playAudio(tones.tone);
                    }, start, 20);
                    start += delay;
                }

                //reset inputlock
                this.setExactTimeout(() => {
                    this.setInputlock(false)
                }, start + 200, 20);
            },

            guessResult(guess) {
                this.successDetail = ''
                const correct = guess == this.result
                this.recordExerciseResult('scales', correct)

                if (correct) {
                    this.resColor = 'green';
                    this.showFullScale = true;
                    this.successDetail = `${this.toneLabel(this.scale[0])} ${this.scaleTitle(this.randomScale)}`;
                    if(this.autoplay){
                        this.setExactTimeout(() => {
                            this.playRandom()
                        }, this.resultDisplayMs, 20)
                    }
                } else {
                    this.resColor = 'indianred'
                }
            },
        }
    }
</script>

<style scoped>
    .staff-result-wrap {
        position: relative;
    }
    .success-detail {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 12px;
        z-index: 2;
        color: #1b5e20;
        font-size: 0.95rem;
        font-weight: 700;
        line-height: 1.2;
        text-align: center;
        pointer-events: none;
    }
</style>
