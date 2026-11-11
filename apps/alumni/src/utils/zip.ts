// Minimaler ZIP-Packer ohne Kompression (JPEGs lassen sich ohnehin kaum
// weiter verkleinern). Reicht, um mehrere Bilder als eine Datei anzubieten.

export type ZipEntry = { name: string; data: Uint8Array<ArrayBuffer> }

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i += 1) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function createZip(entries: ZipEntry[], date = new Date()): Blob {
  const encoder = new TextEncoder()
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  const UTF8_NAMES = 0x0800

  const parts: Uint8Array<ArrayBuffer>[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new Uint8Array(30 + name.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true)
    l.setUint16(6, UTF8_NAMES, true)
    l.setUint16(8, 0, true)
    l.setUint16(10, dosTime, true)
    l.setUint16(12, dosDate, true)
    l.setUint32(14, crc, true)
    l.setUint32(18, size, true)
    l.setUint32(22, size, true)
    l.setUint16(26, name.length, true)
    l.setUint16(28, 0, true)
    local.set(name, 30)
    parts.push(local, entry.data)

    const header = new Uint8Array(46 + name.length)
    const h = new DataView(header.buffer)
    h.setUint32(0, 0x02014b50, true)
    h.setUint16(4, 20, true)
    h.setUint16(6, 20, true)
    h.setUint16(8, UTF8_NAMES, true)
    h.setUint16(10, 0, true)
    h.setUint16(12, dosTime, true)
    h.setUint16(14, dosDate, true)
    h.setUint32(16, crc, true)
    h.setUint32(20, size, true)
    h.setUint32(24, size, true)
    h.setUint16(28, name.length, true)
    h.setUint32(42, offset, true)
    header.set(name, 46)
    central.push(header)

    offset += local.length + size
  }

  const centralSize = central.reduce((sum, item) => sum + item.length, 0)
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, entries.length, true)
  e.setUint16(10, entries.length, true)
  e.setUint32(12, centralSize, true)
  e.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}
