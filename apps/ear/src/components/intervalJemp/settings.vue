<template>
    <div>
        <br>

        <v-btn-toggle
                class="text-white"
                v-model="chooseOrder"
                dense
                active-class="primary"
                background-color="secondary"
                multiple
                mandatory
        >

            <v-btn value="increase">
                <span>up</span>
            </v-btn>

            <v-btn value="decrease">
                <span>down</span>
            </v-btn>

            <v-btn value="simultaneous">
                <span>=</span>
            </v-btn>

        </v-btn-toggle>
        <br>
        <br>
        <interval-choose></interval-choose>
    </div>
</template>

<script>
    import {mapActions} from "vuex";
    import IntervalChoose from "@/components/intervalJemp/intervalSettings";

    export default {
        name: "settings",
        components: {IntervalChoose},
        data() {
            return{
                chooseOrder: 'increase'
            }
        },
        methods: {
            ...mapActions(['setIntervalDirection']),
        },
        watch:{
            chooseOrder:{
                immediate: true,
                handler(){
                    this.setIntervalDirection(this.chooseOrder)
                },
            }
        },
    }
</script>

<style scoped>

    .v-btn{
        text-transform: none !important;
    }

</style>
