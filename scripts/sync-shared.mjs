// Kopiert gemeinsame Pakete in eine App, damit sie als statische Dateien ausgeliefert werden.
//   node scripts/sync-shared.mjs ear sounds fonts theme   (ohne Paketnamen: sounds)
import { cp, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const [app, ...wanted] = process.argv.slice(2);
if (!app) throw new Error('Expected an app name, e.g. ear');
const root = resolve(import.meta.dirname, '..');
const PACKAGES = {
  sounds: ['piano', 'vpo', 'src'],
  theme: ['theme.css'],
  fonts: ['fonts.css', 'figtree.woff', 'bricolage-grotesque.woff', 'jetbrains-mono.woff', 'OFL-Figtree.txt', 'OFL-BricolageGrotesque.txt', 'OFL-JetBrainsMono.txt'],
};
for (const pkg of wanted.length ? wanted : ['sounds']) {
  if (!PACKAGES[pkg]) throw new Error(`Unknown package ${pkg}`);
  const target = resolve(root, 'apps', app, 'vendor', pkg);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const part of PACKAGES[pkg]) {
    await cp(resolve(root, 'packages', pkg, part), resolve(target, part), { recursive: true, filter: (s) => !s.endsWith('.test.js') });
  }
  console.log(`${app}: shared ${pkg} copied to apps/${app}/vendor/${pkg}`);
}
