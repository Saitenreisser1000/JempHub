<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { calculateTextFit } from '../utils/textFit'

export type FormatKey = 'portrait' | 'square' | 'story'
export type ContentBlock = {
  heading: string
  intro: string
  bullets: string[]
  page?: number
}
export type AlumniRecord = {
  name: string
  nameFontSize: number
  graduation: string
  profession: string
  education: string
  retrospective: string
  contentBlocks?: ContentBlock[]
  quotes: string[]
  image: string
  imageX: number
  imageY: number
  imageZoom: number
}

type Props = {
  record: AlumniRecord
  format: FormatKey
  page: number
  safeZones?: boolean
}

const props = defineProps<Props>()
const previewElement = ref<HTMLElement | null>(null)
const identityBox = ref<HTMLElement | null>(null)
const layoutTick = ref(0)

const formats: Record<FormatKey, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
}

const currentFormat = computed(() => formats[props.format])
const previewStyle = computed(() => ({ aspectRatio: `${currentFormat.value.width} / ${currentFormat.value.height}` }))
const imageStyle = computed(() => ({
  objectPosition: `${Math.min(100, Math.max(0, Number(props.record.imageX ?? 50)))}% ${Math.min(100, Math.max(0, Number(props.record.imageY ?? 50)))}%`,
  transform: `scale(${props.record.imageZoom / 100})`,
}))
const quoteList = computed(() => props.record.quotes.map(quote => quote.trim()).filter(Boolean))
const firstQuote = computed(() => quoteList.value[0] ?? '')
const contentBlocks = computed(() => {
  if (props.record.contentBlocks?.length) {
    return props.record.contentBlocks
      .map(block => ({ ...block, intro: block.intro ?? '', bullets: block.bullets ?? [] }))
      .filter(block => block.heading.trim() || block.intro.trim() || block.bullets.some(bullet => bullet.trim()))
  }
  return props.record.retrospective.trim() ? [{ heading: 'RÜCKBLICK', intro: props.record.retrospective, bullets: [] }] : []
})
const nameLines = computed(() => {
  const cleaned = props.record.name.trim().replace(/\s+/g, ' ')
  if (!cleaned) return { first: 'Vorname', last: 'Nachname' }
  const parts = cleaned.split(' ')
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
})

function measureManrope(text: string, fontSize: number) {
  if (typeof document === 'undefined') return text.length * fontSize * 0.55
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return text.length * fontSize * 0.55
  context.font = `800 ${fontSize}px Manrope, sans-serif`
  return context.measureText(text).width
}

function availableIdentityWidth() {
  const cardWidth = previewElement.value?.clientWidth
  const boxWidth = identityBox.value?.clientWidth
  const fallbackWidthRatio = props.format === 'story' ? 0.892 : 0.365
  const widthRatio = cardWidth && boxWidth ? boxWidth / cardWidth : fallbackWidthRatio
  return currentFormat.value.width * widthRatio
}

const nameFontSize = computed(() => {
  layoutTick.value
  const first = nameLines.value.first
  const last = nameLines.value.last
  const maxPx = props.format === 'story' ? 48 : 48
  const minPx = props.format === 'story' ? 18 : 20
  const availableWidth = availableIdentityWidth() * 0.93
  if (typeof document === 'undefined') return maxPx
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return maxPx

  const maxLine = () => Math.max(context.measureText(first).width, context.measureText(last).width)
  let low = minPx
  let high = maxPx
  let best = minPx
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    context.font = `800 ${mid}px Manrope, sans-serif`
    if (maxLine() <= availableWidth) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return best
})

const headlineFontSize = computed(() => {
  layoutTick.value
  const cardWidth = previewElement.value?.clientWidth || currentFormat.value.width
  const width = cardWidth * (props.format === 'story' ? 0.892 : 0.365) * 0.96
  return calculateTextFit(props.record.education.trim() || 'Ausbildung und Werdegang', {
    width,
    height: Number.MAX_SAFE_INTEGER,
    maxFontSize: 48,
    minFontSize: 20,
    preserveLayoutUntil: 20,
    maxLines: 3,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    compressedPadding: { top: 0, right: 0, bottom: 0, left: 0 },
    measureText: measureManrope,
  }).fontSize
})

const educationLines = computed(() => {
  layoutTick.value
  const cardWidth = previewElement.value?.clientWidth || currentFormat.value.width
  return calculateTextFit(props.record.education.trim() || 'Ausbildung und Werdegang', {
    width: cardWidth * (props.format === 'square' ? 0.37 : 0.82),
    height: Number.MAX_SAFE_INTEGER,
    maxFontSize: 12,
    minFontSize: 12,
    preserveLayoutUntil: 12,
    maxLines: 100,
    lineHeight: 1.38,
    letterSpacing: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    compressedPadding: { top: 0, right: 0, bottom: 0, left: 0 },
    measureText: measureManrope,
  }).lines
})

const educationFirstPage = computed(() => educationLines.value.slice(0, props.format === 'square' ? 4 : 5).join('\n'))
function fitTextBlock(text: string, width: number, height: number, maxFontSize: number, minFontSize: number, maxLines: number, padding: { top: number; right: number; bottom: number; left: number }) {
  return calculateTextFit(text, {
    width,
    height,
    maxFontSize,
    minFontSize,
    preserveLayoutUntil: Math.max(minFontSize + 1, maxFontSize - 7),
    maxLines,
    lineHeight: 1.2,
    letterSpacing: -0.025,
    compressedLetterSpacing: -0.06,
    padding,
    compressedPadding: {
      top: padding.top * 0.55,
      right: padding.right * 0.55,
      bottom: padding.bottom * 0.55,
      left: padding.left * 0.55,
    },
    measureText: measureManrope,
  })
}

const quoteFit = computed(() => {
  layoutTick.value
  const text = firstQuote.value || 'Trau dich, deinen Weg zu verändern.'
  const cardWidth = previewElement.value?.clientWidth || currentFormat.value.width
  const cardHeight = previewElement.value?.clientHeight || currentFormat.value.height
  const width = cardWidth * (props.format === 'story' ? 0.892 : props.format === 'square' ? 0.486 : 0.46)
  const height = cardHeight * (props.format === 'story' ? 0.12 : 0.24)
  return calculateTextFit(text, {
    width,
    height,
    maxFontSize: 34,
    minFontSize: 16,
    preserveLayoutUntil: 25,
    maxLines: props.format === 'story' ? 4 : 3,
    lineHeight: 1.12,
    letterSpacing: -0.04,
    compressedLetterSpacing: -0.075,
    padding: { top: height * 0.05, right: width * 0.06, bottom: height * 0.05, left: width * 0.08 },
    compressedPadding: { top: height * 0.025, right: width * 0.03, bottom: height * 0.025, left: width * 0.04 },
    measureText: measureManrope,
  })
})

const secondPageLayout = computed(() => {
  layoutTick.value
  const cardWidth = previewElement.value?.clientWidth || currentFormat.value.width
  const cardHeight = previewElement.value?.clientHeight || currentFormat.value.height
  const contentWidth = cardWidth * 0.84
  const contentHeight = cardHeight * 0.7
  return { contentWidth, contentHeight, contentBlockArea: contentHeight }
})

const pageBlocks = computed(() => contentBlocks.value.filter(block => (block.page ?? 2) === props.page))
const contentBlockHeight = computed(() => {
  const availableHeight = secondPageLayout.value.contentBlockArea - 22 * Math.max(0, pageBlocks.value.length - 1)
  return Math.max(90, availableHeight / Math.max(1, pageBlocks.value.length))
})
const contentBlockFits = computed(() => pageBlocks.value.map(block => fitTextBlock(
  [block.intro, ...block.bullets.filter(bullet => bullet.trim()).map(bullet => `• ${bullet}`)].filter(Boolean).join('\n'),
  secondPageLayout.value.contentWidth - (block.bullets.length ? 28 : 0),
  contentBlockHeight.value,
  24,
  11,
  10,
  { top: 0, right: 0, bottom: 0, left: 0 },
)))

function fitStyle(fit: ReturnType<typeof calculateTextFit>) {
  return {
    fontSize: `${fit.fontSize}px`,
    lineHeight: fit.lineHeight,
    letterSpacing: `${fit.letterSpacing}em`,
    padding: `${fit.padding.top}px ${fit.padding.right}px ${fit.padding.bottom}px ${fit.padding.left}px`,
  }
}

const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layoutTick.value++) : null

watch(previewElement, (element, oldElement) => {
  if (oldElement) resizeObserver?.unobserve(oldElement)
  if (element) resizeObserver?.observe(element)
})

onMounted(() => {
  if (previewElement.value) resizeObserver?.observe(previewElement.value)
  window.addEventListener('resize', () => layoutTick.value++)
  document.fonts?.ready?.then(() => layoutTick.value++)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

defineExpose({ element: previewElement })
</script>

<template>
  <article v-if="page === 1" ref="previewElement" class="social-card" :class="`format-${format}`" :style="previewStyle">
    <div class="card-bg"></div>
    <div class="card-grid"></div>
    <div class="card-head">
      <img class="school-logo" src="/logo-white.png?v=1" alt="" />
    </div>
    <div class="portrait-wrap">
      <img v-if="record.image" :src="record.image" :style="imageStyle" alt="Porträt" />
      <div v-else class="portrait-placeholder"><span>Foto</span><small>Porträt hochladen</small></div>
    </div>
    <div class="identity" ref="identityBox">
      <p>{{ record.graduation || 'Abschlussjahr' }}</p>
      <h2 class="name-lockup" :style="{ fontSize: `${nameFontSize * ((record.nameFontSize ?? 50) / 100)}px` }">
        <span class="name-line">{{ nameLines.first }}</span>
        <span class="name-line">{{ nameLines.last || '\u00A0' }}</span>
      </h2>
      <div class="yellow-rule"></div>
      <h3>{{ record.profession || 'Beruf' }}</h3>
      <blockquote v-if="firstQuote && format === 'story'" class="main-quote" :style="{ fontSize: `${quoteFit.fontSize}px`, lineHeight: quoteFit.lineHeight, letterSpacing: `${quoteFit.letterSpacing}em`, padding: `${quoteFit.padding.top}px ${quoteFit.padding.right}px ${quoteFit.padding.bottom}px ${quoteFit.padding.left}px` }">„{{ firstQuote }}“</blockquote>
    </div>
    <blockquote v-if="firstQuote && format !== 'story'" class="main-quote" :style="{ fontSize: `${quoteFit.fontSize}px`, lineHeight: quoteFit.lineHeight, letterSpacing: `${quoteFit.letterSpacing}em`, padding: `${quoteFit.padding.top}px ${quoteFit.padding.right}px ${quoteFit.padding.bottom}px ${quoteFit.padding.left}px` }">„{{ firstQuote }}“</blockquote>
    <div v-if="format !== 'story'" class="below-quote">
      <div class="education-note">
        <span>WERDEGANG</span>
          <p>{{ educationFirstPage }}</p>
      </div>
    </div>
    <footer><span>sternsteingymnasium.at</span><span>Bildung + Praxis mit Weitblick</span></footer>
    <template v-if="format === 'story' && safeZones">
      <div class="safe-zone safe-zone-top"><span>Von Profilzeile verdeckt</span></div>
      <div class="safe-zone safe-zone-bottom"><span>Von Antwortfeld verdeckt</span></div>
    </template>
  </article>

  <article v-else ref="previewElement" class="social-card second-page" :class="`format-${format}`" :style="previewStyle">
    <div class="card-bg"></div>
    <div class="card-grid"></div>
    <div class="card-head">
      <img class="school-logo" src="/logo-white.png?v=1" alt="" />
    </div>
    <section class="second-page-content">
      <div v-if="pageBlocks.length" class="content-blocks">
        <section v-for="(block, index) in pageBlocks" :key="`${page}-${index}`" class="content-block" :style="{ minHeight: `${contentBlockHeight}px` }">
          <span>{{ block.heading || 'TEXT' }}</span>
          <div class="content-block-body" :style="fitStyle(contentBlockFits[index])">
            <p v-if="block.intro">{{ block.intro }}</p>
            <ul v-if="block.bullets.some(bullet => bullet.trim())">
              <li v-for="(bullet, bulletIndex) in block.bullets" v-show="bullet.trim()" :key="bulletIndex">{{ bullet }}</li>
            </ul>
          </div>
        </section>
      </div>
    </section>
    <footer><span>sternsteingymnasium.at</span><span>Bildung + Praxis mit Weitblick</span></footer>
  </article>
</template>
