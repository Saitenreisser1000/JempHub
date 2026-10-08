import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { store } from './store/store'
import '@mdi/font/css/materialdesignicons.css'
import LandingPage from "@/components/landing/LandingPage";
import intervalJemp from "@/components/intervalJemp/intervalJemp";
import chordJemp from "@/components/chordjemp/chordJemp";
import inversionJemp from "@/components/inversionJemp/inversionJemp";
import scaleJemp from "@/components/scaleJemp/scaleJemp";
import intonationJemp from "@/components/intonationJemp/intonationJemp";
import melodyJemp from "@/components/melodyJemp/melodyJemp";
import about from "@/components/about/about";
import legal from "@/components/legal/legal";
import { createRouter, createWebHashHistory } from 'vue-router'
import { installI18n } from '@/i18n'
import { warmupSounds } from '@/components/mixins/playSounds'
import { saveLastTrainingRoute } from '@/domain/navigation/lastTrainingRoute'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: LandingPage},
    { path: '/intervallJemp', component: intervalJemp},
    { path: '/chordJemp', component: chordJemp},
    { path: '/inversions', component: inversionJemp},
    { path: '/scaleJemp', component: scaleJemp},
    { path: '/intonationJemp', component: intonationJemp},
    { path: '/melodyJemp', component: melodyJemp},
    { path: '/about', component: about},
    { path: '/impressum', component: legal}
  ]
});

router.afterEach((to) => {
  saveLastTrainingRoute(to.path)
})

const app = createApp(App)
installI18n(app)
app.use(vuetify).use(router).use(store).mount('#app')

warmupSounds()
