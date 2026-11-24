import { createServer } from 'node:http'
import { stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLocalStorage, createSharePointStorage } from './storage.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const storageRoot = resolve(process.env.STORAGE_DIR || join(root, 'storage', 'exports'))
const distRoot = join(root, 'dist')
const port = Number(process.env.PORT || 3001)
// Standard: nur lokal erreichbar (hinter nginx). Für andere Umgebungen per HOST=0.0.0.0 öffnen.
const host = process.env.HOST || '127.0.0.1'
const maxBodySize = 35 * 1024 * 1024
const storage = process.env.STORAGE_PROVIDER === 'sharepoint' ? createSharePointStorage() : await createLocalStorage(storageRoot)

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  response.end(body)
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodySize) throw Object.assign(new Error('Datei ist zu groß'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Ungültige Anfrage'), { status: 400 })
  }
}

function fileIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/files\/([^/]+)(?:\/download)?$/)
  return match ? decodeURIComponent(match[1]) : undefined
}

function currentUser(request) {
  const encoded = request.headers['x-ms-client-principal']
  if (!encoded) return null
  try {
    const principal = JSON.parse(Buffer.from(String(encoded), 'base64').toString('utf8'))
    return { id: principal.userId, name: principal.userDetails, roles: principal.userRoles || [] }
  } catch { return null }
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const normalized = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '')
  let filePath = resolve(distRoot, normalized)
  if (!filePath.startsWith(distRoot)) return false
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return false
  } catch {
    filePath = join(distRoot, 'index.html')
    try { await stat(filePath) } catch { return false }
  }
  const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
  ]).get(extname(filePath).toLowerCase()) || 'application/octet-stream'
  response.writeHead(200, { 'Content-Type': mime })
  createReadStream(filePath).pipe(response)
  return true
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  try {
    if (process.env.REQUIRE_AUTH === 'true' && url.pathname.startsWith('/api/') && url.pathname !== '/api/health' && !currentUser(request)) {
      return sendJson(response, 401, { error: 'Bitte mit dem Schulkonto anmelden.' })
    }
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, 200, { ok: true, storage: storage.name, detail: storage.detail, authentication: process.env.REQUIRE_AUTH === 'true' })
    }

    if (url.pathname === '/api/me' && request.method === 'GET') {
      return sendJson(response, 200, { user: currentUser(request) })
    }

    if (url.pathname === '/api/files' && request.method === 'GET') {
      const items = await storage.list()
      return sendJson(response, 200, { files: items })
    }

    if (url.pathname === '/api/files' && request.method === 'POST') {
      const body = await readJsonBody(request)
      const item = await storage.save(body)
      return sendJson(response, 201, { file: item })
    }

    const id = fileIdFromPath(url.pathname)
    if (id && request.method === 'GET' && url.pathname.endsWith('/download')) {
      const download = await storage.download(id)
      if (!download) return sendJson(response, 404, { error: 'Datei nicht gefunden.' })
      if (download.redirect) { response.writeHead(302, { Location: download.redirect }); return response.end() }
      if (download.webResponse) {
        response.writeHead(200, { 'Content-Type': download.item.mimeType, 'Content-Length': download.size })
        return download.webResponse.body.pipeTo(new WritableStream({ write(chunk) { response.write(Buffer.from(chunk)) }, close() { response.end() } }))
      }
      response.writeHead(200, {
        'Content-Type': download.item.mimeType,
        'Content-Length': download.size,
        'Content-Disposition': `attachment; filename="${download.item.filename.replace(/["\\]/g, '')}"`,
      })
      return download.stream.pipe(response)
    }

    if (id && request.method === 'DELETE') {
      if (!await storage.remove(id)) return sendJson(response, 404, { error: 'Datei nicht gefunden.' })
      response.writeHead(204)
      return response.end()
    }

    if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: 'Unbekannter API-Endpunkt.' })
    if (await serveStatic(url.pathname, response)) return
    return sendJson(response, 404, { error: 'Frontend wurde noch nicht gebaut.' })
  } catch (error) {
    console.error(error)
    return sendJson(response, error.status || 500, { error: error.message || 'Interner Serverfehler' })
  }
})

server.listen(port, host, () => {
  console.log(`Alumni-Backend: http://${host}:${port}`)
  console.log(`Dateiablage: ${storage.name} (${storage.detail})`)
})
