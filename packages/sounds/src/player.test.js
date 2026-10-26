import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { midiFromName, nearestSample } from './player.js'

describe('sounds', () => {
  it('parses sprite note names', () => {
    assert.equal(midiFromName('A1'), 33)
    assert.equal(midiFromName('Cs4'), 61)
    assert.equal(midiFromName('C4'), 60)
    assert.equal(midiFromName('x'), null)
  })
  it('finds the nearest sample', () => {
    assert.equal(nearestSample(61, [60, 63]), 60)
    assert.equal(nearestSample(62, [60, 64]), 60)
    assert.equal(nearestSample(70, [60, 64, 72]), 72)
  })
  it('ships a sprite that covers the guitar and piano practice range', () => {
    const sprite = JSON.parse(readFileSync(new URL('../piano/piano.json', import.meta.url))).sprite
    const keys = Object.keys(sprite).map(midiFromName)
    assert.ok(keys.every((k) => k !== null))
    for (let m = 36; m <= 84; m++) assert.ok(Math.abs(nearestSample(m, keys) - m) <= 4, 'gap at ' + m)
  })
})
