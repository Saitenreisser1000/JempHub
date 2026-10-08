<template>
    <div>
        <v-btn :key="index" @click="guessInterval(int.value)" class="mb-2 mr-2" color="primary" v-for="(int, index) in getSelectedIntervals" size="x-large">{{int.text}}
        </v-btn>
    </div>
</template>

<script>
    import {mapGetters, mapActions} from 'vuex'

    export default {
        name: "intervalInput",
        computed: {
            ...mapGetters('store', ['getSelectedIntervals']),
        },

        methods: {
            ...mapActions('store', ['setGuess']),

            guessInterval(value){
                this.setGuess(value);
            },
        }
    }
</script>

<style scoped>
    .v-btn{
        text-transform: none !important;
    }


</style>
