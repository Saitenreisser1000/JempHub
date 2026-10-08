let sharedAudioCtx

export function getSharedAudioContext() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!Ctx) return null
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx()
  return sharedAudioCtx
}

export async function ensureAudioContextRunning(ctx = getSharedAudioContext()) {
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // ignore
    }
  }
}

