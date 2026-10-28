// Läuft nur, wenn alphaTab vorhanden ist (in GitHub Actions: ALPHATAB_JS zeigt
// auf die heruntergeladene Bibliothek). Prüft die ganze Kette:
// alphaTex → Score → Guitar-Pro-7-Datei → wieder einlesen → GuitarJemp-Übung.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { scoreToExercise, scoreInfo } from './scoreimport.js'

const path = process.env.ALPHATAB_JS
let at = null
if (path) at = path.endsWith('.mjs') ? await import(path) : createRequire(import.meta.url)(path)
if (at && at.default && !at.importer) at = at.default
if (process.env.GITHUB_ACTIONS && !at) throw new Error('alphaTab missing in CI')
if (at) console.log('::notice::alphaTab import tests running (' + (at.meta && at.meta.version || 'version unknown') + ')')

const TEX = `\\title "Import Test" \\tempo 90
.
\\track "Guitar"
\\tuning e4 b3 g3 d3 a2 e2
:8 3.5 0.1 (0.1 3.5) r 5.3{h} 7.3 :4 5.3 |
:2 0.6 :4 2.4 2.4 |
`

function check(ex) {
  const dots = ex.moments.map((m) => m.dots.map((d) => d.s + ':' + d.f + (d.t || '')).sort().join(' '))
  assert.deepEqual(dots.slice(0, 7), ['4:3', '0:0', '0:0 4:3', '', '2:5', '2:7h', '2:5'])
  assert.deepEqual(ex.moments.slice(0, 7).map((m) => m.dur), [12, 12, 12, 12, 12, 12, 24])
  assert.equal(ex.tuning.join(), '64,59,55,50,45,40')
  assert.equal(ex.tuning[4] + 3, 48) // C3
  assert.equal(ex.bpm, 90)
  assert.deepEqual(ex.ts, [4, 4])
}

describe('scoreToExercise (alphaTab)', { skip: !at && 'alphaTab not available (set ALPHATAB_JS)' }, () => {
  const settings = () => new at.Settings()
  const fromTex = () => {
    const imp = new at.importer.AlphaTexImporter()
    imp.initFromString(TEX, settings())
    return imp.readScore()
  }
  it('converts an alphaTex score', () => {
    const score = fromTex()
    assert.equal(scoreInfo(score).tracks.length, 1)
    check(scoreToExercise(score, { track: 0 }))
  })
  it('converts a Guitar Pro 7 file and honours the bar range', () => {
    const bytes = new at.exporter.Gp7Exporter().export(fromTex(), settings())
    const score = at.importer.ScoreLoader.loadScoreFromBytes(bytes, settings())
    check(scoreToExercise(score, { track: 0 }))
    const bar2 = scoreToExercise(score, { track: 0, from: 2, to: 2 })
    assert.deepEqual(bar2.moments.map((m) => m.dots.map((d) => d.s + ':' + d.f).join(' ')), ['5:0', '3:2', '3:2'])
    assert.deepEqual(bar2.moments.map((m) => m.dur), [48, 24, 24])
    assert.match(bar2.title, /bars 2–2/)
  })
})
