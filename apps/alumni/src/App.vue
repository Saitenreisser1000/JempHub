<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { toJpeg, toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import SocialCard, { type AlumniRecord, type ContentBlock, type FormatKey } from './components/SocialCard.vue'

const formats: Record<FormatKey, { label: string; width: number; height: number }> = {
  portrait: { label: 'Hochformat', width: 1080, height: 1350 },
  square: { label: 'Quadrat', width: 1080, height: 1080 },
  story: { label: 'Story', width: 1080, height: 1920 },
}

const demo: AlumniRecord = {
  name: 'Marlene Beispiel',
  nameFontSize: 50,
  graduation: 'Matura 2018',
  profession: 'Ärztin',
  education: 'Medizinstudium an der Universität Wien',
  retrospective: 'Am Sternstein Gymnasium habe ich gelernt, neugierig zu bleiben, Fragen zu stellen und meinen eigenen Weg zu gehen.',
  contentBlocks: [{ heading: 'RÜCKBLICK', intro: 'Am Sternstein Gymnasium habe ich gelernt, neugierig zu bleiben und meinen eigenen Weg zu gehen.', bullets: ['Neugierig bleiben', 'Fragen stellen'], page: 2 }],
  quotes: ['Trau dich, deinen Weg zu verändern.'],
  image: '',
  imageX: 50,
  imageY: 50,
  imageZoom: 100,
}

const record = reactive<AlumniRecord>({ ...demo, quotes: [...demo.quotes] })
const format = ref<FormatKey>('portrait')
const page = ref(1)
const pageCount = ref(2)
const maxPages = 5
const debugMode = ref(false)
const safeZones = ref(false)
const preview = ref<InstanceType<typeof SocialCard> | null>(null)
const records = ref<AlumniRecord[]>([])
const activeRecord = ref(0)
const busy = ref(false)
const toast = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

function normalizeContentBlocks(blocks: unknown): ContentBlock[] {
  if (!Array.isArray(blocks)) return []
  return blocks.map((block: Record<string, unknown>) => ({
    heading: typeof block.heading === 'string' ? block.heading : '',
    intro: typeof block.intro === 'string' ? block.intro : typeof block.text === 'string' ? block.text : '',
    bullets: Array.isArray(block.bullets) ? block.bullets.filter((bullet): bullet is string => typeof bullet === 'string') : [],
    page: typeof block.page === 'number' ? block.page : 2,
  }))
}

const currentFormat = computed(() => formats[format.value])
const quoteList = computed(() => record.quotes.map(quote => quote.trim()).filter(Boolean))
const firstQuote = computed(() => quoteList.value[0] ?? '')
const contentBlocks = computed(() => record.contentBlocks ?? [])
const pageTextboxes = computed(() => Array.from({ length: Math.max(0, pageCount.value - 1) }, (_, index) => {
  const pageNumber = index + 2
  return { pageNumber, block: contentBlocks.value.find(block => (block.page ?? 2) === pageNumber)! }
}))
const hasSecondPage = computed(() => format.value !== 'story' && pageCount.value > 1)

const filename = computed(() => {
  const base = record.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'alumni'
  return `${base}-${format.value}`
})

function notify(message: string) {
  toast.value = message
  window.setTimeout(() => { if (toast.value === message) toast.value = '' }, 2600)
}

function handleImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { record.image = String(reader.result) }
  reader.readAsDataURL(file)
}

function ensureContentBlockForPage(pageNumber: number) {
  if (!record.contentBlocks) record.contentBlocks = []
  if (!record.contentBlocks.some(block => (block.page ?? 2) === pageNumber)) {
    record.contentBlocks.push({ heading: pageNumber === 2 ? 'RÜCKBLICK' : 'WEITERE GEDANKEN', intro: '', bullets: [], page: pageNumber })
  }
}

function addContentBullet(block: ContentBlock) {
  block.bullets.push('')
}

function removeContentBullet(block: ContentBlock, index: number) {
  block.bullets.splice(index, 1)
}

function addPage() {
  if (format.value !== 'story' && pageCount.value < maxPages) {
    pageCount.value += 1
    ensureContentBlockForPage(pageCount.value)
    page.value = pageCount.value
  }
}

function removePage(pageNumber: number) {
  if (pageNumber <= 1) return
  record.contentBlocks = record.contentBlocks?.filter(block => (block.page ?? 2) !== pageNumber) ?? []
  record.contentBlocks.forEach((block) => {
    const blockPage = block.page ?? 2
    if (blockPage > pageNumber) block.page = blockPage - 1
  })
  pageCount.value -= 1
  if (page.value === pageNumber) page.value = Math.min(pageNumber - 1, pageCount.value)
  else if (page.value > pageNumber) page.value -= 1
}

function resetForm() {
  Object.assign(record, { ...demo, quotes: [...demo.quotes], contentBlocks: demo.contentBlocks?.map(block => ({ ...block, bullets: [...block.bullets] })), image: '' })
  activeRecord.value = 0
  page.value = 1
  pageCount.value = 2
  notify('Beispieldaten wiederhergestellt')
}

async function capturePreview(kind: 'png' | 'jpeg') {
  const element = preview.value?.element
  if (!element) throw new Error('Vorschau nicht verfügbar')
  await nextTick()
  const options = {
    width: currentFormat.value.width,
    height: currentFormat.value.height,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#fbc02d',
    filter: (node: HTMLElement) => !node.classList?.contains('safe-zone'),
  }
  return kind === 'png' ? toPng(element, options) : toJpeg(element, { ...options, quality: 0.94 })
}

async function renderImage(kind: 'png' | 'jpeg', targetPage: number = page.value) {
  const previousPage = page.value
  if (targetPage !== previousPage) {
    page.value = targetPage
    await nextTick()
  }
  try {
    return await capturePreview(kind)
  } finally {
    if (targetPage !== previousPage) {
      page.value = previousPage
      await nextTick()
    }
  }
}

function downloadDataUrl(url: string, name: string) {
  const link = document.createElement('a')
  link.download = name
  link.href = url
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function downloadImageData(url: string, name: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    downloadDataUrl(objectUrl, name)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200)
  }
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function exportRaster(kind: 'png' | 'jpeg') {
  busy.value = true
  try {
    if (hasSecondPage.value) {
      const ext = kind === 'jpeg' ? 'jpg' : 'png'
      for (let pageNumber = 1; pageNumber <= pageCount.value; pageNumber += 1) {
        const data = await renderImage(kind, pageNumber)
        await downloadImageData(data, `${filename.value}-seite-${pageNumber}.${ext}`)
        await wait(120)
      }
    } else {
      const data = await renderImage(kind)
      await downloadImageData(data, `${filename.value}.${kind === 'jpeg' ? 'jpg' : 'png'}`)
    }
    notify(`${kind === 'jpeg' ? 'JPG' : 'PNG'} wurde erstellt`)
  } catch (error) {
    notify('Export fehlgeschlagen – bitte nochmals versuchen')
    console.error(error)
  } finally { busy.value = false }
}

async function exportBackgroundAsset(withFooter: boolean, withLogo: boolean, dimensions = { width: 1080, height: 1350 }) {
  busy.value = true
  try {
    const [background, logo] = await Promise.all([loadImage('/background.jpg'), loadImage('/logo-white.png')])
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas nicht verfügbar')

    const scale = Math.max(canvas.width / background.naturalWidth, canvas.height / background.naturalHeight)
    const imageWidth = background.naturalWidth * scale * 1.04
    const imageHeight = background.naturalHeight * scale * 1.04
    context.filter = 'blur(6px)'
    context.drawImage(background, (canvas.width - imageWidth) / 2, (canvas.height - imageHeight) / 2, imageWidth, imageHeight)
    context.filter = 'none'
    context.fillStyle = 'rgba(8, 8, 31, .46)'
    context.fillRect(0, 0, canvas.width, canvas.height)

    if (withLogo) {
      const logoScale = Math.min(454 / logo.naturalWidth, 108 / logo.naturalHeight)
      context.drawImage(logo, 58, 58, logo.naturalWidth * logoScale, logo.naturalHeight * logoScale)
    }
    if (withFooter) {
      context.strokeStyle = 'rgba(245, 245, 247, .38)'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(58, 1296)
      context.lineTo(1022, 1296)
      context.stroke()
      context.fillStyle = '#f5f5f7'
      context.font = '700 14px "DM Sans", sans-serif'
      context.textBaseline = 'alphabetic'
      context.fillText('STERNSTEINGYMNASIUM.AT', 58, 1330)
      context.textAlign = 'right'
      context.fillText('BILDUNG + PRAXIS MIT WEITBLICK', 1022, 1330)
    }

    const data = canvas.toDataURL('image/png')
    const suffix = withFooter ? '' : '-ohne-logo-und-footer'
    const size = `${dimensions.width}x${dimensions.height}`
    await downloadImageData(data, `sternstein-hintergrund-${size}${suffix}.png`)
    notify(withFooter ? 'Hintergrundbild wurde erstellt' : `Hintergrundbild ${size} ohne Logo und Fußzeile wurde erstellt`)
  } catch (error) {
    notify('Hintergrundbild konnte nicht erstellt werden')
    console.error(error)
  } finally { busy.value = false }
}

function exportBackgroundOnly() {
  return exportBackgroundAsset(true, true)
}

function exportStoryBackground() {
  return exportBackgroundAsset(false, false, { width: 1080, height: 1920 })
}

async function exportPdf() {
  busy.value = true
  try {
    const data = await renderImage('jpeg', 1)
    const { width, height } = currentFormat.value
    const pdf = new jsPDF({ orientation: height > width ? 'portrait' : 'landscape', unit: 'px', format: [width, height], hotfixes: ['px_scaling'] })
    pdf.addImage(data, 'JPEG', 0, 0, width, height)
    for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) {
      const additionalPage = await renderImage('jpeg', pageNumber)
      pdf.addPage([width, height], height > width ? 'portrait' : 'landscape')
      pdf.addImage(additionalPage, 'JPEG', 0, 0, width, height)
    }
    pdf.save(`${filename.value}.pdf`)
    notify('PDF wurde erstellt')
  } catch (error) {
    notify('PDF-Export fehlgeschlagen')
    console.error(error)
  } finally { busy.value = false }
}

function saveLocally() {
  localStorage.setItem('sternstein-alumni-current', JSON.stringify(record))
  notify('Entwurf wurde im Browser gespeichert')
}

function loadLocal() {
  const saved = localStorage.getItem('sternstein-alumni-current')
  if (!saved) return notify('Noch kein lokaler Entwurf vorhanden')
  try {
    const parsed = JSON.parse(saved) as Partial<AlumniRecord>
    Object.assign(record, parsed)
    record.contentBlocks = normalizeContentBlocks(parsed.contentBlocks)
    if (!record.contentBlocks.length && record.retrospective.trim()) record.contentBlocks = [{ heading: 'RÜCKBLICK', intro: record.retrospective, bullets: [], page: 2 }]
    pageCount.value = Math.max(2, ...(record.contentBlocks ?? []).map(block => block.page ?? 2))
    for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) ensureContentBlockForPage(pageNumber)
    notify('Entwurf wurde geladen')
  } catch { notify('Entwurf konnte nicht geladen werden') }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
  downloadDataUrl(URL.createObjectURL(blob), `${filename.value}.json`)
}

function mapRow(row: Record<string, unknown>): AlumniRecord {
  const get = (...keys: string[]) => String(keys.map(key => row[key]).find(Boolean) ?? '')
  const quotes = [get('Zitat', 'Zitat 1', 'quote')].filter(Boolean)
  return {
    name: get('Name', 'name'),
    nameFontSize: 50,
    graduation: get('Abschlussjahr', 'Matura', 'graduation'),
    profession: get('Beruf', 'profession'),
    education: get('Ausbildung', 'education'),
    retrospective: get('Rückblick', 'Rueckblick', 'retrospective'),
    contentBlocks: [{ heading: 'RÜCKBLICK', intro: get('Rückblick', 'Rueckblick', 'retrospective'), bullets: [], page: 2 }].filter(block => block.intro),
    quotes: quotes.length ? quotes : [''],
    image: '', imageX: 50, imageY: 50, imageZoom: 100,
  }
}

async function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    if (file.name.toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(await file.text()) as Partial<AlumniRecord>
        Object.assign(record, parsed)
        record.contentBlocks = normalizeContentBlocks(parsed.contentBlocks)
        if (!record.contentBlocks.length && record.retrospective.trim()) record.contentBlocks = [{ heading: 'RÜCKBLICK', intro: record.retrospective, bullets: [], page: 2 }]
        pageCount.value = Math.max(2, ...(record.contentBlocks ?? []).map(block => block.page ?? 2))
        for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) ensureContentBlockForPage(pageNumber)
      records.value = []
      notify('Datensatz wurde importiert')
      return
    }
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]])
    records.value = rows.map(mapRow).filter(item => item.name)
    if (!records.value.length) throw new Error('Keine Datensätze')
    activeRecord.value = 0
    Object.assign(record, records.value[0])
    pageCount.value = Math.max(2, ...(record.contentBlocks ?? []).map(block => block.page ?? 2))
    for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) ensureContentBlockForPage(pageNumber)
    notify(`${records.value.length} Datensätze importiert`)
  } catch (error) {
    notify('Datei konnte nicht importiert werden')
    console.error(error)
  } finally { (event.target as HTMLInputElement).value = '' }
}

function selectRecord(index: number) {
  records.value[activeRecord.value] = JSON.parse(JSON.stringify(record))
  activeRecord.value = index
  Object.assign(record, JSON.parse(JSON.stringify(records.value[index])))
}

watch(format, () => {
  if (format.value === 'story') page.value = 1
})

watch(format, () => notify(`${currentFormat.value.label}: ${currentFormat.value.width} × ${currentFormat.value.height} px`))

onMounted(() => {
  loadLocal()
  for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) ensureContentBlockForPage(pageNumber)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <img src="/logo-white.png?v=1" alt="Sternstein Gymnasium" />
        <span class="brand-divider"></span>
        <div><strong>Alumni-Editor</strong><small>Social Media Studio</small></div>
      </div>
      <div class="header-actions">
        <button class="button button-ghost" @click="loadLocal">Entwurf laden</button>
        <button class="button button-dark" @click="saveLocally">Entwurf speichern</button>
        <button class="button button-white" :disabled="busy" @click="exportRaster('jpeg')"><template v-if="busy">Wird erstellt …</template><template v-else>JPEG<span class="label-long"> herunterladen</span></template></button>
      </div>
    </header>

    <main class="workspace">
      <section class="editor-panel" aria-label="Alumni-Daten bearbeiten">
        <div class="section-intro">
          <!--p class="eyebrow">Neuer Alumni-Beitrag</p-->
          <h1>Neuer Alumni-Beitrag</h1>
          <p>Inhalte eingeben, Format wählen und den fertigen Beitrag direkt exportieren.</p>
        </div>

        <div v-if="records.length" class="batch-bar">
          <label for="batch">Importierte Datensätze</label>
          <select id="batch" :value="activeRecord" @change="selectRecord(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="(item, index) in records" :key="index" :value="index">{{ index + 1 }} · {{ item.name }}</option>
          </select>
          <span>{{ activeRecord + 1 }} / {{ records.length }}</span>
        </div>

        <div class="form-section">
          <h2>Person</h2>
          <div class="field-grid">
            <label class="field field-wide"><span>Name</span><input v-model="record.name" placeholder="Vor- und Nachname" /></label>
            <label class="field field-wide"><span>Namensgröße: {{ record.nameFontSize }} %</span><input v-model.number="record.nameFontSize" type="range" min="25" max="100" step="5" /></label>
            <template v-if="format !== 'story'">
              <label class="field"><span>Abschluss</span><input v-model="record.graduation" placeholder="z. B. Matura 2018" /></label>
              <label class="field"><span>Beruf</span><input v-model="record.profession" placeholder="z. B. Ärztin" /></label>
              <label class="field field-wide"><span>Ausbildung &amp; Werdegang</span><textarea v-model="record.education" rows="2" placeholder="Studium, Ausbildung, heutige Tätigkeit"></textarea></label>
            </template>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title-row"><h2>Porträt</h2><button v-if="record.image" class="text-button" @click="record.image = ''">Entfernen</button></div>
          <button class="upload-zone" type="button" @click="fileInput?.click()">
            <span class="upload-icon">＋</span><span><strong>{{ record.image ? 'Anderes Bild wählen' : 'Porträt hochladen' }}</strong><small>JPG oder PNG · am besten hochauflösend</small></span>
          </button>
          <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="handleImage" />
          <div v-if="record.image" class="crop-controls">
            <label><span>Horizontal: {{ record.imageX }} %</span><input v-model.number="record.imageX" type="range" min="0" max="100" step="1" /></label>
            <label><span>Vertikal: {{ record.imageY }} %</span><input v-model.number="record.imageY" type="range" min="0" max="100" step="1" /></label>
            <label><span>Zoom</span><input v-model.number="record.imageZoom" type="range" min="100" max="180" /></label>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title-row">
            <h2>Zitat auf Seite 1</h2>
          </div>
          <div class="quote-field">
            <span>„</span><textarea v-model="record.quotes[0]" rows="2" placeholder="Zitat 1"></textarea>
            <span></span>
          </div>
        </div>

        <div v-if="format !== 'story'" class="form-section">
          <div class="section-title-row">
            <h2>Textboxen ab Seite 2</h2>
          </div>
          <div class="content-block-fields">
            <div v-for="({ block, pageNumber }, index) in pageTextboxes" :key="pageNumber" class="content-block-field">
              <div class="section-title-row">
                <strong>Seite {{ pageNumber }} · Textbox</strong>
              </div>
              <label class="field"><span>Überschrift</span><input v-model="block.heading" placeholder="z. B. Rückblick" /></label>
              <label class="field"><span>Text</span><textarea v-model="block.intro" rows="5" maxlength="700" placeholder="Text für diese Seite"></textarea><small>{{ block.intro.length }} / 700 Zeichen</small></label>
              <div class="field">
                <span>Stichpunkte</span>
                <div v-for="(_, bulletIndex) in block.bullets" :key="bulletIndex" class="content-bullet-field">
                  <input v-model="block.bullets[bulletIndex]" maxlength="160" :aria-label="`Textbox ${index + 1}, Stichpunkt ${bulletIndex + 1}`" placeholder="Kurzer Stichpunkt" />
                  <button class="text-button" :aria-label="`Stichpunkt ${bulletIndex + 1} entfernen`" @click="removeContentBullet(block, bulletIndex)">×</button>
                </div>
                <button class="text-button content-bullet-add" @click="addContentBullet(block)">+ Stichpunkt</button>
              </div>
            </div>
          </div>
        </div>

        <div class="data-actions">
          <button class="button button-soft" @click="importInput?.click()">Excel, CSV oder JSON importieren</button>
          <button class="button button-soft" @click="exportJson">Datensatz exportieren</button>
          <button class="text-button" @click="resetForm">Zurücksetzen</button>
          <input ref="importInput" class="visually-hidden" type="file" accept=".xlsx,.xls,.csv,.json" @change="importData" />
        </div>
      </section>

      <section class="preview-panel" aria-label="Beitragsvorschau">
        <div class="preview-toolbar">
          <div>
            <p class="eyebrow">Live-Vorschau</p>
            <strong>{{ currentFormat.width }} × {{ currentFormat.height }} px</strong>
          </div>
          <div class="segmented" aria-label="Instagram-Format">
            <button v-for="(item, key) in formats" :key="key" :class="{ active: format === key }" @click="format = key as FormatKey">{{ item.label }}</button>
          </div>
          <div v-if="format !== 'story'" class="segmented" aria-label="Vorschauseite">
            <span v-for="pageNumber in pageCount" :key="pageNumber" class="page-tab-wrap">
              <button :class="{ active: page === pageNumber }" @click="page = pageNumber">
                Seite {{ pageNumber }}
                <span v-if="pageNumber > 1" class="page-remove" :aria-label="`Seite ${pageNumber} löschen`" :title="`Seite ${pageNumber} löschen`" role="button" tabindex="0" @click.stop="removePage(pageNumber)">×</span>
              </button>
            </span>
            <button v-if="pageCount < maxPages" class="page-add" :aria-label="`Seite ${pageCount + 1} hinzufügen`" :title="`Seite ${pageCount + 1} hinzufügen`" @click="addPage">+</button>
          </div>
          <button class="button button-ghost" :class="{ active: debugMode }" @click="debugMode = !debugMode">Debug-Modus {{ debugMode ? 'an' : 'aus' }}</button>
          <button v-if="format === 'story'" class="button button-ghost" :class="{ active: safeZones }" @click="safeZones = !safeZones">Verdeckte Bereiche {{ safeZones ? 'an' : 'aus' }}</button>
        </div>

        <div class="canvas-stage" :class="{ 'debug-mode': debugMode }">
          <SocialCard ref="preview" :record="record" :format="format" :page="page" :safe-zones="safeZones" />
        </div>

      </section>
    </main>

    <Transition name="toast"><div v-if="toast" class="toast" role="status">{{ toast }}</div></Transition>
  </div>
</template>
