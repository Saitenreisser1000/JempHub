import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../packages/design-system');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const file of Object.values(pkg.exports)) {
  const path = resolve(root, file); await access(path);
  if (path.endsWith('.js')) execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
}
console.log('Design system: all exports exist; JavaScript syntax verified');
