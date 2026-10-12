// A transport run owns both pending asynchronous work and scheduled audio nodes.
export function createAudioRun() {
  const controller = new AbortController()
  return { signal: controller.signal, cancel: () => controller.abort() }
}

export function canSchedule(ctx, { signal, startAt } = {}) {
  return !signal?.aborted && ctx.state === 'running'
    && (!Number.isFinite(startAt) || startAt >= ctx.currentTime - 0.025)
}

export function trackAudioSource(source, gain, signal) {
  const cancel = () => {
    try { source.stop() } catch { /* Already stopped. */ }
    source.disconnect()
    gain.disconnect()
    signal?.removeEventListener('abort', cancel)
  }
  source.onended = () => {
    source.disconnect()
    gain.disconnect()
    signal?.removeEventListener('abort', cancel)
  }
  signal?.addEventListener('abort', cancel, { once: true })
}
