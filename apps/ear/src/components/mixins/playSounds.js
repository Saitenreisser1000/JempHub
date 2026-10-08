import {Howl, Howler} from 'howler'
import howlMp3 from '@/assets/sounds/newAudio.mp3'
import soundSprite from '@/assets/sounds/newAudio.json'

Howler.autoSuspend = false

let sharedSounds = null
let sharedSoundLoadPromise = null
let sharedSoundLoadTimeoutId = null
let sharedSoundLoadRetries = 0
const maxSoundLoadRetries = 1
let sharedResolveSoundLoad = null
let sharedRejectSoundLoad = null
let sharedAudioRecoveryListenersBound = false

function createSharedSounds() {
    return new Howl({
        "src": [
            howlMp3
        ],
        preload: true,
        buffer: true,
        "sprite": soundSprite.sprite
    })
}

function getSharedSounds() {
    return sharedSounds || (sharedSounds = createSharedSounds())
}

function resumeHowlerAudioContext() {
    if (typeof Howler._autoResume === 'function') {
        Howler._autoResume()
    }

    const ctx = Howler.ctx
    if (!ctx || ctx.state === 'running' || typeof ctx.resume !== 'function') {
        return Promise.resolve()
    }
    return ctx.resume().catch(() => {})
}

export function warmupSounds() {
    const sounds = getSharedSounds()
    if (sounds.state() === 'unloaded') {
        sounds.load()
    }
    return resumeHowlerAudioContext()
}

export default {
    data(){
        return{
            sounds : getSharedSounds(),
        }
    },

    mounted() {
        this.bindAudioRecoveryListeners()
        this.ensureSoundsLoaded(true, true).catch(() => {})
    },

    methods: {
        bindAudioRecoveryListeners() {
            if (sharedAudioRecoveryListenersBound || typeof window === 'undefined') return
            sharedAudioRecoveryListenersBound = true

            const wakeAudio = () => resumeHowlerAudioContext()

            window.addEventListener('pageshow', wakeAudio, { passive: true })
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) wakeAudio()
            }, { passive: true })
            window.addEventListener('pointerdown', wakeAudio, { passive: true })
            window.addEventListener('touchstart', wakeAudio, { passive: true })
            window.addEventListener('touchend', wakeAudio, { passive: true })
            window.addEventListener('keydown', wakeAudio, { passive: true })
        },

        ensureAudioContextRunning() {
            return resumeHowlerAudioContext()
        },

        resetSharedSoundLoadState() {
            if (sharedSoundLoadTimeoutId) {
                clearTimeout(sharedSoundLoadTimeoutId)
                sharedSoundLoadTimeoutId = null
            }
            sharedSoundLoadPromise = null
            sharedResolveSoundLoad = null
            sharedRejectSoundLoad = null
        },

        recreateSounds() {
            this.resetSharedSoundLoadState()
            if (sharedSounds) {
                sharedSounds.off()
                sharedSounds.unload()
            }
            sharedSounds = createSharedSounds()
            this.sounds = sharedSounds
            return this.ensureSoundsLoaded(true)
        },

        ensureSoundsLoaded(isWarmup = false, silent = false) {
            if (this.sounds.state() === 'loaded') {
                return Promise.resolve()
            }

            if (sharedSoundLoadPromise) {
                return sharedSoundLoadPromise
            }

            if (!silent) {
                this.$emit('setSoundStatus', isWarmup ? this.$t('app.soundPreparing') : this.$t('app.soundLoading'))
                this.$emit('setSoundLoaded', true)
            }

            sharedSoundLoadPromise = new Promise((resolve, reject) => {
                sharedResolveSoundLoad = resolve
                sharedRejectSoundLoad = reject
            })

            sharedSoundLoadTimeoutId = setTimeout(() => {
                this.handleSoundLoadFailure(new Error('sound load timeout'), silent)
            }, 12000)

            this.sounds.once('load', () => {
                this.handleSoundLoaded(silent)
            })
            this.sounds.once('loaderror', (_id, error) => {
                this.handleSoundLoadFailure(error, silent)
            })
            this.sounds.load()
            return sharedSoundLoadPromise
        },

        handleSoundLoaded(silent = false) {
            if (sharedSoundLoadTimeoutId) {
                clearTimeout(sharedSoundLoadTimeoutId)
                sharedSoundLoadTimeoutId = null
            }
            sharedSoundLoadRetries = 0
            if (!silent) {
                this.$emit('setSoundStatus', this.$t('app.soundReady'))
                this.$emit('setSoundLoaded', false)
            }

            if (sharedResolveSoundLoad) {
                sharedResolveSoundLoad()
            }

            sharedSoundLoadPromise = null
            sharedResolveSoundLoad = null
            sharedRejectSoundLoad = null
        },

        handleSoundLoadFailure(error, silent = false) {
            if (sharedSoundLoadTimeoutId) {
                clearTimeout(sharedSoundLoadTimeoutId)
                sharedSoundLoadTimeoutId = null
            }

            if (sharedSoundLoadRetries < maxSoundLoadRetries) {
                sharedSoundLoadRetries += 1
                if (!silent) {
                    this.$emit('setSoundStatus', this.$t('app.soundSlow'))
                }
                sharedSoundLoadTimeoutId = setTimeout(() => {
                    this.handleSoundLoadFailure(new Error('sound load timeout'), silent)
                }, 12000)
                this.sounds.load()
                return
            }

            if (!silent) {
                this.$emit('setSoundStatus', this.$t('app.soundFailed'))
                this.$emit('setSoundLoaded', false)
            }

            if (sharedRejectSoundLoad) {
                sharedRejectSoundLoad(error)
            }

            sharedSoundLoadPromise = null
            sharedResolveSoundLoad = null
            sharedRejectSoundLoad = null
        },

        playAudio(tone, options = {}) {
            this.ensureAudioContextRunning()
            this.ensureSoundsLoaded()
                .then(() => this.ensureAudioContextRunning())
                .then(() => this.playLoadedAudio(tone, true, options))
                .catch(() => {
                    this.recreateSounds()
                        .then(() => this.ensureAudioContextRunning())
                        .then(() => this.playLoadedAudio(tone, true, options))
                        .catch(() => {})
                })
        },

        playLoadedAudio(tone, retry = true, options = {}) {
            const playId = this.sounds.play(tone)

            if (playId === null || typeof playId === 'undefined') {
                if (!retry) return
                this.recreateSounds()
                    .then(() => this.ensureAudioContextRunning())
                    .then(() => this.playLoadedAudio(tone, false, options))
                    .catch(() => {})
                return
            }

            this.sounds.once('playerror', (id) => {
                if (id !== playId || !retry) return
                this.ensureAudioContextRunning()
                    .then(() => this.playLoadedAudio(tone, false, options))
                    .catch(() => {})
            })

            if (options.rate) {
                this.sounds.rate(options.rate, playId)
            }
            this.sounds.volume(1, playId)
            this.sounds.fade(1, 0, options.fadeMs || 1200, playId)

            if (this.playSecond) {
                this.playSecond()
            }
        },

        playAgain(){
            if (this.firstTone === '') {
                this.playRandom()
            } else {
                this.playTones()
            }
        }
    }
}
