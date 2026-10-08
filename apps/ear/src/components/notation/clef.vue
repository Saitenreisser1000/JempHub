<template>
<div>
    <img class=clef v-if="cleftype === 'treble'" height="40%" style="top:12%" src="/clefs/clef.svg">
    <img class=clef v-if="cleftype === 'bass'" height="22%" style="top:53.8%" src="/clefs/bass-clef.svg">
</div>
    
</template>

<script>
export default {
    props: ['cleftype', 'yPos']
}
</script>

<style>
    .clef{
        position:absolute;
    }
</style>