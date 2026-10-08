import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import 'jemp-design-system'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { createPinia } from 'pinia'
import { createJempVuetifyTheme } from 'jemp-design-system'
import { useAuthStore } from './store/useAuth.js'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: createJempVuetifyTheme(),
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(vuetify)

// Boot auth early so password-recovery links work.
useAuthStore(pinia).init()

app.mount('#app')
