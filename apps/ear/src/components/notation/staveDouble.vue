<template>
  <div>
    <div class="stave" style="width:50%; height: 200px;">

      <clef :cleftype="'treble'" :yPos="50"></clef>
      <clef :cleftype="'bass' " :yPos="100"></clef>

      <note :key="index" v-for="(n, index) in activeNotes(testFirstPos,testSecondPos)" :xPos=n.xPos :yPos=n.yPos :accidental="n.accidental" :colOffset="n.colOffset"></note>

      <svg width='100%' height=100%>

        <!--barlines-->
        <!--left------>
        <line x1="0%" y1="20%" x2="0%" y2="80%" style="stroke:rgb(0,0,0);stroke-width:1"/>

        <!--right----->
        <line x1="100%" y1="20%" x2="100%" y2="44%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="100%" y1="56%" x2="100%" y2="80%" style="stroke:rgb(0,0,0);stroke-width:1"/>

        <!--helpers--->
        <line x1="19.8%" y1="8%" x2="22.4%" y2="8%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="20%" y1="14%" x2="22%" y2="14%" style="stroke:rgb(0,0,0);stroke-width:1"/>

        <!--treble---->
        <line x1="0" y1="19.5%" x2="100%" y2="19.5%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="25.75%" x2="100%" y2="25.75%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="32%" x2="100%" y2="32%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="38.25%" x2="100%" y2="38.25%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="44.5%" x2="100%" y2="44.5%" style="stroke:rgb(0,0,0);stroke-width:1"/>

        <!--line x1="20%" y1="50%" x2="22%" y2="50%" style="stroke:rgb(0,0,0);stroke-width:1"/-->

        <!--bass----->
        <line x1="0" y1="56%" x2="100%" y2="56%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="62%" x2="100%" y2="62%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="68%" x2="100%" y2="68%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="74%" x2="100%" y2="74%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="0" y1="80%" x2="100%" y2="80%" style="stroke:rgb(0,0,0);stroke-width:1"/>

        <!--line x1="20%" y1="86%" x2="22%" y2="86%" style="stroke:rgb(0,0,0);stroke-width:1"/>
        <line x1="20%" y1="92%" x2="22%" y2="92%" style="stroke:rgb(0,0,0);stroke-width:1"/-->
      </svg>
    </div>

  </div>
</template>

<script>
  import note from '@/components/notation/note'
  import clef from '@/components/notation/clef'

  export default {
    components: {note, clef},
    data() {
      return {
        noteXPos: [
            {id:0,  yPos:  1.4},
            {id:1,  yPos:  4.4},
            {id:2,  yPos:  7.4},
            {id:3,  yPos: 10.4},
            {id:4,  yPos: 13.4},
            {id:5,  yPos: 16.4},
            {id:6,  yPos: 19.6},
            {id:7,  yPos: 22.7},
            {id:8,  yPos: 25.9},
            {id:9,  yPos: 29 },
            {id:10, yPos: 32.1},
            {id:11, yPos: 35.2},
            {id:12, yPos: 38.4},
            {id:13, yPos: 41.4},
            {id:14, yPos: 44.4},
            {id:15, yPos: 47.2}, //C1
            {id:16, yPos: 50.2},
            {id:17, yPos: 53.1},
            {id:18, yPos: 56.1},
            {id:19, yPos: 59.1},
            {id:20, yPos: 62.2},
            {id:21, yPos: 65.1},
            {id:22, yPos: 68.1},
            {id:23, yPos: 71.1},
            {id:24, yPos: 74.1},
            {id:25, yPos: 77.1},
            {id:26, yPos: 80.1},
            {id:27, yPos: 83.1},
            {id:28, yPos: 86.1},
            {id:29, yPos: 89.1},
        ],
        testFirstPos: 7,
        testSecondPos: 6,

        stdXPos: 45,
        primeXPos: 60,
        secondsXPos: 53,
      }
    },

    methods: {
      activeNotes(first, second){

        let higherNote = Math.min(first, second)
        let lowerNote =  Math.max(first,second)
        this.noteXPos[lowerNote].xPos = this.stdXPos
        this.noteXPos[lowerNote].accidental = 'b'
        this.noteXPos[higherNote].accidental = 'b'

        //distance = fourth
        if(Math.abs(first - second) === 3){
          this.noteXPos[higherNote].colOffset = 0
          this.noteXPos[lowerNote].colOffset = 2
        }

        //distance = thirds
        if(Math.abs(first - second) === 2){
          this.noteXPos[higherNote].colOffset = 0
          this.noteXPos[lowerNote].colOffset = 5
        }

        //distance = seconds
        if(Math.abs(first - second) === 1){
          this.noteXPos[higherNote].xPos = this.secondsXPos

          this.noteXPos[higherNote].colOffset = 6
          this.noteXPos[lowerNote].colOffset = 3
        }
        else{
          this.noteXPos[higherNote].xPos = this.stdXPos;
        }
        return this.noteXPos.filter(note => note.id === first || note.id === second)
      }
    }

  }
</script>

<style>
  .note {
    position: absolute;
  }

  .accidental{
    position: absolute;
  }

  .stave {
    position: relative;
    width: 100%;
  }
</style>
