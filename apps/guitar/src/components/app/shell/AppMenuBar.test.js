import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import AppMenuBar from './AppMenuBar.vue'

const passthrough = {
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
}

const buttonStub = {
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
}

const menuStub = {
  setup(_, { slots }) {
    return () => h('div', [slots.activator?.({ props: {} }), slots.default?.()])
  },
}

async function renderMenu(props = {}) {
  const app = createSSRApp({
    render: () => h(AppMenuBar, {
      readOnly: true,
      appVersionLabel: 'Experimental v-test',
      songTitle: 'Test song',
      ...props,
    }),
  })

  app.component('VBtn', buttonStub)
  app.component('VBtnToggle', passthrough)
  app.component('VChip', passthrough)
  app.component('VMenu', menuStub)
  app.component('VList', passthrough)
  app.component('VListItem', passthrough)
  app.component('VListSubheader', passthrough)
  app.component('VListGroup', passthrough)
  app.component('VDivider', passthrough)
  app.component('VIcon', passthrough)
  app.component('VCard', passthrough)

  return renderToString(app)
}

describe('AppMenuBar', () => {
  it('keeps account access available in view mode', async () => {
    const html = await renderMenu({ readOnly: true })

    expect(html).toContain('aria-label="Account"')
    expect(html).toContain('Account</button>')
    expect(html).toContain('title="Login"')
    expect(html).toContain('title="Friends"')
    expect(html).toContain('title="Dashboard"')
  })

  it('renders a single account control in edit mode', async () => {
    const html = await renderMenu({ readOnly: false })

    expect(html.match(/aria-label="Account"/g)).toHaveLength(1)
  })

  it('marks the current workspace mode as pressed', async () => {
    const viewHtml = await renderMenu({ readOnly: true })
    const editHtml = await renderMenu({ readOnly: false })

    expect(viewHtml).toMatch(/aria-pressed="true"[^>]*>View<\/button>/)
    expect(viewHtml).toMatch(/aria-pressed="false"[^>]*>Edit<\/button>/)
    expect(editHtml).toMatch(/aria-pressed="false"[^>]*>View<\/button>/)
    expect(editHtml).toMatch(/aria-pressed="true"[^>]*>Edit<\/button>/)
  })

  it('labels the signed-in account action as logout', async () => {
    const html = await renderMenu({ authIsSignedIn: true })

    expect(html).toContain('title="Logout"')
    expect(html).not.toContain('title="Login"')
  })
})
