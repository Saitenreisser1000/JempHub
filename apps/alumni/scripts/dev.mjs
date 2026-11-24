import { spawn } from 'node:child_process'

const children = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }),
  spawn('npm', ['run', 'dev:frontend'], { stdio: 'inherit' }),
]

let stopping = false
function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal))
for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping && code !== 0) {
      stop()
      process.exitCode = code ?? 1
    }
  })
}
