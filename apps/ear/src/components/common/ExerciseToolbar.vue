<template>
    <div class="exercise-toolbar">
        <v-menu location="bottom start" :close-on-content-click="false">
            <template #activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    size="large"
                    color="primary"
                    prepend-icon="mdi-tune-variant"
                    class="toolbar-btn"
                >
                    {{ $t('app.level') }}
                </v-btn>
            </template>
            <v-card min-width="220" class="pa-2">
                <slot name="level"></slot>
            </v-card>
        </v-menu>

        <v-menu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    size="large"
                    color="primary"
                    prepend-icon="mdi-cog"
                    class="toolbar-btn"
                >
                    {{ $t('common.options') }}
                </v-btn>
            </template>
            <v-card min-width="220" class="pa-2">
                <slot name="options"></slot>
            </v-card>
        </v-menu>
    </div>
</template>

<script>
    export default {
        name: 'ExerciseToolbar'
    }
</script>

<style scoped>
    .exercise-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 48px;
    }
    .toolbar-btn {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: none;
    }
</style>
