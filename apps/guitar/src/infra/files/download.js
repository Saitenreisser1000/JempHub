function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename, text, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType })
  triggerDownload(blob, filename)
}

export function downloadBinaryFile(filename, bytes, mimeType = 'application/octet-stream') {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const blob = new Blob([data], { type: mimeType })
  triggerDownload(blob, filename)
}
