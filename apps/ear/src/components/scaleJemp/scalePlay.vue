<template>
    <div class="mb-6 mt-6 transport-grid">
        <v-btn color="success" height="52" @click="$emit('playAgain')">
            <v-icon v-if="started" size="24">mdi-replay</v-icon>
            <span v-else>{{ $t('common.start') }}</span>
        </v-btn>
        <v-btn class="button depth-btn" color="error" height="52" :disabled="!started" @click="$emit('playRandomScale')">
            <v-icon size="24">mdi-skip-next</v-icon>
        </v-btn>
    </div>
</template>

<script>
    export default {
        name: "scalePlay",
        props: {
            started: {
                type: Boolean,
                default: false
            }
        }
    }
</script>

<style scoped>
    .transport-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 8px;
        padding:0;
    }
    .depth-btn {
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.28);
        filter: brightness(0.96);
    }
</style>
