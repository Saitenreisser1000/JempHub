import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const allowedTypes = new Map([['image/png', '.png'], ['image/jpeg', '.jpg'], ['application/pdf', '.pdf'], ['application/zip', '.zip']])

export function safeBaseName(value) {
  return String(value || 'export').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'export'
}

export function validateUpload(body) {
  const extension = allowedTypes.get(body.mimeType)
  if (!extension) throw Object.assign(new Error('Nur PNG, JPG, PDF und ZIP sind erlaubt.'), { status: 415 })
  if (typeof body.data !== 'string' || !body.data) throw Object.assign(new Error('Dateiinhalt fehlt.'), { status: 400 })
  const buffer = Buffer.from(body.data, 'base64')
  if (!buffer.length || buffer.length > 25 * 1024 * 1024) throw Object.assign(new Error('Datei ist leer oder größer als 25 MB.'), { status: 413 })
  const originalBase = safeBaseName(body.filename).replace(/\.(png|jpe?g|pdf|zip)$/i, '')
  return { buffer, filename: `${originalBase}${extension}`, mimeType: body.mimeType }
}

export async function createLocalStorage(storageRoot) {
  const root = resolve(storageRoot)
  const metadataPath = join(root, 'index.json')
  await mkdir(root, { recursive: true })
  async function readIndex() {
    try { const parsed = JSON.parse(await readFile(metadataPath, 'utf8')); return Array.isArray(parsed) ? parsed : [] }
    catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  async function writeIndex(items) { await writeFile(metadataPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8') }
  return {
    name: 'Lokal', detail: root,
    async list() { return (await readIndex()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) },
    async save(body) {
      const { buffer, filename, mimeType } = validateUpload(body)
      const id = randomUUID(); const storedName = `${id}-${filename}`
      await writeFile(join(root, storedName), buffer, { flag: 'wx' })
      const item = { id, filename, storedName, mimeType, size: buffer.length, createdAt: new Date().toISOString(), alumniName: String(body.metadata?.alumniName || ''), format: String(body.metadata?.format || ''), page: Number(body.metadata?.page || 1) }
      const items = await readIndex(); items.push(item); await writeIndex(items)
      return item
    },
    async download(id) {
      const item = (await readIndex()).find(entry => entry.id === id)
      if (!item) return null
      const path = join(root, item.storedName); const info = await stat(path)
      return { item, size: info.size, stream: createReadStream(path) }
    },
    async remove(id) {
      const items = await readIndex(); const item = items.find(entry => entry.id === id)
      if (!item) return false
      await unlink(join(root, item.storedName)).catch(error => { if (error.code !== 'ENOENT') throw error })
      await writeIndex(items.filter(entry => entry.id !== id)); return true
    },
  }
}

export function createSharePointStorage() {
  const required = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'SHAREPOINT_DRIVE_ID']
  const missing = required.filter(name => !process.env[name])
  if (missing.length) throw new Error(`Fehlende SharePoint-Einstellungen: ${missing.join(', ')}`)
  const folder = (process.env.SHAREPOINT_FOLDER || 'Alumni/Fertige Beitraege').split('/').map(encodeURIComponent).join('/')
  let cachedToken = ''; let tokenExpiresAt = 0
  async function token() {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken
    const form = new URLSearchParams({ client_id: process.env.AZURE_CLIENT_ID, client_secret: process.env.AZURE_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
    const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(process.env.AZURE_TENANT_ID)}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    if (!response.ok) throw new Error(`Microsoft-Anmeldung fehlgeschlagen (${response.status})`)
    const data = await response.json(); cachedToken = data.access_token; tokenExpiresAt = Date.now() + Math.max(60, data.expires_in - 120) * 1000
    return cachedToken
  }
  async function graph(path, options = {}) {
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, { ...options, headers: { Authorization: `Bearer ${await token()}`, ...(options.headers || {}) } })
    if (!response.ok && response.status !== 404) { const text = await response.text(); throw new Error(`SharePoint-Fehler ${response.status}: ${text.slice(0, 300)}`) }
    return response
  }
  const drive = encodeURIComponent(process.env.SHAREPOINT_DRIVE_ID)
  return {
    name: 'SharePoint', detail: process.env.SHAREPOINT_FOLDER || 'Alumni/Fertige Beiträge',
    async list() {
      const response = await graph(`/drives/${drive}/root:/${folder}:/children?$select=id,name,size,createdDateTime,file`)
      if (response.status === 404) return []
      const data = await response.json()
      return data.value.filter(item => item.file).map(item => ({ id: item.id, filename: item.name, mimeType: item.file.mimeType, size: item.size, createdAt: item.createdDateTime }))
    },
    async save(body) {
      const { buffer, filename, mimeType } = validateUpload(body)
      const response = await graph(`/drives/${drive}/root:/${folder}/${encodeURIComponent(filename)}:/content`, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: buffer })
      const item = await response.json()
      return { id: item.id, filename: item.name, mimeType, size: item.size, createdAt: item.createdDateTime }
    },
    async download(id) {
      const response = await graph(`/drives/${drive}/items/${encodeURIComponent(id)}/content`, { redirect: 'manual' })
      if (response.status === 404) return null
      const location = response.headers.get('location')
      if (location) return { redirect: location }
      return { item: { filename: 'download', mimeType: response.headers.get('content-type') || 'application/octet-stream' }, size: Number(response.headers.get('content-length') || 0), webResponse: response }
    },
    async remove(id) { const response = await graph(`/drives/${drive}/items/${encodeURIComponent(id)}`, { method: 'DELETE' }); return response.status !== 404 },
  }
}
