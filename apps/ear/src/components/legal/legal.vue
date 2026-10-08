<template>
    <v-container class="legal-page">
        <v-sheet class="legal-panel pa-5" elevation="2">
            <h1 class="text-h5 mb-5">{{ $t('legal.title') }}</h1>

            <section class="legal-section">
                <h2 class="text-subtitle-2 mb-1">{{ $t('legal.ownerLabel') }}</h2>
                <p class="text-body-2 mb-0">{{ $t('legal.owner') }}</p>
            </section>

            <section class="legal-section">
                <h2 class="text-subtitle-2 mb-1">{{ $t('legal.contactLabel') }}</h2>
                <p class="text-body-2 mb-0">office@jemphub.com</p>
            </section>

            <section class="legal-section">
                <h2 class="text-subtitle-2 mb-1">{{ $t('legal.websiteLabel') }}</h2>
                <p class="text-body-2 mb-0">earjemp.jemphub.com</p>
            </section>

            <section class="legal-section mb-0">
                <h2 class="text-subtitle-2 mb-1">{{ $t('legal.directionLabel') }}</h2>
                <p class="text-body-2 mb-0">{{ $t('legal.direction') }}</p>
            </section>
        </v-sheet>
    </v-container>
</template>

<script>
    export default {
        name: 'legal'
    }
</script>

<style scoped>
    .legal-page {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
    }

    .legal-panel {
        width: 100%;
        max-width: 420px;
        border-radius: 8px;
    }

    .legal-section {
        margin-bottom: 16px;
    }
</style>
