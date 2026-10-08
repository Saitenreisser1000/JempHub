const [major, minor, patch] = process.versions.node.split('.').map(Number)

// Vite 7 requires Node 20.19+ or 22.12+
const ok =
  (major === 20 && (minor > 19 || (minor === 19 && patch >= 0))) ||
  (major === 22 && (minor > 12 || (minor === 12 && patch >= 0))) ||
  major > 22

if (!ok) {
  console.error(
    `\nNode.js ${process.versions.node} detected. This project requires Node 20.19+ (or 22.12+).\n` +
      `Tip: run "nvm use" (see .nvmrc) and try again.\n`,
  )
  process.exit(1)
}
