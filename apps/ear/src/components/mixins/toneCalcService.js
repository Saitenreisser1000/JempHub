import {
    getDescendingInterval as domainGetDescendingInterval,
    getInterval as domainGetInterval,
    getScale as domainGetScale,
    reduceToneList as domainReduceToneList,
    switchToneByNotation
} from "@/domain/pitch/toneEngine";

export default {
    methods: {

        reduceToneList(reduceAmount){
            return domainReduceToneList(this.getToneChain, reduceAmount);
        },

        //switch Tone if first = b second = #
        //switch Tone linedistance doesn't match
        switchTone(first, second, lineDist) {
            return switchToneByNotation(this.getToneChain, first, second, lineDist);
        },

        getInterval(tone, intervalSteps, lineDist) {
            return domainGetInterval(this.getToneChain, tone, intervalSteps, lineDist);
        },

        getDescendingInterval(tone, intervalSteps, lineDist) {
            return domainGetDescendingInterval(this.getToneChain, tone, intervalSteps, lineDist);
        },

        //random takes {min:'' , max:''} object
        randomRangeInt(range){
            let min = Math.ceil(range.min);
            let max = Math.floor(range.max);
            return Math.floor(Math.random() * (max - min)) + min;
        },

        getScale(rootTone, scale){
            return domainGetScale(this.getToneChain, rootTone, scale)
        },

        //helperfunction for timeaccuracy
        setExactTimeout(callback, duration, resolution = 20) {
          const start = (new Date()).getTime();
          const timeout = setInterval(function(){
            if ((new Date()).getTime() - start > duration) {
              callback();
              clearInterval(timeout);
            }
          }, resolution);
          return timeout;
        },

        logger(toLog){
            console.log(toLog)
        }
    }
}
