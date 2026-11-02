// Baut dist/ für die Veröffentlichung: das Spiel ist eine einzelne, eigenständige Seite.
import { cp, mkdir, rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const files = ['index.html', 'icon.svg', 'manifest.webmanifest'];

await Promise.all(files.map(file => access(resolve(root, file))));
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(root, 'dist', file));
console.log('supersam: dist/ gebaut');
