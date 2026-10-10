import { spawn } from 'node:child_process';

const workspaces = [
  '@jemphub/hub',
  'guitarjemp',
  'earjemp',
  'notejemp',
  '@jemphub/stemplayer',
];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let stopping = false;

function stop(signal = 'SIGINT') {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill(signal);
  }
}

for (const workspace of workspaces) {
  const child = spawn(npm, ['run', 'dev', '--workspace', workspace], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`Could not start ${workspace}:`, error);
    stop('SIGTERM');
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${workspace} dev server stopped (${signal ?? `exit ${code}`}).`);
      process.exitCode = code ?? 1;
      stop('SIGTERM');
    }
  });
}

console.log('JempHub: http://127.0.0.1:4173');
console.log('Apps: GuitarJemp :5180 | EarJemp :5181 | NoteJemp :5182 | StemPlayer :5183');

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
