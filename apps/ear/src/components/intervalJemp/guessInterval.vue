<template>
    <div class="answer-grid">
        <v-btn :key="index" @click="$emit('guessResult', item.text)" class="btn depth-btn" color="primary" v-for="(item, index) in orderedList" size="x-large">{{ intervalTitle(item) }}
        </v-btn>
    </div>
</template>

<script>

    import {mapGetters} from "vuex";
    import _ from 'lodash';

    export default {
        name: "guessInterval",
        computed:{
            ...mapGetters(['getSelectedIntervals']),
            orderedList: function(){
                return _.orderBy(this.getSelectedIntervals, 'value')
            }
        },
        methods: {
            intervalTitle(item) {
                return item && item.labelKey ? this.$t(item.labelKey) : item.text
            }
        }
    }
</script>

<style scoped>
    .btn{
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
