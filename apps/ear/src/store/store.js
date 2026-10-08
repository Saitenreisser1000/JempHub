import { createStore } from 'vuex'
import { TONE_CHAIN } from '@/domain/music/toneChain'

const STATS_STORAGE_KEY = 'earjemp-stats'
const EXERCISE_KEYS = ['intervals', 'chords', 'inversions', 'scales', 'intonation', 'melody']

function createEmptyStats() {
    const byExercise = {}
    for (const key of EXERCISE_KEYS) {
        byExercise[key] = { total: 0, correct: 0 }
    }
    return { total: 0, correct: 0, byExercise }
}

function normalizeStats(stats) {
    const normalized = createEmptyStats()
    if (!stats || typeof stats !== 'object') return normalized

    normalized.total = Number(stats.total) || 0
    normalized.correct = Number(stats.correct) || 0

    for (const key of EXERCISE_KEYS) {
        const entry = stats.byExercise && stats.byExercise[key]
        normalized.byExercise[key] = {
            total: Number(entry && entry.total) || 0,
            correct: Number(entry && entry.correct) || 0
        }
    }

    return normalized
}

function loadStats() {
    if (typeof localStorage === 'undefined') return createEmptyStats()
    try {
        return normalizeStats(JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)))
    } catch (e) {
        return createEmptyStats()
    }
}

function saveStats(stats) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats))
}

export const store = createStore({
    state: {

        intervalNames: [
            'perfect unison | reine Prim',
            'minor 2 | kleine Sekund',
            'major 2 | große Sekund',
            'minor 3 | kleine Terz',
            'major 3 | große Terz',
            'perfect 4 | reine Quart',
            'dim 5 | verminderte Quint',
            'perfect 5 | reine Quint',
            'minor 6 | kleine Sext',
            'major 6 | große Sext',
            'minor 7 | kleine Septim',
            'major 7 | große Septim',
            'perfect 8 | reine Oktave',
            'minor 9 | kleine None',
            'major 9 | große None'
        ],

        toneChain: TONE_CHAIN,

        intervalDirection: '',
        firstTone: '',
        secondTone: '',

        selectedIntervals: [],
        selectedChords: [],
        selectedScales: [],
        stats: loadStats()

    },

    mutations: {

        setSelectIntervals(state, intervals) {
            state.selectedIntervals = intervals
        },

        setIntervalDirection(state, direction) {
            state.intervalDirection = direction
        },

        setSelectedChords(state, chords) {
            state.selectedChords = chords
        },

        setSelectedScales(state, scales) {
            state.selectedScales = scales
        },

        recordExerciseResult(state, { exercise, correct }) {
            if (!state.stats.byExercise[exercise]) {
                state.stats.byExercise[exercise] = { total: 0, correct: 0 }
            }

            state.stats.total += 1
            state.stats.byExercise[exercise].total += 1

            if (correct) {
                state.stats.correct += 1
                state.stats.byExercise[exercise].correct += 1
            }

            saveStats(state.stats)
        },

        resetStats(state) {
            state.stats = createEmptyStats()
            saveStats(state.stats)
        }
    },

    actions: {
        setSelectedIntervals: ({commit}, intervals) => {
            commit('setSelectIntervals', intervals)
        },
        setIntervalDirection: ({commit}, payload) => {
            commit('setIntervalDirection', payload)
        },
        setSelectedChords: ({commit}, payload) => {
            commit('setSelectedChords', payload)
        },
        setSelectedScales: ({commit}, payload) => {
            commit('setSelectedScales', payload)
        },
        recordExerciseResult: ({commit}, payload) => {
            commit('recordExerciseResult', payload)
        },
        resetStats: ({commit}) => {
            commit('resetStats')
        }
    },

    getters: {
        getToneChain: (state) => {
            return state.toneChain
        },
        getSelectedIntervals: (state) => {
            return state.selectedIntervals
        },
        getSelectedChords: (state) => {
            return state.selectedChords
        },
        getSelectedScales: (state) => {
            return state.selectedScales
        },
        getStats: (state) => {
            return state.stats
        },

    }
});
