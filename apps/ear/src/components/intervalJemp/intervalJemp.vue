<template>
    <exercise-card :disabled="lockInput">
        <template #intro>
            {{ $t('nav.intervals') }}
        </template>
        <template #controls>
            <interval-settings
                v-model:autoplay="autoplay"
                v-model:difficulty="difficulty"
                v-model:result-display-ms="resultDisplayMs"
                @setPlayOrder="setPlayOrder"
            />
        </template>
        <template #staff>
                <staff-renderer
                    :notes="notationNotes"
                    :comparison-notes="notationComparisonNotes"
                    :mismatch-indices="notationMismatchIndices"
                    :clef="notationClef"
                    :clef-octave="notationClefOctave"
                    :mode="notationMode"
                    :octave-offset="notationOctaveOffset"
                    :feedback-state="notationFeedbackState"
                ></staff-renderer>
        </template>
        <template #transport>
            <interval-play :started="!!firstTone" @playAgain="playAgain" @playRandomInterval="playRandom"></interval-play>
        </template>
        <template #answers>
            <guessInterval @guessResult="guessResult"></guessInterval>
        </template>
    </exercise-card>
</template>

<script>
    import ExerciseCard from "@/components/common/ExerciseCard";
    import IntervalPlay from "@/components/intervalJemp/intervalPlay";
    import IntervalSettings from "@/components/intervalJemp/intervalSettings";
    import guessInterval from "@/components/intervalJemp/guessInterval";
    import {mapGetters} from 'vuex'
    import toneCalcService from "@/components/mixins/toneCalcService";
    import playSounds from "@/components/mixins/playSounds";
    import responseMixin from "@/components/mixins/responseMixin";
    import StaffRenderer from "@/features/notation/components/StaffRenderer";
    import { matchesTonePool } from "@/domain/music/difficulty";

    export default {
        name: "intervallOne",
        data() {
            return {
                lockInput: false,
                playLock: false, //avoid secondtone starting a playloop
                result: '',
                resColor: '#9DA0A9',

                randomInterval: '',
                reducedIncList: '',
                reducedDecList: '',
                firstTone: '',
                secondTone: '',
                autoplay: true,
                difficulty: 'easy',
                playOrder: ['increase'],
                randomOrder: '',
                delay: 700,
                resultDisplayMs: 1500,
                hasAnswered: false,
                guessedSecondTone: null,
                lastFirstToneId: null
            }
        },
        components: {
            ExerciseCard,
            StaffRenderer,
            IntervalSettings,
            IntervalPlay,
            guessInterval
        },
        mixins: [toneCalcService, playSounds, responseMixin],
        computed: {
            ...mapGetters(['getToneChain', 'getSelectedIntervals']),
            notationStartTone() {
                if (this.randomOrder !== 'decrease') return this.firstTone;
                return this.higherTone(this.firstTone, this.secondTone);
            },
            notationTargetTone() {
                if (this.randomOrder !== 'decrease') return this.secondTone;
                return this.lowerTone(this.firstTone, this.secondTone);
            },
            notationNotes() {
                const notes = [];
                if (this.notationStartTone && this.notationStartTone.name) notes.push(this.notationStartTone.name);
                if (!this.hasAnswered) return notes;

                if (this.resColor === 'green') {
                    if (this.notationTargetTone && this.notationTargetTone.name) notes.push(this.notationTargetTone.name);
                    return notes;
                }
                if (this.guessedSecondTone && this.guessedSecondTone.name) notes.push(this.guessedSecondTone.name);
                return notes;
            },
            notationComparisonNotes() {
                if (!this.hasAnswered || this.resColor === 'green') return [];
                return [
                    null,
                    this.notationTargetTone && this.notationTargetTone.name ? this.notationTargetTone.name : null
                ];
            },
            notationMismatchIndices() {
                if (!this.hasAnswered || this.resColor === 'green') return [];
                return [1];
            },
            notationClef() {
                if (!this.notationAdjustedOctaves.length) return 'treble';
                return Math.max(...this.notationAdjustedOctaves) <= 3 ? 'bass' : 'treble';
            },
            notationClefOctave() {
                if (!this.notationAdjustedOctaves.length) return '';
                if (this.notationClef === 'bass') {
                    return Math.min(...this.notationAdjustedOctaves) <= 2 ? '8vb' : '';
                }
                return Math.max(...this.notationAdjustedOctaves) >= 6 ? '8va' : '';
            },
            notationMode() {
                if (this.hasAnswered && this.resColor !== 'green') return 'melody';
                return this.randomOrder === 'simultaneous' ? 'chord' : 'melody';
            },
            notationOctaveOffset() {
                return 1;
            },
            notationAdjustedOctaves() {
                return [...this.notationNotes, ...this.notationComparisonNotes]
                    .map((n) => /(\d)$/.exec(n))
                    .filter(Boolean)
                    .map((m) => Number(m[1]) + this.notationOctaveOffset);
            },
            notationFeedbackState() {
                if (this.resColor === 'green') return 'success'
                if (this.resColor === 'indianred') return 'error'
                return 'neutral'
            }
        },

        methods: {
            higherTone(first, second) {
                if (!first) return second;
                if (!second) return first;
                return second.toneID > first.toneID ? second : first;
            },

            lowerTone(first, second) {
                if (!first) return second;
                if (!second) return first;
                return second.toneID < first.toneID ? second : first;
            },

            playRandom(){
                //calc intervals
                this.randomInterval = this.randomRangeInt({min: 0, max: this.getSelectedIntervals.length});
                this.randomInterval = this.getSelectedIntervals[this.randomInterval];

                this.reducedIncList = this.reduceToneList(this.randomInterval.value);

                this.randomOrder = this.playOrder[0];
                if(this.playOrder.length > 1){
                    this.randomOrder = this.playOrder[this.randomRangeInt({min: 0, max: this.playOrder.length})]
                }

                this.setResult(this.randomInterval.text)
                this.resetResponse()

                this.hasAnswered = false;
                this.guessedSecondTone = null;

                this.calcFirstTone();
            },

            calcFirstTone() {
                const poolFiltered = this.reducedIncList.filter((tone) => matchesTonePool(tone, this.difficulty));
                const noImmediateRepeat = poolFiltered.filter((tone) => tone.id !== this.lastFirstToneId);
                const usable = noImmediateRepeat.length ? noImmediateRepeat : poolFiltered;
                const max = usable.length;
                if (!max) {
                    this.firstTone = this.reducedIncList[this.randomRangeInt({min: 0, max: this.reducedIncList.length})];
                } else {
                    this.firstTone = usable[this.randomRangeInt({min: 0, max})];
                }
                this.lastFirstToneId = this.firstTone ? this.firstTone.id : null;
                this.calcInterval();
            },

            calcInterval() {
                this.secondTone = this.getInterval(this.firstTone, this.randomInterval.value, this.randomInterval.lineDist);
                //this.logger({interval: this.randomInterval.text, firstTone: this.firstTone.name, secondTone: this.secondTone.name});
                this.playTones()
            },

            playTones() {
                this.setInputlock(true);
                this.playLock = false;

                if(this.randomOrder === 'simultaneous'){
                    this.playLock = true;

                    this.setExactTimeout(() => {
                        this.playAudio(this.firstTone.tone);
                        this.playAudio(this.secondTone.tone);
                    }, 200, 20);

                }else if(this.randomOrder === 'decrease'){
                    this.setExactTimeout(() => {
                        this.playAudio(this.secondTone.tone);
                    }, 200, 20);
                }

                //playOrder = increase
                else{
                    this.setExactTimeout(() => {
                        this.playAudio(this.firstTone.tone);
                    }, 200, 20);
                }
                //reset inputlock
                this.setExactTimeout(() => {
                    this.setInputlock(false)
                }, 1000, 20);
            },

            playSecond(){
                if(!this.playLock){
                    this.setExactTimeout( () => {
                        this.playLock = true;
                        const followTone = this.randomOrder === 'decrease' ? this.firstTone : this.secondTone;
                        this.playAudio(followTone.tone);
                    }, this.delay, 20);
                }
            },

            guessResult(guess) {
                this.hasAnswered = true;
                const guessedInterval = this.getSelectedIntervals.find((item) => item.text === guess);
                if (guessedInterval && this.notationStartTone) {
                    this.guessedSecondTone = this.randomOrder === 'decrease'
                        ? this.getDescendingInterval(this.notationStartTone, guessedInterval.value, guessedInterval.lineDist)
                        : this.getInterval(this.notationStartTone, guessedInterval.value, guessedInterval.lineDist);
                } else {
                    this.guessedSecondTone = null;
                }

                const correct = guess == this.result
                this.recordExerciseResult('intervals', correct)

                if (correct) {
                    this.resColor = 'green'
                    if (this.autoplay) {
                        this.setExactTimeout(() => {
                            this.playRandom()
                        }, this.resultDisplayMs, 20)
                    }

                } else {
                    this.resColor = 'indianred'
                }
            },

            setPlayOrder(order){
                this.playOrder = order;
            }
        }
    }
</script>

<style scoped>
</style>
