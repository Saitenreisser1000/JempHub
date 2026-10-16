import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import FretboardToneDotContextMenu from './FretboardToneDotContextMenu.vue'

async function renderMenu(items) {
  const context = {}
  const app = createSSRApp({
    render: () => h(FretboardToneDotContextMenu, {
      open: true,
      x: 120,
      y: 80,
      title: 'Bund 5, Saite 2',
      items,
      selectLabel: 'Auswählen',
      deleteLabel: 'Löschen',
    }),
  })
  await renderToString(app, context)
  return context.teleports?.body ?? ''
}

describe('FretboardToneDotContextMenu', () => {
  it('lists every stacked event with a distinct index and timing', async () => {
    const html = await renderMenu([
      { noteKey: 'one', label: 'Ton 1', timing: 'Position 1.00 · Länge 1.00' },
      { noteKey: 'two', label: 'Ton 2', timing: 'Position 2.00 · Länge 1.00' },
      { noteKey: 'three', label: 'Ton 3', timing: 'Position 3.00 · Länge 1.00' },
    ])

    expect(html).toContain('role="menu"')
    expect(html).toContain('Bund 5, Saite 2')
    expect(html).toContain('Ton 1')
    expect(html).toContain('Ton 2')
    expect(html).toContain('Ton 3')
    expect(html.match(/Auswählen/g)).toHaveLength(3)
    expect(html.match(/Löschen:/g)).toHaveLength(3)
  })
})
