import { createRouter, createWebHashHistory } from 'vue-router'
import LandingPage from "@/components/landing/LandingPage";
import intervalJemp from "@/components/intervalJemp/intervalJemp";
import chordJemp from "@/components/chordjemp/chordJemp";
import inversionJemp from "@/components/inversionJemp/inversionJemp";
import scaleJemp from "@/components/scaleJemp/scaleJemp";
import melodyJemp from "@/components/melodyJemp/melodyJemp";
import about from "@/components/about/about";
import legal from "@/components/legal/legal";

const routes = [
  { path: '/', component: LandingPage },
  { path: '/intervallJemp', component: intervalJemp },
  { path: '/chordJemp', component: chordJemp },
  { path: '/inversions', component: inversionJemp },
  { path: '/scaleJemp', component: scaleJemp },
  { path: '/melodyJemp', component: melodyJemp },
  { path: '/about', component: about },
  { path: '/impressum', component: legal }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
