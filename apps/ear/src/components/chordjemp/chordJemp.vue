<template>
        <exercise-card :disabled="lockInput">
            <template #intro>
                {{ $t('nav.chords') }}
            </template>
            <template #controls>
                <chordChoose
                    v-model:autoplay="autoplay"
                    v-model:difficulty="difficulty"
                    v-model:play-order="playOrder"
                    v-model:result-display-ms="resultDisplayMs"
                />
            </template>
            <template #staff>
                    <div class="staff-result-wrap">
                        <staff-renderer :notes="notationNotes" :clef="notationClef" :clef-octave="notationClefOctave" mode="chord" :octave-offset="notationOctaveOffset" :feedback-state="notationFeedbackState"></staff-renderer>
                        <div v-if="successDetail" class="success-detail">{{ successDetail }}</div>
                    </div>
            </template>
            <template #transport>
                <chordPlay :started="!!firstTone" @playAgain="playAgain" @playRandomChord="playRandom"></chordPlay>
            </template>
            <template #answers>
                <guessChord @guessResult="guessResult" :selection="getSelectedChords"></guessChord>
            </template>
        </exercise-card>
</template>

<script>
    import {mapGetters} from 'vuex';
    import ExerciseCard from "@/components/common/ExerciseCard";
    import chordChoose from "@/components/chordjemp/chordChoose";
    import chordPlay from "@/components/chordjemp/chordPlay";
    import guessChord from "@/components/chordjemp/guessChord";
    import toneCalcService from "@/components/mixins/toneCalcService";
    import playSounds from "@/components/mixins/playSounds";
    import responseMixin from "@/components/mixins/responseMixin";
    import StaffRenderer from "@/features/notation/components/StaffRenderer";
    import { chordStartMinIndex } from "@/domain/music/difficulty";

    export default {
        name: "chordjemp",
        components: {ExerciseCard, chordChoose, chordPlay, guessChord, StaffRenderer},
        data() {
            return {
                lockInput: false,
                result: '',
                resColor: '#9DA0A9',

                randomChord:'',
                reducedList:'',
                firstTone:'',
                secondTone: '',
                thirdTone: '',
                fourthTone: '',
                successDetail: '',

                autoplay: true,
                difficulty: 'easy',
                playOrder: ['simultaneous'],
                randomOrder: 'simultaneous',
                hasAnswered: false,
                resultDisplayMs: 1500,
                resultTimer: null
            }
        },
        mixins: [toneCalcService, playSounds, responseMixin],
        computed: {
            ...mapGetters(['getToneChain','getSelectedChords']),
            notationNotes() {
                if (!this.hasAnswered) return []
                const tones = [this.firstTone, this.secondTone, this.thirdTone, this.fourthTone]
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
        methods: {
            clearResultTimer() {
                if (this.resultTimer) {
                    clearInterval(this.resultTimer)
                    this.resultTimer = null
                }
            },
            hideResult() {
                this.hasAnswered = false
                this.successDetail = ''
                this.resetResponse()
            },
            toneLabel(tone) {
                return tone && tone.name ? tone.name.replace(/\d$/, '') : ''
            },
            chordSymbol(chord, rootTone) {
                const root = this.toneLabel(rootTone)
                const symbols = {
                    0: `${root}m`,
                    1: root,
                    2: `${root}dim`,
                    3: `${root}aug`,
                    4: `${root}sus2`,
                    5: `${root}sus4`,
                    6: `${root}m7`,
                    7: `${root}mΔ7`,
                    8: `${root}7`,
                    9: `${root}Δ7`,
                    10: `${root}m7b5`,
                    11: `${root}dim7`,
                    12: `${root}aug7`
                }
                return symbols[chord.value] || `${root} ${chord.text}`
            },

            playRandom(){
                this.clearResultTimer()
                this.successDetail = ''
                if (!Array.isArray(this.getSelectedChords) || this.getSelectedChords.length === 0) {
                    this.setResult(this.$t('feedback.chooseChord'));
                    this.resColor = 'indianred';
                    return;
                }

                //calc random chord
                let rand = this.randomRangeInt({min: 0, max: this.getSelectedChords.length});
                this.randomChord = this.getSelectedChords[rand]

                this.reducedList = this.reduceToneList(this.randomChord.maxRange);
                this.randomOrder = this.playOrder[0] || 'simultaneous';
                if (this.playOrder.length > 1) {
                    this.randomOrder = this.playOrder[this.randomRangeInt({min: 0, max: this.playOrder.length})]
                }

                //set response
                this.setResult(this.randomChord.text)
                this.resetResponse()
                this.hasAnswered = false

                this.calcFirstTone()
            },

            calcFirstTone(){
                const max = this.reducedList.length;
                let min = chordStartMinIndex(max, this.difficulty);
                min = Math.min(min, Math.max(0, max - 1));
                this.firstTone = this.reducedList[this.randomRangeInt({min, max})];
                this.calcChord();
            },

            calcChord(){
                this.secondTone = this.getInterval(this.firstTone, this.randomChord.toneSteps[0], this.randomChord.lineDist[0]);
                this.thirdTone = this.getInterval(this.secondTone, this.randomChord.toneSteps[1], this.randomChord.lineDist[1]);
                if(this.randomChord.toneSteps.length === 3){
                    this.fourthTone = this.getInterval(this.thirdTone, this.randomChord.toneSteps[2], this.randomChord.lineDist[2])
                }
                //this.logger({chord: this.randomChord.text, firstTone: this.firstTone.name, secondTone: this.secondTone.name, thirdTone: this.thirdTone.name});
                this.playTones();
            },

            playArpeggio(){
                if(this.firstTone){
                    this.setExactTimeout(() => { this.playAudio(this.firstTone.tone); }, 200, 20);
                    this.setExactTimeout(() => { this.playAudio(this.secondTone.tone); }, 600, 20);
                    this.setExactTimeout(() => { this.playAudio(this.thirdTone.tone); }, 1000, 20);
                    if(this.randomChord.toneSteps.length === 3) {
                        this.setExactTimeout(() => {this.playAudio(this.fourthTone.tone);}, 1400, 20)
                    }
                }
            },

            playTones(){
                this.setInputlock(true)
                const chordTones = [this.firstTone, this.secondTone, this.thirdTone];
                if (this.randomChord.toneSteps.length === 3) chordTones.push(this.fourthTone);

                if (this.randomOrder === 'simultaneous') {
                    this.setExactTimeout(() => {
                        for (const tone of chordTones) this.playAudio(tone.tone);
                    }, 200, 20);
                    this.setExactTimeout(() => { this.setInputlock(false) }, 1000, 20);
                    return;
                }

                const ordered = this.randomOrder === 'decrease' ? chordTones.slice().reverse() : chordTones;
                let start = 200;
                const delay = 350;
                for (const tone of ordered) {
                    this.setExactTimeout(() => { this.playAudio(tone.tone); }, start, 20);
                    start += delay;
                }
                this.setExactTimeout(() => { this.setInputlock(false) }, start + 200, 20);
            },

            guessResult(guess) {
                this.clearResultTimer()
                this.hasAnswered = true
                this.successDetail = ''
                const correct = guess == this.result
                this.recordExerciseResult('chords', correct)

                if (correct) {
                    this.resColor = 'green'
                    this.successDetail = this.chordSymbol(this.randomChord, this.firstTone)
                    if (this.autoplay) {
                        this.resultTimer = this.setExactTimeout(() => {
                            this.resultTimer = null
                            this.playRandom()
                        }, this.resultDisplayMs, 20)
                    } else {
                        this.resultTimer = this.setExactTimeout(() => {
                            this.resultTimer = null
                            this.hideResult()
                        }, this.resultDisplayMs, 20)
                    }
                } else {
                    this.resColor = 'indianred'
                    this.resultTimer = this.setExactTimeout(() => {
                        this.resultTimer = null
                        this.hideResult()
                    }, this.resultDisplayMs, 20)
                }
            }
        },
        beforeUnmount() {
            this.clearResultTimer()
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
