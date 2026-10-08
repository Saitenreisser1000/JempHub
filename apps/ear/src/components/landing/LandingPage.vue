<template>
    <div class="landing-page">
        <section class="landing-hero">
            <div class="hero-media" aria-hidden="true">
                <img src="/earjemp.png" alt="">
            </div>
            <div class="hero-content">
                <div class="hero-kicker">{{ $t('landing.kicker') }}</div>
                <h1>earJEMP</h1>
                <p>{{ $t('landing.copy') }}</p>
                <div class="hero-actions">
                    <v-btn color="primary" size="large" class="depth-btn" :to="startTrainingPath">
                        <v-icon size="22">mdi-play</v-icon>
                        <span>{{ $t('landing.start') }}</span>
                    </v-btn>
                </div>
            </div>
        </section>

        <section class="landing-section">
            <div class="section-heading">
                <h2>{{ $t('landing.trainTitle') }}</h2>
                <p>{{ $t('landing.trainCopy') }}</p>
            </div>
            <div class="exercise-grid">
                <router-link
                    v-for="item in exerciseLinks"
                    :key="item.path"
                    :to="item.path"
                    class="exercise-link"
                >
                    <v-icon size="30">{{ item.icon }}</v-icon>
                    <span>{{ item.title }}</span>
                </router-link>
            </div>
        </section>
    </div>
</template>

<script>
    import { DEFAULT_TRAINING_ROUTE, loadLastTrainingRoute } from '@/domain/navigation/lastTrainingRoute'

    export default {
        name: 'LandingPage',
        computed: {
            startTrainingPath() {
                return loadLastTrainingRoute() || DEFAULT_TRAINING_ROUTE
            },
            exerciseLinks() {
                return [
                    { path: '/intervallJemp', title: this.$t('nav.intervals'), icon: 'mdi-view-dashboard' },
                    { path: '/intonationJemp', title: this.$t('nav.intonation'), icon: 'mdi-tune-vertical' },
                    { path: '/chordJemp', title: this.$t('nav.chords'), icon: 'mdi-format-align-right' },
                    { path: '/inversions', title: this.$t('nav.inversions'), icon: 'mdi-format-rotate-90' },
                    { path: '/scaleJemp', title: this.$t('nav.scales'), icon: 'mdi-chart-line' }
                ]
            }
        }
    }
</script>

<style scoped>
    .landing-page {
        height: 100%;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        color: rgba(0, 0, 0, 0.84);
    }
    .landing-hero {
        min-height: min(430px, calc(var(--app-main-height) - 42px));
        position: relative;
        display: flex;
        align-items: center;
        padding: 34px 18px 42px;
        overflow: hidden;
        background: #eef3f6;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .hero-media {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        opacity: 0.12;
        pointer-events: none;
    }
    .hero-media img {
        width: min(520px, 92vw);
        height: auto;
        transform: translateX(20%) rotate(-4deg);
        filter: saturate(0.8);
    }
    .hero-content {
        position: relative;
        z-index: 1;
        width: min(560px, 100%);
        margin: 0 auto;
    }
    .hero-kicker {
        color: #1976d2;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0;
        margin-bottom: 8px;
        text-transform: uppercase;
    }
    h1 {
        font-size: clamp(2.6rem, 4.5rem, 4.5rem);
        font-weight: 900;
        line-height: 0.95;
        letter-spacing: 0;
        margin: 0;
    }
    .hero-content p {
        font-size: 1.02rem;
        font-weight: 600;
        line-height: 1.45;
        margin: 16px 0 22px;
        max-width: 30rem;
    }
    .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }
    .hero-actions :deep(.v-btn__content) {
        gap: 7px;
    }
    .landing-section {
        background: rgba(255, 255, 255, 0.72);
        padding: 20px 14px 28px;
    }
    .section-heading {
        width: min(620px, 100%);
        margin: 0 auto 14px;
    }
    .section-heading h2 {
        font-size: 1.25rem;
        font-weight: 850;
        line-height: 1.15;
        margin: 0 0 5px;
        letter-spacing: 0;
    }
    .section-heading p {
        color: rgba(0, 0, 0, 0.66);
        font-size: 0.88rem;
        font-weight: 600;
        line-height: 1.35;
        margin: 0;
    }
    .exercise-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        width: min(620px, 100%);
        margin: 0 auto;
    }
    .exercise-link {
        align-items: center;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(25, 118, 210, 0.18);
        border-radius: 8px;
        color: #1565c0;
        display: flex;
        gap: 10px;
        min-height: 64px;
        padding: 12px;
        text-decoration: none;
        font-size: 0.95rem;
        font-weight: 800;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }
    .exercise-link:first-child {
        grid-column: span 2;
    }
    .depth-btn {
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.28);
        text-transform: none !important;
    }
    @media (min-width: 720px) {
        .landing-hero {
            padding-inline: 40px;
        }
        .exercise-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .exercise-link,
        .exercise-link:first-child {
            grid-column: auto;
            flex-direction: column;
            justify-content: center;
            text-align: center;
        }
    }
</style>
