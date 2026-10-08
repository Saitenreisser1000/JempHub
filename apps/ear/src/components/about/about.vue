<template>
    <v-container class="about-page">
        <v-sheet class="about-panel pa-5" elevation="2">
            <div class="about-heading mb-4">
                <h1 class="text-h5 mb-0">{{ $t('about.title') }}</h1>
                <img src="/earjemp.png" alt="earJEMP" class="about-icon">
                <h1 class="about-brand text-h5 mb-0">earJEMP</h1>
            </div>
            <p class="text-body-1 mb-3">
                {{ $t('about.p1') }}
            </p>
            <p class="text-body-1 mb-3">
                {{ $t('about.p2') }}
            </p>
            <p class="text-body-1 mb-0">
                {{ $t('about.p3') }}
            </p>
            <p class="about-contact text-caption mt-5 mb-0">
                JEMPCompany &copy;, 2026 · office@jemphub.com
            </p>
        </v-sheet>
    </v-container>
</template>

<script>
    export default {
        name: 'about'
    }
</script>

<style scoped>
    .about-page {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
    }

    .about-panel {
        width: 100%;
        max-width: 420px;
        border-radius: 8px;
    }

    .about-heading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
    }

    .about-brand {
        margin-left: -14px;
    }

    .about-icon {
        width: 36px;
        height: 36px;
        object-fit: contain;
        display: block;
        border: 0;
        background: transparent;
        box-shadow: none;
        clip-path: inset(2px);
        transform: translateY(3px) scale(1.08);
        transform-origin: center;
    }

    .about-contact {
        border-top: 1px solid rgba(0, 0, 0, 0.24);
        padding-top: 10px;
        font-size: 0.72rem !important;
        line-height: 1.2;
        text-align: center;
        white-space: nowrap;
    }
</style>
