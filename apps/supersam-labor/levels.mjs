// Übernommene Editor-Levels (levels/*.json) in das Spiel einbauen: ersetzt `const LEVEL_FILES={};`.
// Die Dateien kommen aus dem Leveleditor (Export oder „Veröffentlichen“). Eine fehlerhafte Datei stoppt Build und Deploy.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function checkLevel(D, f = 'Level') {
  const bad = m => { throw new Error(`${f}: ${m}`); };
  if (!D || D.v !== 1 || !Array.isArray(D.grid) || !Array.isArray(D.objs)) bad('keine gültige Supersam-Level-Datei');
  if (D.id === undefined || D.id === null || D.id === '') bad('keine Welt-Kennung (id)');
  if (!(D.w > 0 && D.h > 0) || D.grid.length !== D.h || D.grid.some(r => typeof r !== 'string' || r.length !== D.w)) bad('Raster passt nicht zur Levelgröße');
  for (const k of ['back', 'up']) if (!Array.isArray(D[k]) || D[k].length !== D.h || D[k].some(r => r.length !== D.w)) bad(`Ebene ${k} passt nicht zur Levelgröße`);
  if (!D.objs.some(o => o.k === 'start')) bad('kein Start');
  if (!D.objs.some(o => o.k === 'goal' || o.k === 'door')) bad('kein Ziel');
  for (const o of D.objs) if (!(o.c >= 0 && o.c < D.w && o.r >= 0 && o.r < D.h)) bad(`Objekt ${o.k} liegt außerhalb (${o.c}/${o.r})`);
  return D;
}

export function readLevels(dir) {
  const out = {}, from = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    let D; try { D = JSON.parse(readFileSync(resolve(dir, f), 'utf8')); } catch (e) { throw new Error(`${f}: kein gültiges JSON (${e.message})`); }
    checkLevel(D, f);
    if (from[D.id]) throw new Error(`${f}: Welt ${D.id} gibt es schon in ${from[D.id]}`);
    out[D.id] = D; from[D.id] = f;
  }
  return out;
}

export function inlineLevels(html, dir) {
  const marker = 'const LEVEL_FILES={};';
  if (!html.includes(marker)) throw new Error('index.html: Platzhalter für LEVEL_FILES fehlt');
  const levels = readLevels(dir);
  return { html: html.replace(marker, `const LEVEL_FILES=${JSON.stringify(levels)};`), ids: Object.keys(levels) };
}
