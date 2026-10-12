import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

let ctx
let sampler
let sources
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(async () => {
  vi.resetModules()
  sources = []
  ctx = {
    currentTime: 10, state: 'running', destination: {}, resume: vi.fn(),
    decodeAudioData: vi.fn(async () => ({ duration: 2 })),
    createBufferSource: vi.fn(() => {
      const source = { playbackRate: {}, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }
      sources.push(source)
      return source
    }),
    createGain: () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
  }
  vi.stubGlobal('AudioContext', class { constructor() { return ctx } })
  vi.stubGlobal('window', { location: { href: 'http://localhost/' } })
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ samples: [{ midi: 60, url: 'sample.wav' }] }),
    arrayBuffer: async () => new ArrayBuffer(4),
  })))
  sampler = await import('./sampleSampler')
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('sampler deadlines and cancellation', () => {
  it('does not burst overdue notes when a shared sample finishes decoding', async () => {
    const decode = deferred()
    ctx.decodeAudioData.mockReturnValue(decode.promise)
    const notes = [10.1, 10.2, 10.3].map((startAt) => sampler.playMidiWithSampler('/manifest.json', 60, { startAt }))
    await vi.waitFor(() => expect(ctx.decodeAudioData).toHaveBeenCalledOnce())
    ctx.currentTime = 12
    decode.resolve({ duration: 2 })
    await Promise.all(notes)
    expect(ctx.createBufferSource).not.toHaveBeenCalled()
  })

  it('keeps the original audio deadline after an asynchronous decode', async () => {
    const decode = deferred()
    ctx.decodeAudioData.mockReturnValue(decode.promise)
    const note = sampler.playMidiWithSampler('/manifest.json', 60, { startAt: 10.2 })
    await vi.waitFor(() => expect(ctx.decodeAudioData).toHaveBeenCalledOnce())
    ctx.currentTime = 10.1
    decode.resolve({ duration: 2 })
    await note
    expect(sources[0].start).toHaveBeenCalledWith(10.2)
  })

  it('invalidates a note that is still loading after Stop', async () => {
    const decode = deferred()
    const run = new AbortController()
    ctx.decodeAudioData.mockReturnValue(decode.promise)
    const note = sampler.playMidiWithSampler('/manifest.json', 60, { startAt: 11, signal: run.signal })
    await vi.waitFor(() => expect(ctx.decodeAudioData).toHaveBeenCalledOnce())
    run.abort()
    decode.resolve({ duration: 2 })
    await note
    expect(sources).toHaveLength(0)
  })

  it('stops already scheduled sources on cancellation and disconnects them', async () => {
    const run = new AbortController()
    await sampler.playMidiWithSampler('/manifest.json', 60, { startAt: 11, signal: run.signal })
    run.abort()
    expect(sources[0].stop).toHaveBeenLastCalledWith()
    expect(sources[0].disconnect).toHaveBeenCalledOnce()
  })

  it('requires every sample to decode and allows retry after failure', async () => {
    ctx.decodeAudioData.mockRejectedValueOnce(new Error('decode failed'))
    await expect(sampler.initSamplerEngine('/manifest.json', { strict: true })).rejects.toThrow('decode failed')
    await expect(sampler.initSamplerEngine('/manifest.json', { strict: true })).resolves.toBeUndefined()
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(2)
  })

  it('does not report the engine ready until decoding is complete', async () => {
    const { initAudioEngine } = await import('./simpleSynth')
    ctx.createOscillator = () => ({ type: '', frequency: {}, connect() {}, disconnect() {}, start() {}, stop() {} })
    const decode = deferred()
    ctx.decodeAudioData.mockReturnValue(decode.promise)
    let ready = false
    const loading = initAudioEngine({ instrumentType: 'guitar', strict: true }).then(() => { ready = true })
    await vi.waitFor(() => expect(ctx.decodeAudioData).toHaveBeenCalledOnce())
    expect(ready).toBe(false)
    decode.resolve({ duration: 2 })
    await loading
    expect(ready).toBe(true)
  })

  it('does not play through a suspended audio context' , async () => {
    ctx.state = 'suspended'
    await sampler.playMidiWithSampler('/manifest.json', 60, { startAt: 11 })
    expect(sources).toHaveLength(0)
  })
})
