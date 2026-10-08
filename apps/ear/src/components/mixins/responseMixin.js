export default {
    methods:{
        resetResponse(){
            this.resColor = '#9DA0A9'
        },

        setInputlock(locked){
            this.lockInput = locked
        },

        setResult(res) {
            this.result = res
        },

        recordExerciseResult(exercise, correct) {
            this.$store.dispatch('recordExerciseResult', {
                exercise,
                correct: Boolean(correct)
            })
        },
    }
}
