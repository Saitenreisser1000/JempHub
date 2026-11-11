// Baut dist/ für die Veröffentlichung: das Spiel ist eine einzelne, eigenständige Seite; die Level-Dateien aus levels/
// (Stand aus dem Labor übernommen) werden dabei eingebaut.
import { cp, mkdir, rm, access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inlineLevels } from './levels.mjs';

const root = import.meta.dirname;
const files = ['icon.svg', 'manifest.webmanifest'];

await Promise.all([...files, 'index.html'].map(file => access(resolve(root, file))));
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(root, 'dist', file));
const { html, ids } = inlineLevels(await readFile(resolve(root, 'index.html'), 'utf8'), resolve(root, 'levels'));
await writeFile(resolve(root, 'dist/index.html'), html);
console.log(`supersam: dist/ gebaut (Levels: ${ids.length ? ids.join(', ') : 'keine'})`);
