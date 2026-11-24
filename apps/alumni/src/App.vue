<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { toJpeg, toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { createZip, type ZipEntry } from './utils/zip'
import SocialCard, { type AlumniRecord, type ContentBlock, type FormatKey } from './components/SocialCard.vue'

const formats: Record<FormatKey, { label: string; width: number; height: number }> = {
  portrait: { label: 'Hochformat', width: 1080, height: 1350 },
  square: { label: 'Quadrat', width: 1080, height: 1080 },
  story: { label: 'Story', width: 1080, height: 1920 },
}

const demo: AlumniRecord = {
  name: 'Marlene Beispiel',
  doubleFirstName: false,
  nameFontSize: 50,
  quoteFontSize: 100,
  educationFontSize: 100,
  contentFontSize: 100,
  paragraphSpacing: 100,
  bulletSpacing: 100,
  graduation: 'Matura 2018',
  profession: 'Ärztin',
  education: 'Medizinstudium an der Universität Wien',
  retrospective: 'Am Sternstein Gymnasium habe ich gelernt, neugierig zu bleiben, Fragen zu stellen und meinen eigenen Weg zu gehen.',
  contentBlocks: [{ heading: 'RÜCKBLICK', intro: 'Am Sternstein Gymnasium habe ich gelernt, neugierig zu bleiben und meinen eigenen Weg zu gehen.', bullets: ['Neugierig bleiben', 'Fragen stellen'], page: 2 }],
  quotes: ['Trau dich, deinen Weg zu verändern.'],
  image: '',
  photoCredit: '',
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
type StoredFile = { id: string; filename: string; mimeType: string; size: number; createdAt: string; alumniName?: string; format?: string; page?: number }
const storedFiles = ref<StoredFile[]>([])
const storageLoading = ref(false)
const storageOnline = ref(false)
const storageLabel = ref('Dateiarchiv')
const archiveFormat = ref<'png' | 'jpeg' | 'pdf'>('png')

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

const fileBase = computed(() => record.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'alumni')
const filename = computed(() => `${fileBase.value}-${format.value}`)

// Download-Menü: welche Formate heruntergeladen werden
const formatKeys = Object.keys(formats) as FormatKey[]
const downloadOpen = ref(false)
const downloadChoice = reactive<Record<FormatKey, boolean>>({ portrait: true, square: false, story: false })
const silentFormatSwitch = ref(false)
const pagesFor = (key: FormatKey) => key === 'story' ? 1 : pageCount.value
const downloadCount = computed(() => formatKeys.filter(key => downloadChoice[key]).reduce((sum, key) => sum + pagesFor(key), 0))
const downloadLabel = computed(() => downloadCount.value === 1 ? 'JPEG herunterladen' : `ZIP herunterladen · ${downloadCount.value} Bilder`)

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
  // Erst exportieren, wenn Schriften und Bilder (z. B. das Porträt) fertig geladen sind.
  await document.fonts?.ready
  await Promise.all(Array.from(element.querySelectorAll('img')).map(async (image) => {
    if (!image.complete) await new Promise<void>((resolve, reject) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => reject(new Error('Bild konnte nicht geladen werden')), { once: true }) })
    if (image.decode) await image.decode().catch(() => undefined)
  }))
  // Die Karte wird in Vorschaugröße gerendert und auf das Zielformat skaliert,
  // damit Schriften und Abstände genau wie in der Vorschau sitzen.
  const options = {
    width: element.offsetWidth,
    height: element.offsetHeight,
    canvasWidth: currentFormat.value.width,
    canvasHeight: currentFormat.value.height,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#08081f',
    style: { boxShadow: 'none', margin: '0' },
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

async function downloadSelection() {
  const targets = formatKeys.filter(key => downloadChoice[key])
  if (!targets.length) return
  downloadOpen.value = false
  busy.value = true
  silentFormatSwitch.value = true
  const previous = { format: format.value, page: page.value }
  try {
    const entries: { name: string; data: string }[] = []
    for (const target of targets) {
      format.value = target
      await nextTick()
      await wait(180) // Textanpassung an das neue Format nachziehen lassen
      const pages = pagesFor(target)
      for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
        page.value = pageNumber
        await nextTick()
        await wait(90)
        const label = formats[target].label.toLowerCase()
        const name = pages === 1 ? `${fileBase.value}-${label}.jpg` : `${fileBase.value}-${label}-seite-${pageNumber}.jpg`
        entries.push({ name, data: await capturePreview('jpeg') })
      }
    }
    if (entries.length === 1) {
      await downloadImageData(entries[0].data, entries[0].name)
      notify('JPEG wurde erstellt')
    } else {
      const files: ZipEntry[] = await Promise.all(entries.map(async entry => ({
        name: entry.name,
        data: new Uint8Array(await (await fetch(entry.data)).arrayBuffer()),
      })))
      const objectUrl = URL.createObjectURL(createZip(files))
      downloadDataUrl(objectUrl, `${fileBase.value}.zip`)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200)
      notify(`ZIP mit ${entries.length} Bildern wurde erstellt`)
    }
  } catch (error) {
    notify('Export fehlgeschlagen – bitte nochmals versuchen')
    console.error(error)
  } finally {
    format.value = previous.format
    await nextTick()
    page.value = previous.page
    await nextTick()
    silentFormatSwitch.value = false
    busy.value = false
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
    const [background, logo] = await Promise.all([loadImage('/background.jpg'), loadImage('/logo-absolventen.png')])
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
      const logoScale = Math.min(640 / logo.naturalWidth, 108 / logo.naturalHeight)
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

async function createPdfBlob() {
    const data = await renderImage('jpeg', 1)
    const { width, height } = currentFormat.value
    const pdf = new jsPDF({ orientation: height > width ? 'portrait' : 'landscape', unit: 'px', format: [width, height], hotfixes: ['px_scaling'] })
    pdf.addImage(data, 'JPEG', 0, 0, width, height)
    for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) {
      const additionalPage = await renderImage('jpeg', pageNumber)
      pdf.addPage([width, height], height > width ? 'portrait' : 'landscape')
      pdf.addImage(additionalPage, 'JPEG', 0, 0, width, height)
    }
    return pdf.output('blob')
}

async function exportPdf() {
  busy.value = true
  try {
    const blob = await createPdfBlob()
    const url = URL.createObjectURL(blob)
    downloadDataUrl(url, `${filename.value}.pdf`)
    window.setTimeout(() => URL.revokeObjectURL(url), 1200)
    notify('PDF wurde erstellt')
  } catch (error) {
    notify('PDF-Export fehlgeschlagen')
    console.error(error)
  } finally { busy.value = false }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  return btoa(binary)
}

async function uploadStoredFile(blob: Blob, storedFilename: string, targetPage: number) {
  const response = await fetch('/api/files', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: storedFilename, mimeType: blob.type, data: arrayBufferToBase64(await blob.arrayBuffer()), metadata: { alumniName: record.name.trim(), format: format.value, page: targetPage } }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Speichern fehlgeschlagen')
}

async function refreshStoredFiles(silent = false) {
  storageLoading.value = true
  try {
    const response = await fetch('/api/files')
    if (!response.ok) throw new Error('Archiv nicht erreichbar')
    const data = await response.json()
    storedFiles.value = Array.isArray(data) ? data : (data.files ?? [])
    const health = await fetch('/api/health').then(result => result.ok ? result.json() : null).catch(() => null)
    storageLabel.value = health?.storage === 'SharePoint' ? `SharePoint · ${health.detail}` : 'Lokales Dateiarchiv'
    storageOnline.value = true
  } catch (error) {
    storageOnline.value = false
    if (!silent) notify('Dateiarchiv ist nicht erreichbar')
    console.error(error)
  } finally { storageLoading.value = false }
}

async function saveFinishedFiles() {
  busy.value = true
  storageLoading.value = true
  try {
    if (archiveFormat.value === 'pdf') {
      await uploadStoredFile(await createPdfBlob(), `${filename.value}.pdf`, 0)
    } else {
      const ext = archiveFormat.value === 'jpeg' ? 'jpg' : 'png'
      const totalPages = hasSecondPage.value ? pageCount.value : 1
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const dataUrl = await renderImage(archiveFormat.value, pageNumber)
        const blob = await (await fetch(dataUrl)).blob()
        const pageSuffix = totalPages > 1 ? `-seite-${pageNumber}` : ''
        await uploadStoredFile(blob, `${filename.value}${pageSuffix}.${ext}`, pageNumber)
      }
    }
    await refreshStoredFiles(true)
    notify('Fertige Datei wurde im Archiv gespeichert')
  } catch (error) {
    notify('Speichern im Archiv fehlgeschlagen')
    console.error(error)
  } finally { busy.value = false; storageLoading.value = false }
}

async function removeStoredFile(id: string) {
  if (!window.confirm('Diese Datei wirklich aus dem Archiv löschen?')) return
  try {
    const response = await fetch(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Löschen fehlgeschlagen')
    storedFiles.value = storedFiles.value.filter(file => file.id !== id)
    notify('Datei wurde gelöscht')
  } catch (error) {
    notify('Datei konnte nicht gelöscht werden')
    console.error(error)
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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
    doubleFirstName: ['ja', 'true', '1', 'yes'].includes(get('Doppelter Vorname', 'doubleFirstName').trim().toLowerCase()),
    nameFontSize: 50,
    quoteFontSize: 100, educationFontSize: 100, contentFontSize: 100, paragraphSpacing: 100, bulletSpacing: 100,
    graduation: get('Abschlussjahr', 'Matura', 'graduation'),
    profession: get('Beruf', 'profession'),
    education: get('Ausbildung', 'education'),
    retrospective: get('Rückblick', 'Rueckblick', 'retrospective'),
    contentBlocks: [{ heading: 'RÜCKBLICK', intro: get('Rückblick', 'Rueckblick', 'retrospective'), bullets: [], page: 2 }].filter(block => block.intro),
    quotes: quotes.length ? quotes : [''],
    image: '', photoCredit: get('Fotocredit', 'Foto', 'Bildnachweis', 'photoCredit'), imageX: 50, imageY: 50, imageZoom: 100,
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

watch(format, () => { if (!silentFormatSwitch.value) notify(`${currentFormat.value.label}: ${currentFormat.value.width} × ${currentFormat.value.height} px`) })

onMounted(() => {
  loadLocal()
  refreshStoredFiles(true)
  for (let pageNumber = 2; pageNumber <= pageCount.value; pageNumber += 1) ensureContentBlockForPage(pageNumber)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <img src="/logo-absolventen.png" alt="Sternstein Gymnasium – Absolventen" />
        <span class="brand-divider"></span>
        <div><strong>Alumni-Editor</strong><small>Social Media Studio</small></div>
      </div>
      <details class="header-storage">
        <summary>
          <span class="header-storage-title"><strong>{{ storageLabel }}</strong><small>Fertige Dateien</small></span>
          <span class="storage-status" :class="{ online: storageOnline }">{{ storageOnline ? 'Verbunden' : 'Offline' }}</span>
        </summary>
        <section class="storage-panel" aria-label="Dateiarchiv">
          <div class="storage-heading">
            <div><strong>{{ storageLabel }}</strong><small>Fertige Dateien am Server ablegen</small></div>
            <span class="storage-status" :class="{ online: storageOnline }">{{ storageOnline ? 'Verbunden' : 'Nicht verbunden' }}</span>
          </div>
          <div class="storage-actions">
            <select v-model="archiveFormat" aria-label="Dateiformat für das Archiv">
              <option value="png">PNG</option><option value="jpeg">JPG</option><option value="pdf">PDF</option>
            </select>
            <button class="button button-dark" :disabled="busy || storageLoading || !storageOnline" @click="saveFinishedFiles">Im Archiv speichern</button>
            <button class="button button-white" :disabled="storageLoading" @click="refreshStoredFiles()">Aktualisieren</button>
          </div>
          <div v-if="storedFiles.length" class="stored-files">
            <div v-for="file in storedFiles" :key="file.id" class="stored-file">
              <div><strong>{{ file.filename }}</strong><small>{{ new Date(file.createdAt).toLocaleString('de-AT') }} · {{ formatBytes(file.size) }}</small></div>
              <div class="stored-file-actions">
                <a class="text-button" :href="`/api/files/${encodeURIComponent(file.id)}/download`">Laden</a>
                <button class="text-button danger" @click="removeStoredFile(file.id)">Löschen</button>
              </div>
            </div>
          </div>
          <p v-else-if="storageOnline && !storageLoading" class="empty-hint">Noch keine fertigen Dateien gespeichert.</p>
        </section>
      </details>
      <div class="header-actions">
        <button class="button button-ghost" @click="loadLocal">Entwurf laden</button>
        <button class="button button-dark" @click="saveLocally">Entwurf speichern</button>
        <div class="download-menu">
          <button class="button button-white" :disabled="busy" :aria-expanded="downloadOpen" aria-haspopup="dialog" @click="downloadOpen = !downloadOpen">{{ busy ? 'Wird erstellt …' : 'Herunterladen' }}</button>
          <div v-if="downloadOpen" class="download-backdrop" @click="downloadOpen = false"></div>
          <div v-if="downloadOpen" class="download-popover" role="dialog" aria-label="Formate herunterladen" @keydown.esc="downloadOpen = false">
            <label v-for="key in formatKeys" :key="key" class="download-option">
              <input v-model="downloadChoice[key]" type="checkbox" />
              <span>
                <strong>{{ formats[key].label }}</strong>
                <small>{{ formats[key].width }} × {{ formats[key].height }}<template v-if="pagesFor(key) > 1"> · {{ pagesFor(key) }} Seiten</template></small>
              </span>
            </label>
            <button class="button button-dark" :disabled="!downloadCount" @click="downloadSelection">{{ downloadCount ? downloadLabel : 'Format wählen' }}</button>
          </div>
        </div>
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
            <label class="checkbox-field field-wide">
              <input v-model="record.doubleFirstName" type="checkbox" />
              <span><strong>Doppelter Vorname</strong><small>Die ersten beiden Namen stehen gemeinsam in der ersten Zeile.</small></span>
            </label>
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
          <label class="field photo-credit-field"><span>Fotocredit</span><input v-model="record.photoCredit" placeholder="z. B. Foto: Max Mustermann" /></label>
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
          <label class="field"><span>Schriftgröße Zitat: {{ record.quoteFontSize ?? 100 }} %</span><input v-model.number="record.quoteFontSize" type="range" min="70" max="280" step="5" /></label>
        </div>

        <div v-if="format !== 'story'" class="form-section typography-controls">
          <h2>Schrift und Abstände</h2>
          <label class="field"><span>Werdegang: {{ record.educationFontSize ?? 100 }} %</span><input v-model.number="record.educationFontSize" type="range" min="70" max="280" step="5" /></label>
          <label class="field"><span>Text ab Seite 2: {{ record.contentFontSize ?? 100 }} %</span><input v-model.number="record.contentFontSize" type="range" min="70" max="280" step="5" /></label>
          <label class="field"><span>Absatzabstand: {{ record.paragraphSpacing ?? 100 }} %</span><input v-model.number="record.paragraphSpacing" type="range" min="0" max="400" step="10" /></label>
          <label class="field"><span>Abstand Stichpunkte: {{ record.bulletSpacing ?? 100 }} %</span><input v-model.number="record.bulletSpacing" type="range" min="0" max="400" step="10" /></label>
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
            <button
              v-for="(item, key) in formats"
              :key="key"
              :class="{ active: format === key }"
              :disabled="key === 'story'"
              :title="key === 'story' ? 'Story-Format ist derzeit nicht aktiviert' : undefined"
              @click="format = key as FormatKey"
            >{{ item.label }}</button>
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

        <div class="export-bar">
          <button class="button button-white" :disabled="busy" @click="exportRaster('png')">PNG herunterladen</button>
          <button class="button button-white" :disabled="busy" @click="exportRaster('jpeg')">JPG herunterladen</button>
          <button class="button button-dark" :disabled="busy" @click="exportPdf">PDF herunterladen</button>
        </div>

      </section>
    </main>

    <Transition name="toast"><div v-if="toast" class="toast" role="status">{{ toast }}</div></Transition>
  </div>
</template>
