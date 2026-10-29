// Kopiert gemeinsame Pakete in eine App, damit sie als statische Dateien ausgeliefert werden.
//   node scripts/sync-shared.mjs ear sounds fonts theme   (ohne Paketnamen: sounds)
//   sounds-piano: nur Klavier und Player (ohne die großen Orchesterklänge), landet ebenfalls in vendor/sounds
import { cp, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const [app, ...wanted] = process.argv.slice(2);
if (!app) throw new Error('Expected an app name, e.g. ear');
const root = resolve(import.meta.dirname, '..');
const PACKAGES = {
  sounds: ['piano', 'vpo', 'src'],
  'sounds-piano': ['piano', 'src'],
  theme: ['theme.css', 'theme.js'],
  fonts: ['fonts.css', 'figtree.woff', 'bricolage-grotesque.woff', 'jetbrains-mono.woff', 'OFL-Figtree.txt', 'OFL-BricolageGrotesque.txt', 'OFL-JetBrainsMono.txt'],
};
for (const pkg of wanted.length ? wanted : ['sounds']) {
  if (!PACKAGES[pkg]) throw new Error(`Unknown package ${pkg}`);
  const dir = pkg.split('-')[0];
  const target = resolve(root, 'apps', app, 'vendor', dir);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const part of PACKAGES[pkg]) {
    await cp(resolve(root, 'packages', dir, part), resolve(target, part), { recursive: true, filter: (s) => !s.endsWith('.test.js') });
  }
  console.log(`${app}: shared ${pkg} copied to apps/${app}/vendor/${dir}`);
}
