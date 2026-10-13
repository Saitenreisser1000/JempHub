import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useTempoInput } from './useTempoInput'

function setup() {
  const tempo = ref(120)
  const update = vi.fn((value) => { tempo.value = value })
  const scope = effectScope()
  const input = scope.run(() => useTempoInput(() => tempo.value, update))
  return { ...input, tempo, update, stop: () => scope.stop() }
}

describe('tempo editing', () => {
  it('does not change playback during partial input and commits on completion', () => {
    const input = setup()
    input.beginTempoEdit()
    input.tempoDraft.value = '1'
    expect(input.update).not.toHaveBeenCalled()
    input.tempoDraft.value = '150'
    input.commitTempo()
    expect(input.tempo.value).toBe(150)
    input.stop()
  })
  it.each(['', ' ', 'bad', 'Infinity'])('restores current tempo for invalid input %j', (value) => {
    const input = setup()
    input.tempoDraft.value = value
    input.commitTempo()
    expect(input.tempoDraft.value).toBe('120')
    expect(input.update).not.toHaveBeenCalled()
    input.stop()
  })
  it.each([['1', 30], ['999', 260], ['132,6', 133]])('normalizes %s to %s', (value, expected) => {
    const input = setup()
    input.tempoDraft.value = value
    input.commitTempo()
    expect(input.tempo.value).toBe(expected)
    input.stop()
  })
  it('preserves an in-progress edit when tempo changes elsewhere and can cancel it', async () => {
    const input = setup()
    input.beginTempoEdit()
    input.tempoDraft.value = '14'
    input.tempo.value = 180
    await nextTick()
    expect(input.tempoDraft.value).toBe('14')
    input.cancelTempoEdit()
    input.commitTempo()
    expect(input.tempoDraft.value).toBe('180')
    expect(input.update).not.toHaveBeenCalled()
    input.tempo.value = 90
    await nextTick()
    expect(input.tempoDraft.value).toBe('90')
    input.stop()
  })
})
