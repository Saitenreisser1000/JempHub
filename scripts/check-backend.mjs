import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '../apps/stemplayer/backend');
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith('.js')) execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  }
}
await check(resolve(root, 'src'));
for (const name of Object.keys(JSON.parse(execFileSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./package.json').dependencies))"], { cwd: root, encoding: 'utf8' })))) {
  execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(name)})`], { cwd: root, stdio: 'inherit' });
}
console.log('Backend: syntax and dependency imports verified (no database/server started)');
