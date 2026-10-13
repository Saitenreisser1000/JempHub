import { afterEach, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { usePaneSplit } from './usePaneSplit'

const scopes = []
function setup() {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(usePaneSplit)
}
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.unstubAllGlobals()
})
it('supports keyboard resizing, bounds and reset without trapping Tab', () => {
  const pane = setup()
  const press = (key, extra = {}) => {
    const event = { key, preventDefault: vi.fn(), ...extra }
    pane.onDividerKeyDown(event)
    return event
  }
  expect(pane.splitRatio.value).toBe(0.5)
  press('ArrowDown')
  expect(pane.splitRatio.value).toBeCloseTo(0.52)
  press('ArrowUp', { shiftKey: true })
  expect(pane.splitRatio.value).toBeCloseTo(0.42)
  press('Home')
  press('ArrowUp')
  expect(pane.splitRatio.value).toBe(0.2)
  press('End')
  press('ArrowDown')
  expect(pane.splitRatio.value).toBe(0.8)
  expect(press('Tab').preventDefault).not.toHaveBeenCalled()
  expect(press('ArrowUp', { ctrlKey: true }).preventDefault).not.toHaveBeenCalled()
  press('Enter')
  expect(pane.splitRatio.value).toBe(0.5)
})
it('restores the split and persists adjustments', async () => {
  const setItem = vi.fn()
  vi.stubGlobal('localStorage', { getItem: () => '0.65', setItem })
  const pane = setup()
  expect(pane.splitRatio.value).toBe(0.65)
  pane.resetSplit()
  await nextTick()
  expect(setItem).toHaveBeenCalledWith('guitarjemp.layout.splitRatio', '0.5')
})
it('works when storage is unavailable', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('quota') },
  })
  const pane = setup()
  pane.splitRatio.value = 0.6
  await nextTick()
  expect(pane.splitRatio.value).toBe(0.6)
})
