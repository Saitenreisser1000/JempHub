import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const EXPERIMENT_BRANCH = 'experiment/codex-autonomous-guitar'
const VERSION_FILES = [
  'apps/guitar/package.json',
  'apps/guitar/package-lock.json',
  'package-lock.json',
]

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim()

const branch = git('branch', '--show-current')
if (branch !== EXPERIMENT_BRANCH) process.exit(0)

const root = git('rev-parse', '--show-toplevel')
const manifestPath = 'apps/guitar/package.json'
const headManifest = JSON.parse(git('show', `HEAD:${manifestPath}`))
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(headManifest.version)

if (!match) {
  console.error(`Cannot bump invalid GuitarJemp version: ${headManifest.version}`)
  process.exit(1)
}

const nextVersion = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`

const updateJson = (relativePath, update) => {
  const absolutePath = resolve(root, relativePath)
  const json = JSON.parse(readFileSync(absolutePath, 'utf8'))
  update(json)
  writeFileSync(absolutePath, `${JSON.stringify(json, null, 2)}\n`)
}

updateJson(manifestPath, (json) => {
  json.version = nextVersion
})

updateJson('apps/guitar/package-lock.json', (json) => {
  json.version = nextVersion
  json.packages[''].version = nextVersion
})

updateJson('package-lock.json', (json) => {
  json.packages['apps/guitar'].version = nextVersion
})

git('add', '--', ...VERSION_FILES)
console.log(`GuitarJemp experiment version: ${headManifest.version} -> ${nextVersion}`)
