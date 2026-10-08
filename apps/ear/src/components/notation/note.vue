<template>
    <div>
        <img :style="{top:`${yPos}%`, left:`${xPos}%`}" class=note height="6%" src="/notes/wholeNote.svg">
        <img v-if="accidental === 's'" :style="{top:`${yPos-3}%`, left:`${xPos-8-colOffset}%`}" src="/notes/sharp.png" class=accidental height="12%"/>
        <img v-if="accidental === 'b'" :style="{top:`${yPos-7}%`, left:`${xPos-16-colOffset}%`}" src="/notes/b.png" class=accidental height="14%"/>
    </div>
</template>

<script>

export default {
  props: {
    xPos: Number,
    yPos: Number,
    accidental: String,
    colOffset:{
      type: Number,
      default: 0}
      },
}
</script>

<style>

</style>
