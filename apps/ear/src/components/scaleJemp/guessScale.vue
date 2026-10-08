<template>
    <div class="answer-grid">
        <v-btn :key="index" @click="$emit('guessResult', item.text)" class="btn depth-btn" color="primary" v-for="(item, index) in getSelectedScales" size="x-large">{{ scaleTitle(item) }}
        </v-btn>
    </div>
</template>

<script>
    import {mapGetters} from "vuex";

    export default {
        name: "guessScale",
        props: {
            difficulty: {
                type: String,
                default: 'scale1'
            }
        },
        computed:{
            ...mapGetters(['getSelectedScales'])
        },
        methods: {
            scaleTitle(item) {
                if ((this.difficulty === 'scale1' || this.difficulty === 'scale2') && item && item.value === 1) {
                    return this.$t('scales.major')
                }
                if ((this.difficulty === 'scale1' || this.difficulty === 'scale2') && item && item.value === 6) {
                    return this.$t('scales.minor')
                }
                return item && item.labelKey ? this.$t(item.labelKey) : item.text
            }
        }
    }
</script>

<style scoped>
    .btn {
        height: 50px;
        font-size: 10px;
        text-transform: none !important;
    }
    .answer-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
    .depth-btn {
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.28);
        filter: brightness(0.96);
    }
</style>
