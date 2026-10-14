import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { expect, it } from 'vitest'
import LibrarySongRow from './LibrarySongRow.vue'

const render = (props = {}) => renderToString(createSSRApp(LibrarySongRow, {
  item: { id: 'song', title: 'Evening study', kind: 'exercise' }, ...props,
}))

it('renders separate named load and delete buttons without nested interactive elements', async () => {
  const html = await render({ canDelete: true })
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)
  expect(buttons).toHaveLength(2)
  expect(buttons.every(button => (button.match(/<button\b/g) || []).length === 1)).toBe(true)
  expect(buttons[0]).toContain('Load “Evening study”')
  expect(buttons[1]).toContain('Delete “Evening study”')
})

it('does not offer deletion for songs owned by someone else', async () => {
  const html = await render()
  expect(html.match(/<button\b/g)).toHaveLength(1)
})

it('announces the loaded song and escapes imported titles', async () => {
  const html = await render({ selected: true, item: { title: '<img src=x>' } })
  expect(html).toContain('aria-current="true"')
  expect(html).toContain('Loaded')
  expect(html).toContain('&lt;img src=x&gt;')
  expect(html).not.toContain('<img')
})
