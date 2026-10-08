<template>
    <v-app class="app-shell">
        <div v-if="orientationLocked" class="orientation-lock-screen">
            <div class="orientation-lock-card">
                <v-icon size="42" color="primary">mdi-cellphone</v-icon>
                <div class="text-h6 mt-2">{{ $t('app.orientationTitle') }}</div>
                <div class="text-body-2 mt-1">{{ $t('app.orientationText') }}</div>
            </div>
        </div>
        <template v-else>
        <nav class="app-nav">
            <v-toolbar
                    height="5vh"
                    color="primary"
                    class="text-white px-4 app-header"
                    flat
            >
                <v-btn icon variant="text" color="white" class="ml-n2" @click.stop="drawer = !drawer">
                    <v-icon>mdi-menu</v-icon>
                </v-btn>
                <v-toolbar-title class="app-title">
                    <span class="app-title-content">
                        <img src="/earjemp.png" alt="" class="app-title-icon">
                        <span>earJEMP</span>
                    </span>
                </v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon variant="text" color="white" class="mr-n2" :aria-label="$t('app.statistics')" @click.stop="statsDrawer = !statsDrawer">
                    <v-icon>mdi-chart-box-outline</v-icon>
                </v-btn>

            </v-toolbar>

        </nav>
        <v-navigation-drawer
                v-model="drawer"
                color="primary"
                theme="dark"
                absolute
                temporary
        >
            <v-list
                    dense
                    nav
                    class="py-0"
            >
                <v-list-item two-line >
                    <v-list-item-title>{{ $t('app.menu') }}</v-list-item-title>
                </v-list-item>

                <v-list-item
                        v-for="item in items"
                        :key="item.title"
                        :title="item.title"
                        :prepend-icon="item.icon"
                        :to="item.disabled ? undefined : item.path"
                        :disabled="item.disabled"
                        :link="!item.disabled"
                />
                <v-divider class="my-2"></v-divider>
                <v-list-item>
                    <v-list-item-title class="text-caption">{{ $t('app.language') }}</v-list-item-title>
                    <v-btn-toggle
                            v-model="currentLocale"
                            class="mt-2 language-toggle"
                            density="compact"
                            mandatory
                    >
                        <v-btn
                                v-for="locale in locales"
                                :key="locale.value"
                                :value="locale.value"
                                size="small"
                        >
                            {{ locale.label }}
                        </v-btn>
                    </v-btn-toggle>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
        <v-navigation-drawer
                v-model="statsDrawer"
                color="primary"
                theme="dark"
                location="right"
                absolute
                temporary
                width="300"
        >
            <div class="stats-drawer">
                <div class="stats-header">
                    <v-icon>mdi-chart-box-outline</v-icon>
                    <span>{{ $t('stats.title') }}</span>
                </div>

                <div v-if="stats.total === 0" class="stats-empty">
                    {{ $t('stats.noResults') }}
                </div>

                <template v-else>
                    <div class="stats-summary">
                        <v-progress-circular
                                :model-value="overallAccuracy"
                                size="104"
                                width="9"
                                color="white"
                                bg-color="rgba(255,255,255,0.22)"
                        >
                            <span class="stats-percent">{{ overallAccuracy }}%</span>
                        </v-progress-circular>
                        <div class="stats-summary-text">
                            <div>{{ $t('stats.correct') }}: {{ stats.correct }}/{{ stats.total }}</div>
                            <div>{{ $t('stats.accuracy') }}</div>
                        </div>
                    </div>

                    <div class="stats-list">
                        <div
                                v-for="item in exerciseStats"
                                :key="item.key"
                                class="stats-row"
                        >
                            <div class="stats-row-top">
                                <span>{{ item.label }}</span>
                                <span>{{ item.accuracy }}%</span>
                            </div>
                            <v-progress-linear
                                    :model-value="item.accuracy"
                                    height="7"
                                    rounded
                                    color="white"
                                    bg-color="rgba(255,255,255,0.22)"
                            ></v-progress-linear>
                            <div class="stats-row-bottom">
                                {{ item.correct }}/{{ item.total }} {{ $t('stats.attempts') }}
                            </div>
                        </div>
                    </div>
                </template>

                <v-btn
                        variant="outlined"
                        color="white"
                        block
                        class="mt-4"
                        @click="resetStats"
                >
                    {{ $t('stats.reset') }}
                </v-btn>
            </div>
        </v-navigation-drawer>
        <v-overlay :model-value="soundLoading" :opacity="0.82" class="align-center justify-center">
            <v-sheet rounded="lg" elevation="8" class="pa-4" min-width="280">
                <div class="text-subtitle-2 mb-2">{{ $t('app.soundLoad') }}</div>
                <v-progress-linear indeterminate color="primary"></v-progress-linear>
                <div class="text-caption mt-2">{{ soundStatus }}</div>
            </v-sheet>
        </v-overlay>

            <v-main class="overflow-hidden background app-main">
                <router-view @setSoundLoaded="setSoundLoaded" @setSoundStatus="setSoundStatus"></router-view>
            </v-main>

        <v-footer
                color="primary"
                height="5vh"
                class="px-4 d-flex align-center app-footer"
        >
            <span class="text-white">JEMPCompany &copy;</span>
            <v-spacer></v-spacer>
            <span class="mr-2">v.1.0.1</span>
        </v-footer>
        </template>
    </v-app>
</template>

<script>
    import { LOCALES, i18nState, setLocale } from '@/i18n'

    export default {
        name: 'App',

        data: () => ({
            locales: LOCALES,
            drawer: false,
            statsDrawer: false,
            soundLoading: false,
            soundStatus: '',
            orientationLocked: false
        }),
        computed: {
            stats() {
                return this.$store.getters.getStats
            },
            overallAccuracy() {
                return this.accuracyFor(this.stats)
            },
            exerciseStats() {
                const exercises = [
                    { key: 'intervals', label: this.$t('nav.intervals') },
                    { key: 'chords', label: this.$t('nav.chords') },
                    { key: 'inversions', label: this.$t('nav.inversions') },
                    { key: 'scales', label: this.$t('nav.scales') },
                    { key: 'intonation', label: this.$t('nav.intonation') },
                    { key: 'melody', label: this.$t('nav.melody') }
                ]

                return exercises.map((exercise) => {
                    const entry = this.stats.byExercise[exercise.key] || { total: 0, correct: 0 }
                    return {
                        ...exercise,
                        total: entry.total,
                        correct: entry.correct,
                        accuracy: this.accuracyFor(entry)
                    }
                })
            },
            items() {
                return [
                    {path: '/', title: this.$t('nav.home'), icon: 'mdi-home-outline'},
                    {path: '/intervallJemp', title: this.$t('nav.intervals'), icon: 'mdi-view-dashboard'},
                    {path: '/chordJemp', title: this.$t('nav.chords'), icon: 'mdi-format-align-right'},
                    {path: '/inversions', title: this.$t('nav.inversions'), icon: 'mdi-format-rotate-90'},
                    {path: '/scaleJemp', title: this.$t('nav.scales'), icon: 'mdi-chart-line'},
                    {path: '/intonationJemp', title: this.$t('nav.intonation'), icon: 'mdi-tune-vertical'},
                    {path: '/melodyJemp', title: this.$t('nav.melody'), icon: 'mdi-music-note', disabled: true},
                    {path: '/about', title: this.$t('nav.about'), icon: 'mdi-information-outline'},
                    {path: '/impressum', title: this.$t('nav.legal'), icon: 'mdi-file-document-outline'}
                ]
            },
            currentLocale: {
                get() {
                    return i18nState.locale
                },
                set(locale) {
                    setLocale(locale)
                    if (!this.soundLoading) this.soundStatus = this.$t('app.soundLoading')
                }
            }
        },
        mounted() {
            this.soundStatus = this.$t('app.soundLoading')
            this.updateViewportHeight()
            this.updateOrientationLock()
            window.addEventListener('resize', this.updateViewportHeight, { passive: true })
            window.addEventListener('resize', this.updateOrientationLock, { passive: true })
            window.addEventListener('orientationchange', this.updateOrientationLock, { passive: true })
            window.addEventListener('orientationchange', this.updateViewportHeight, { passive: true })
            window.visualViewport?.addEventListener('resize', this.updateViewportHeight, { passive: true })
            this.tryLockPortrait()
        },
        beforeUnmount() {
            window.removeEventListener('resize', this.updateViewportHeight)
            window.removeEventListener('resize', this.updateOrientationLock)
            window.removeEventListener('orientationchange', this.updateOrientationLock)
            window.removeEventListener('orientationchange', this.updateViewportHeight)
            window.visualViewport?.removeEventListener('resize', this.updateViewportHeight)
        },
        methods:{
            setSoundLoaded(loading){
                this.soundLoading = loading
            },
            setSoundStatus(status){
                this.soundStatus = status
            },
            accuracyFor(entry) {
                if (!entry || !entry.total) return 0
                return Math.round((entry.correct / entry.total) * 100)
            },
            resetStats() {
                this.$store.dispatch('resetStats')
            },
            updateViewportHeight() {
                if (typeof window === 'undefined') return
                const height = window.visualViewport?.height || window.innerHeight
                const chromeHeight = Math.max(44, Math.round(height * 0.06))
                document.documentElement.style.setProperty('--app-height', `${height}px`)
                document.documentElement.style.setProperty('--app-chrome-height', `${chromeHeight}px`)
                document.documentElement.style.setProperty('--app-main-height', `${height - (chromeHeight * 2)}px`)
            },
            updateOrientationLock() {
                if (typeof window === 'undefined') return
                const isLandscape = window.innerWidth > window.innerHeight
                const isSmallScreen = window.innerWidth <= 1024
                this.orientationLocked = isSmallScreen && isLandscape
            },
            async tryLockPortrait() {
                try {
                    if (screen?.orientation?.lock) {
                        await screen.orientation.lock('portrait')
                    }
                } catch (e) {
                    // Ignored: many browsers restrict orientation lock.
                }
            }
        }
    };
</script>
<style>
    :root {
        --app-height: 100vh;
        --app-chrome-height: 6vh;
        --app-main-height: 88vh;
        --app-main-vertical-gap: 10px;
    }
    html,
    body {
        height: var(--app-height);
        overflow: hidden;
        overscroll-behavior: none;
        touch-action: manipulation;
    }
    body {
        position: fixed;
        inset: 0;
        width: 100%;
    }
    #app {
        height: var(--app-height);
        overflow: hidden;
    }
    .button {
        text-transform: none !important;
    }
    .background{
        background-image: url("../pics/webb.png");
        background-repeat: repeat;
    }
    .app-shell {
        height: var(--app-height);
        overflow: hidden;
        overscroll-behavior: none;
    }
    .app-nav,
    .app-header,
    .app-footer {
        height: var(--app-chrome-height) !important;
        min-height: var(--app-chrome-height) !important;
    }
    .app-main {
        height: var(--app-main-height) !important;
        min-height: var(--app-main-height) !important;
        box-sizing: border-box;
        padding: var(--app-main-vertical-gap) 0;
        overflow: hidden !important;
        overscroll-behavior: none;
    }
    .app-title {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        pointer-events: none;
        margin-inline: 0 !important;
        width: 100%;
    }
    .app-title-content {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }
    .app-title-icon {
        width: 24px;
        height: 24px;
        object-fit: contain;
        filter: brightness(0) invert(1);
        transform: translateY(2px);
    }
    .stats-drawer {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 16px;
    }
    .stats-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.2;
        margin-bottom: 18px;
    }
    .stats-empty {
        color: rgba(255, 255, 255, 0.78);
        font-size: 0.92rem;
        line-height: 1.35;
        margin-top: 8px;
    }
    .stats-summary {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
    }
    .stats-percent {
        font-size: 1.1rem;
        font-weight: 800;
    }
    .stats-summary-text {
        color: rgba(255, 255, 255, 0.88);
        font-size: 0.85rem;
        line-height: 1.45;
    }
    .stats-list {
        display: flex;
        flex-direction: column;
        gap: 13px;
    }
    .stats-row {
        color: white;
    }
    .stats-row-top,
    .stats-row-bottom {
        display: flex;
        justify-content: space-between;
        gap: 8px;
    }
    .stats-row-top {
        font-size: 0.88rem;
        font-weight: 700;
        line-height: 1.2;
        margin-bottom: 5px;
    }
    .stats-row-bottom {
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.74rem;
        line-height: 1.2;
        margin-top: 4px;
    }
    .language-toggle .v-btn {
        text-transform: none !important;
    }
    .orientation-lock-screen {
        position: fixed;
        inset: 0;
        z-index: 3000;
        background: #eceff1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
    }
    .orientation-lock-card {
        background: #fff;
        border-radius: 12px;
        padding: 20px 18px;
        text-align: center;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        max-width: 320px;
        width: 100%;
    }
</style>
