// Kopiert gemeinsame Pakete in eine App, damit sie als statische Dateien ausgeliefert werden.
//   node scripts/sync-shared.mjs ear
import { cp, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const app = process.argv[2];
if (!app) throw new Error('Expected an app name, e.g. ear');
const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'apps', app, 'vendor', 'sounds');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const part of ['piano', 'src']) {
  await cp(resolve(root, 'packages', 'sounds', part), resolve(target, part), { recursive: true, filter: (s) => !s.endsWith('.test.js') });
}
console.log(`${app}: shared sounds copied to apps/${app}/vendor/sounds`);
