<template>
    <v-card class="pa-2 mx-auto bg-blue-grey-lighten-5 exercise-card" max-width="350" elevation="10">
        <v-card
            class="mx-auto bg-blue-grey-lighten-5 d-flex flex-column ga-2 exercise-card-body"
            max-width="350"
            :disabled="disabled"
            flat
        >
            <div class="intro-copy">
                <slot name="intro"></slot>
            </div>
            <div v-if="$slots.controls" class="exercise-controls">
                <slot name="controls"></slot>
            </div>
            <div
                v-if="$slots.staff || $slots.transport"
                class="exercise-section exercise-play-area"
            >
                <div v-if="$slots.staff" class="exercise-staff">
                    <slot name="staff"></slot>
                </div>
                <div v-if="$slots.transport" class="exercise-transport">
                    <slot name="transport"></slot>
                </div>
            </div>
            <div v-if="$slots.answers" class="exercise-section exercise-answers">
                <slot name="answers"></slot>
            </div>
            <slot></slot>
        </v-card>
    </v-card>
</template>

<script>
    export default {
        name: 'ExerciseCard',
        props: {
            disabled: {
                type: Boolean,
                default: false
            },
        }
    }
</script>

<style scoped>
    .exercise-card {
        max-height: calc(var(--app-main-height) - (var(--app-main-vertical-gap) * 2));
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    }
    .exercise-card-body {
        min-height: min(550px, calc(var(--app-main-height) - (var(--app-main-vertical-gap) * 2) - 16px));
    }
    .intro-copy {
        color: rgba(0, 0, 0, 0.78);
        font-size: 1.22rem;
        font-weight: 700;
        line-height: 1.2;
        padding: 4px 4px 6px;
        text-align: center;
    }
    .exercise-section {
        border-radius: 8px;
    }
    .exercise-controls {
        display: block;
    }
    .exercise-play-area {
        background: rgba(255, 255, 255, 0.44);
        height: 248px;
        overflow: hidden;
        padding: 0 0 2px;
    }
    .exercise-transport {
        padding: 0 2px;
        text-align: center;
    }
    .exercise-answers {
        background: rgba(255, 255, 255, 0.36);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        padding: 8px 0 0;
        text-align: center;
    }
</style>
