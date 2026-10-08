import { Howler } from 'howler'

const MANIFEST_URL = '/audio/vpo/manifest.json'
const manifestCache = {
    promise: null,
    value: null
}
const bufferPromises = new Map()

export async function preloadIntonationInstrument(instrument) {
    const ctx = Howler.ctx
    if (!ctx || instrument === 'piano') return

    const regions = await getInstrumentRegions(instrument)
    await Promise.all(regions.map((region) => loadBuffer(ctx, region.url)))
}

export async function playIntonationSample(instrument, tone, options = {}) {
    const ctx = Howler.ctx
    if (!ctx) {
        throw new Error('Audio context unavailable')
    }

    const regions = await getInstrumentRegions(instrument)
    const toneMidi = toneToMidi(tone)
    const region = selectRegion(regions, toneMidi)
    if (!region) {
        throw new Error(`No sample region found for ${instrument}:${tone}`)
    }

    const buffer = await loadBuffer(ctx, region.url)
    const source = ctx.createBufferSource()
    const output = ctx.createGain()
    const now = ctx.currentTime
    const duration = Math.max(0.7, (options.fadeMs || 900) / 1000)
    const attack = 0.015
    const end = now + duration
    const centsOffset = ((toneMidi - region.pitchKeycenterMidi) * 100) - (region.tuneCents || 0)
    const playbackRate = Math.pow(2, centsOffset / 1200) * (options.rate || 1)
    const sampleGain = dbToGain(region.gainDb || 0)

    source.buffer = buffer
    source.playbackRate.setValueAtTime(playbackRate, now)
    output.gain.setValueAtTime(0.0001, now)
    output.gain.linearRampToValueAtTime(sampleGain, now + attack)
    output.gain.setValueAtTime(sampleGain, Math.max(now + attack, end - 0.08))
    output.gain.exponentialRampToValueAtTime(0.0001, end)

    if (typeof ctx.createStereoPanner === 'function' && region.pan) {
        const panner = ctx.createStereoPanner()
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, region.pan / 100)), now)
        source.connect(output)
        output.connect(panner)
        panner.connect(ctx.destination)
    } else {
        source.connect(output)
        output.connect(ctx.destination)
    }

    source.start(now)
    source.stop(end + 0.05)
}

async function getInstrumentRegions(instrument) {
    const manifest = await loadManifest()
    const instrumentData = manifest?.instruments?.[instrument]
    if (!instrumentData?.regions?.length) {
        throw new Error(`No manifest data for ${instrument}`)
    }
    return instrumentData.regions
}

async function loadManifest() {
    if (manifestCache.value) return manifestCache.value
    if (!manifestCache.promise) {
        manifestCache.promise = fetch(MANIFEST_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Manifest request failed with ${response.status}`)
                }
                return response.json()
            })
            .then((manifest) => {
                manifestCache.value = manifest
                return manifest
            })
    }
    return manifestCache.promise
}

function loadBuffer(ctx, url) {
    const existing = bufferPromises.get(url)
    if (existing) return existing

    const promise = fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Sample request failed with ${response.status}`)
            }
            return response.arrayBuffer()
        })
        .then((buffer) => ctx.decodeAudioData(buffer.slice(0)))

    bufferPromises.set(url, promise)
    return promise
}

function selectRegion(regions, toneMidi) {
    const directMatch = regions.find((region) => toneMidi >= region.lokeyMidi && toneMidi <= region.hikeyMidi)
    if (directMatch) return directMatch

    return regions.reduce((closest, region) => {
        if (!closest) return region
        const currentDistance = Math.abs(toneMidi - region.pitchKeycenterMidi)
        const closestDistance = Math.abs(toneMidi - closest.pitchKeycenterMidi)
        return currentDistance < closestDistance ? region : closest
    }, null)
}

function toneToMidi(tone) {
    const match = /^([A-G])s?(\d)$/.exec(tone)
    if (!match) {
        throw new Error(`Invalid tone: ${tone}`)
    }

    const noteName = tone.includes('s') ? `${match[1]}#` : match[1]
    const semitoneOffsets = {
        C: 0,
        'C#': 1,
        D: 2,
        'D#': 3,
        E: 4,
        F: 5,
        'F#': 6,
        G: 7,
        'G#': 8,
        A: 9,
        'A#': 10,
        B: 11
    }
    return ((Number(match[2]) + 1) * 12) + semitoneOffsets[noteName]
}

function dbToGain(db) {
    return Math.pow(10, db / 20)
}
