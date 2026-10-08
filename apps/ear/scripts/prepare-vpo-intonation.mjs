import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const projectRoot = process.cwd()
const standardScriptsDir = process.argv[2] || '/private/tmp/vpo-standard/Virtual-Playing-Orchestra3'
const waveZipPath = process.argv[3] || '/private/tmp/Virtual-Playing-Orchestra3-1-wave-files.zip'
const outputRoot = path.join(projectRoot, 'public', 'audio', 'vpo')
const extractRoot = path.join('/private/tmp', 'vpo-intonation-extract')
const noteRange = {
    min: noteNameToMidi('f#2'),
    max: noteNameToMidi('c5')
}
const instrumentConfigs = {
    strings: {
        sfz: path.join(standardScriptsDir, 'Strings', 'all-strings-SEC-sustain.sfz'),
        outputDir: path.join(outputRoot, 'strings')
    },
    brass: {
        sfz: path.join(standardScriptsDir, 'Brass', 'all-brass-SEC-sustain.sfz'),
        outputDir: path.join(outputRoot, 'brass')
    },
    woodwinds: {
        sfz: path.join(standardScriptsDir, 'Woodwinds', 'all-woodwinds-SEC-sustain.sfz'),
        outputDir: path.join(outputRoot, 'woodwinds')
    }
}

main()

function main() {
    assertExists(standardScriptsDir, 'VPO standard scripts directory not found')
    assertExists(waveZipPath, 'VPO wave zip not found')

    fs.rmSync(outputRoot, { recursive: true, force: true })
    fs.mkdirSync(outputRoot, { recursive: true })
    fs.rmSync(extractRoot, { recursive: true, force: true })
    fs.mkdirSync(extractRoot, { recursive: true })

    const manifest = {
        source: 'Virtual Playing Orchestra',
        generatedAt: new Date().toISOString(),
        noteRange: {
            min: 'Fs2',
            max: 'C5'
        },
        instruments: {}
    }

    for (const [instrument, config] of Object.entries(instrumentConfigs)) {
        const regions = parseSfzRegions(config.sfz)
            .filter(regionOverlapsRange)
            .map(normalizeRegion)
            .filter((region) => region.samplePath && region.keycenterMidi !== null)

        const uniqueRegions = dedupeRegions(regions)
        fs.mkdirSync(config.outputDir, { recursive: true })

        for (const region of uniqueRegions) {
            const extractedWav = extractSample(region.samplePath, instrument)
            const encodedFile = encodeSample(extractedWav, config.outputDir, instrument)
            region.url = `/audio/vpo/${instrument}/${path.basename(encodedFile)}`
        }

        manifest.instruments[instrument] = {
            name: instrument,
            regions: uniqueRegions.map((region) => ({
                url: region.url,
                lokey: midiToAppNote(region.loKeyMidi),
                hikey: midiToAppNote(region.hiKeyMidi),
                pitchKeycenter: midiToAppNote(region.keycenterMidi),
                lokeyMidi: region.loKeyMidi,
                hikeyMidi: region.hiKeyMidi,
                pitchKeycenterMidi: region.keycenterMidi,
                tuneCents: region.tuneCents,
                gainDb: region.gainDb,
                pan: region.pan
            }))
        }
    }

    fs.writeFileSync(
        path.join(outputRoot, 'manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
    )
    fs.writeFileSync(
        path.join(outputRoot, 'README.txt'),
        [
            'Audio subset generated from Virtual Playing Orchestra.',
            'Source: https://virtualplaying.com/virtual-playing-orchestra/',
            'This subset is intended for the ear-training intonation modes in this project.'
        ].join('\n') + '\n'
    )

    console.log(`Generated VPO intonation assets in ${outputRoot}`)
}

function parseSfzRegions(sfzPath) {
    const lines = fs.readFileSync(sfzPath, 'utf8').split(/\r?\n/)
    const regions = []
    let currentGroup = {}
    let currentRegion = null

    for (const rawLine of lines) {
        const line = rawLine.split('//')[0].trim()
        if (!line) continue

        if (line.includes('<group>')) {
            currentGroup = {}
            currentRegion = null
            applyAttrs(currentGroup, line.replace('<group>', ' '))
            continue
        }

        if (line.includes('<region>')) {
            currentRegion = { ...currentGroup }
            applyAttrs(currentRegion, line.replace('<region>', ' '))
            regions.push(currentRegion)
            continue
        }

        if (currentRegion) {
            applyAttrs(currentRegion, line)
            continue
        }

        applyAttrs(currentGroup, line)
    }

    return regions
}

function applyAttrs(target, line) {
    const keyPattern = /([A-Za-z0-9_]+)=/g
    const matches = [...line.matchAll(keyPattern)]

    for (let index = 0; index < matches.length; index += 1) {
        const current = matches[index]
        const next = matches[index + 1]
        const valueStart = current.index + current[0].length
        const valueEnd = next ? next.index : line.length
        target[current[1]] = line.slice(valueStart, valueEnd).trim()
    }
}

function regionOverlapsRange(region) {
    const lo = noteNameToMidi(region.lokey || region.key)
    const hi = noteNameToMidi(region.hikey || region.key)
    return lo !== null && hi !== null && hi >= noteRange.min && lo <= noteRange.max
}

function normalizeRegion(region) {
    const loKeyMidi = noteNameToMidi(region.lokey || region.key)
    const hiKeyMidi = noteNameToMidi(region.hikey || region.key)
    const keycenterMidi = noteNameToMidi(region.pitch_keycenter || region.key)
    const sampleParts = (region.sample || '')
        .replace(/\\/g, '/')
        .split('/')
        .filter((part) => part && part !== '..')
    const samplePath = sampleParts.length ? path.posix.join('Virtual-Playing-Orchestra3', ...sampleParts) : null

    return {
        samplePath,
        loKeyMidi,
        hiKeyMidi,
        keycenterMidi,
        tuneCents: Number(region.tune || 0),
        gainDb: Number(region.volume || 0),
        pan: Number(region.pan || 0)
    }
}

function dedupeRegions(regions) {
    const seen = new Set()
    const result = []

    for (const region of regions) {
        const key = [
            region.samplePath,
            region.loKeyMidi,
            region.hiKeyMidi,
            region.keycenterMidi,
            region.tuneCents,
            region.gainDb,
            region.pan
        ].join('|')
        if (seen.has(key)) continue
        seen.add(key)
        result.push(region)
    }

    return result
}

function extractSample(zipMemberPath, instrument) {
    const extractionDir = path.join(extractRoot, instrument)
    fs.mkdirSync(extractionDir, { recursive: true })

    execFileSync('unzip', ['-j', '-o', waveZipPath, zipMemberPath, '-d', extractionDir], {
        stdio: 'ignore'
    })

    const extractedFile = path.join(extractionDir, path.basename(zipMemberPath))
    assertExists(extractedFile, `Failed to extract ${zipMemberPath}`)
    return extractedFile
}

function encodeSample(inputPath, outputDir, instrument) {
    const baseName = path.basename(inputPath, path.extname(inputPath))
    const safeBaseName = sanitizeFileName(baseName)
    const outputName = `${instrument}-${safeBaseName}.mp3`
    const outputPath = path.join(outputDir, outputName)

    execFileSync('ffmpeg', [
        '-y',
        '-i',
        inputPath,
        '-codec:a',
        'libmp3lame',
        '-q:a',
        '4',
        outputPath
    ], {
        stdio: 'ignore'
    })

    return outputPath
}

function sanitizeFileName(name) {
    return name
        .replace(/#/g, 'sharp')
        .replace(/\s+/g, '-')
        .replace(/[^A-Za-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
}

function noteNameToMidi(note) {
    if (!note) return null
    const match = /^([a-gA-G])([#b]?)(-?\d+)$/.exec(note.trim())
    if (!match) return null

    const letter = match[1].toUpperCase()
    const accidental = match[2]
    const octave = Number(match[3])
    const baseOffsets = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11
    }
    let semitone = baseOffsets[letter]
    if (accidental === '#') semitone += 1
    if (accidental === 'b') semitone -= 1
    return ((octave + 1) * 12) + semitone
}

function midiToAppNote(midi) {
    const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
    const noteName = noteNames[midi % 12]
    const octave = Math.floor(midi / 12) - 1
    return `${noteName}${octave}`
}

function assertExists(targetPath, message) {
    if (!fs.existsSync(targetPath)) {
        throw new Error(`${message}: ${targetPath}`)
    }
}
