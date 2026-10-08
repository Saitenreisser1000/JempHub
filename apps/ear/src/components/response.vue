<template>
    <div style="width:100%; height: 30px" :style="{backgroundColor:respColor}">
        <v-icon v-if="getState === 1" style="left: 45%; margin-top: 2px">mdi-check-circle-outline</v-icon>
        <v-icon v-if="getState === 2" style="left: 45%; margin-top: 2px">mdi-close-circle-outline</v-icon>
    </div>
</template>

<script>
    export default {
        name: "response",
        props: {
            respColor: {
                default: '#9DA0A9'
            }
        },
        data(){
            return{
                state:''
            }
        },
        computed:{
            getState(){
                if(this.respColor === 'green'){
                    return 1
                }
                if(this.respColor === 'indianred'){
                    return 2
                }
                return 0
            }
        }
	}
</script>

<style scoped>

</style>
