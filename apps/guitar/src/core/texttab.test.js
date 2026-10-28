import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseTextTab, nearestDur } from './texttab.js'
import { STD, DROPD } from './constants.js'

const dots = (m) => m.dots.map((d) => d.s + ':' + d.f + (d.t ? d.t : '')).sort().join(' ')

describe('parseTextTab', () => {
  it('reads single notes, chords and bars in standard tuning', () => {
    const tab = `
Intro
e|-----0-------|-------------|
B|---1---1-----|-0-----------|
G|-2-------2---|-0-----------|
D|-------------|-0-----------|
A|-3-----------|-2-----------|
E|-------------|-3-----------|
`
    const r = parseTextTab(tab)
    assert.deepEqual(r.tuning, STD)
    assert.equal(r.tuningName, 'Standard')
    assert.deepEqual(r.moments.map(dots), ['2:2 4:3', '1:1', '0:0', '1:1', '2:2', '1:0 2:0 3:0 4:2 5:3'])
    // equal spacing gives equal lengths; the lone chord fills its bar
    const d = r.moments.map((m) => m.dur)
    assert.equal(new Set(d.slice(0, 4)).size, 1)
    assert.ok(d[4] > d[0])
    assert.equal(d[5], 96)
  })

  it('detects techniques and two-digit frets', () => {
    const tab = `
e|-------------------|
B|-------------------|
G|-5h7-7p5-5/7-7b--12~|
D|-------------------|
A|-------------------|
E|-------------------|`
    const r = parseTextTab(tab)
    assert.deepEqual(r.moments.map(dots), ['2:5', '2:7h', '2:7', '2:5p', '2:5', '2:7sl', '2:7b', '2:12~'])
  })

  it('recognises drop D from the string names', () => {
    const tab = `
E|---------|
B|---------|
G|---------|
D|---------|
A|---------|
D|-0-0-5-3-|`
    const r = parseTextTab(tab)
    assert.deepEqual(r.tuning, DROPD)
    assert.equal(r.tuningName, 'Drop D')
    assert.equal(r.moments.length, 4)
  })

  it('reads a 4-string bass tab and several systems', () => {
    const tab = `
G|---------|
D|---------|
A|-0---3---|
E|-----1---|

G|---------|
D|-2-------|
A|---------|
E|---------|`
    const r = parseTextTab(tab)
    assert.equal(r.tuning.length, 4)
    assert.deepEqual(r.moments.map(dots), ['2:0', '2:3 3:1', '1:2'])
  })

  it('rejects text without a tab', () => {
    assert.throws(() => parseTextTab('Just some words\nand more words'), /No tab found/)
  })

  it('rounds estimated lengths to musical values', () => {
    assert.equal(nearestDur(11), 12)
    assert.equal(nearestDur(25), 24)
    assert.equal(nearestDur(70), 72)
  })
})
