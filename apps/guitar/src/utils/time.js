export function formatMs(ms) {
  const s = Math.floor(ms / 1000)
  const msRem = ms % 1000
  return `${s}.${String(msRem).padStart(3, '0')}s`
}
