import { cp, mkdir, rm, access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const app = process.argv[2];
if (!['hub', 'stemplayer', 'guitar', 'note', 'ear', 'conduct'].includes(app)) throw new Error('Expected hub, stemplayer, guitar, note, ear or conduct');
const root = resolve(import.meta.dirname, '..', 'apps', app);
const files = {
  hub: ['index.html', 'styles.css', 'hub.js', 'design-system', 'vendor'],
  stemplayer: ['index.html', 'styles.css', 'app.js', 'playlist.json'],
  guitar: ['index.html', 'favicon.svg', 'src', 'vendor'],
  note: ['index.html', 'icon.svg', 'manifest.webmanifest', 'src', 'vendor'],
  ear: ['index.html', 'icon.svg', 'manifest.webmanifest', 'src', 'vendor'],
  conduct: ['index.html', 'icon.svg', 'manifest.webmanifest', 'src', 'vendor'],
}[app];
await Promise.all(files.map(file => access(resolve(root, file))));
const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#?]+)/g)) {
  if (/^(https?:|data:|mailto:|tel:|\/)/.test(match[1])) continue;
  await access(resolve(root, match[1]));
}
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(root, 'dist', file), { recursive: true, filter: source => !source.endsWith('.test.js') });
if (app === 'stemplayer') {
  // External media stays out of Git, but is needed for a standalone local artifact.
  try { await access(resolve(root, 'audio')); await cp(resolve(root, 'audio'), resolve(root, 'dist/audio'), { recursive: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; console.warn('Audio is external; provision it separately before deployment.'); }
}
console.log(`${app}: static artifact built; local HTML references verified`);
