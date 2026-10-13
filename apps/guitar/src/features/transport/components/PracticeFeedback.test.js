import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { expect, it } from 'vitest'
import PracticeFeedback from './PracticeFeedback.vue'

const render = (props = {}) => renderToString(createSSRApp(PracticeFeedback, props))
it('keeps the idle player uncluttered', async () => {
  expect(await render()).not.toContain('practice-feedback')
})
it('shows target, detected pitch and a direct microphone stop control', async () => {
  const html = await render({ practiceActive: true, target: 'A4', detected: 'G4', hint: '-12c' })
  expect(html).toMatch(/Target: <strong[^>]*>A4<\/strong>/)
  expect(html).toMatch(/Detected: <strong[^>]*>G4<\/strong>/)
  expect(html).toContain('Stop microphone')
  expect(html).toMatch(/<span role="status"[^>]*>Microphone practice<\/span>/)
  expect(html).toContain('-12c')
})
it('shows microphone errors even after the input stops', async () => {
  const html = await render({ hint: 'Permission denied', matchState: 'error' })
  expect(html).toContain('is-error')
  expect(html).toMatch(/<span role="status"[^>]*>Permission denied<\/span>/)
  expect(html).not.toContain('<button')
})
it('shows recording without a stale practice target', async () => {
  const html = await render({ recordActive: true, target: 'A4' })
  expect(html).toContain('Recording')
  expect(html).not.toContain('A4')
  expect(html).toContain('Stop microphone')
})
it('preserves completion feedback and escapes detected content', async () => {
  expect(await render({ hint: 'Exercise complete' })).toContain('Exercise complete')
  expect(await render({ practiceActive: true, detected: '<script>' })).toContain('&lt;script&gt;')
})
