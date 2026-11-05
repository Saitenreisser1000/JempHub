// Übernommene Editor-Levels (levels/*.json) in das Spiel einbauen: ersetzt `const LEVEL_FILES={};`.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readLevels(dir) {
  const out = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const D = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
    if (D.v !== 1 || !Array.isArray(D.grid) || !Array.isArray(D.objs)) throw new Error(`${f}: keine gültige Supersam-Level-Datei`);
    out[D.id] = D;
  }
  return out;
}

export function inlineLevels(html, dir) {
  const marker = 'const LEVEL_FILES={};';
  if (!html.includes(marker)) throw new Error('index.html: Platzhalter für LEVEL_FILES fehlt');
  const levels = readLevels(dir);
  return { html: html.replace(marker, `const LEVEL_FILES=${JSON.stringify(levels)};`), ids: Object.keys(levels) };
}
