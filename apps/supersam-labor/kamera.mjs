// Kamera-Messung: sucht pro Welt einen Weg zum Ziel (echte Spielphysik), spielt ihn mit mitlaufender Kamera ab
// und misst, wie gut der Bildausschnitt ist. Damit lassen sich Änderungen an der Kamera vorher/nachher vergleichen.
//
//   node kamera.mjs                alle Welten
//   node kamera.mjs 1 6 bonus2     nur diese Welten
//   node kamera.mjs --stellen 6    zusätzlich die schlechtesten Stellen (Spalte, Zeile) ausgeben
//
// Der gefundene Weg wird zwischengespeichert (Ordner im Temp-Verzeichnis), solange Level und Physik gleich bleiben –
// die Suche dauert Minuten, das Abspielen Sekunden.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gameSource, engine, search, replay } from './pruefung.mjs';

const { html } = await gameSource();
const raw = process.argv.slice(2), spots = raw.includes('--stellen'), jsonOut = raw.includes('--json'), want = raw.filter(a => !a.startsWith('--')).map(a => isNaN(+a) ? a : +a);
const E = engine(html);
// Fähigkeiten, die man beim ersten Besuch der Welt hat
const AB = { uebung: [], 1: [], 5: ['double'], 2: ['double'], 6: ['double', 'wall'], 3: ['double', 'wall'], 7: ['double', 'wall', 'dash'], 4: ['double', 'wall', 'dash'], 8: ['double', 'wall', 'dash', 'glide'], ...E.BONUS_AB };
const worlds = want.length ? want : ['uebung', 1, 5, 2, 6, 3, 7, 4, 8, ...E.BONUS];
const cacheDir = resolve(tmpdir(), 'supersam-kamera'); await mkdir(cacheDir, { recursive: true });

async function pathFor(w) { const D = E.levelData(w), ab = AB[w] || [];
  const key = createHash('sha1').update(JSON.stringify([D, ab, E.PH])).digest('hex').slice(0, 16), file = resolve(cacheDir, `${w}-${key}.json`);
  try { return { D, ab, path: JSON.parse(await readFile(file, 'utf8')) }; } catch (_) {}
  const t0 = Date.now(), r = search(E, D, ab); if (!r.path) return { D, ab, path: null };
  const path = r.path.map(s => ({ from: { x: s.from.x, feet: s.from.feet }, mi: s.mi, s: s.s }));
  await writeFile(file, JSON.stringify(path)); if (!jsonOut) console.error(`  (${w}: Weg gesucht in ${((Date.now() - t0) / 1000).toFixed(0)} s, ${path.length} Bewegungen)`);
  return { D, ab, path }; }

function measure(w, D, ab, path) { const TS = E.TS, P = E.P, F = []; let first = true, Lv = null;
  const res = replay(E, D, ab, path, (L_, cut) => { Lv = L_; if (first || cut) { E.camSnap(); first = false; } E.camTick(1 / 60); const v = E.view;
    F.push({ cut, x: P.x, y: P.y, w: P.w, h: P.h, vx: P.vx, vy: P.vy, g: P.ground, vxw: v.x, vyw: v.y, vw: v.w, vh: v.h, z: v.zoom }); });
  const W = Lv.w * TS, H = Lv.h * TS, n = F.length, dt = 1 / 60;
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  // 1) Vorlauf: Sicht in Laufrichtung in Sekunden
  let mov = 0, short = 0, sumLead = 0; const bad1 = [];
  // 2) Sam am Bildrand (senkrecht)
  let edgeV = 0; const bad2 = [];
  for (let i = 0; i < n; i++) { const f = F[i], sp = Math.abs(f.vx);
    if (sp > 60) { const dir = Math.sign(f.vx), ahead = dir > 0 ? f.vxw + f.vw - (f.x + f.w) : f.x - f.vxw, atEdge = dir > 0 ? f.vxw + f.vw >= W - 1 : f.vxw <= 1;
      if (!atEdge) { mov++; const lead = ahead / sp; sumLead += Math.min(4, lead); if (lead < 0.9) { short++; bad1.push(i); } } }
    f.feetF = (f.y + f.h - f.vyw) / f.vh; f.headF = (f.y - f.vyw) / f.vh; f.cB = f.vyw + f.vh >= H - 1; f.cT = f.vyw <= 1; }
  // Luftphasen: Start- und Landehöhe. Oben am Rand zählt nur beim Klettern (Landung mindestens 2 Kacheln höher oder noch höherer Scheitel
  // als ein normaler Sprung), unten am Rand beim Fallen.
  for (let j = 1; j < n; j++) { if (!(F[j].g && !F[j - 1].g)) continue; let a = j - 1; while (a > 0 && !F[a - 1].g) a--;
    const y0 = F[a].y + F[a].h, y1 = F[j].y + F[j].h; let top = y0; for (let i = a; i < j; i++) top = Math.min(top, F[i].y + F[i].h);
    const climb = y0 - y1 >= TS * 2 || y0 - top > TS * 5; for (let i = a; i < j; i++) F[i].climb = climb; }
  for (let i = 0; i < n; i++) { const f = F[i];
    if ((f.headF < 0.1 && !f.cT && (f.climb || f.g)) || (f.feetF > 0.9 && !f.cB)) { edgeV++; bad2.push(i); } }
  // 3) Landungen: wie lange vor dem Aufsetzen ist die Landestelle im Bild?
  let lands = 0, blind = 0, sumVis = 0; const bad3 = [];
  for (let j = 1; j < n; j++) { if (!(F[j].g && !F[j - 1].g)) continue; let a = j - 1; while (a > 0 && !F[a - 1].g) a--; const air = j - a; if (air < 18) continue;
    const lx = F[j].x + F[j].w / 2, ly = F[j].y + F[j].h; let vis = 0;
    for (let i = j - 1; i >= a; i--) { const f = F[i]; if (lx > f.vxw + 6 && lx < f.vxw + f.vw - 6 && ly + 6 < f.vyw + f.vh && ly - 20 > f.vyw) vis++; else break; }
    lands++; const t = vis * dt; sumVis += Math.min(1.5, t); if (t < 0.4 && air * dt > 0.45) { blind++; bad3.push(j); } }
  // 4) Gefahren (Stacheln, Gegner): wie lange vorher im Bild?
  const haz = []; for (let r = 0; r < Lv.h; r++) for (let c = 0; c < Lv.w; c++) if (Lv.grid[r][c] === '^') haz.push({ x: c * TS + 8, y: r * TS + 8 });
  for (const o of D.objs) if (o.k === 'enemy') haz.push({ x: o.c * TS + 8, y: o.r * TS + 8 });
  let hz = 0, late = 0, sumHz = 0; const bad4 = [];
  for (const h of haz) { let enc = -1; for (let i = 0; i < n; i++) { const f = F[i]; if (Math.abs(f.x + f.w / 2 - h.x) < TS * 1.5 && Math.abs(f.y + f.h / 2 - h.y) < TS * 3) { enc = i; break; } } if (enc < 0) continue;
    let vis = 0; for (let i = enc - 1; i >= 0; i--) { const f = F[i]; if (h.x > f.vxw + 4 && h.x < f.vxw + f.vw - 4 && h.y > f.vyw + 4 && h.y < f.vyw + f.vh - 4) vis++; else break; }
    hz++; const t = vis * dt; sumHz += Math.min(3, t); if (t < 1.0) { late++; bad4.push(enc); } }
  // 5) Unruhe: Richtungswechsel der senkrechten Kamerafahrt und Rucke
  let rev = 0, jerk = 0, lastSign = 0, lastRev = -999, zoomCh = 0, zDir = 0; const bad5 = [], bad6 = [];
  let hold = 0; for (let i = 2; i < n; i++) { if (F[i].cut) hold = 45; if (hold > 0) { hold--; lastSign = 0; continue; } const v1 = (F[i].vyw + F[i].vh / 2 - F[i - 1].vyw - F[i - 1].vh / 2) / dt, v0 = (F[i - 1].vyw + F[i - 1].vh / 2 - F[i - 2].vyw - F[i - 2].vh / 2) / dt;
    if (Math.abs(v1) > 10) { const s = Math.sign(v1); if (lastSign && s !== lastSign) { if (i - lastRev < 60) { rev++; bad5.push(i); } lastRev = i; } lastSign = s; }
    if (Math.abs(v1 - v0) / dt > 2500) { jerk++; bad6.push(i); }
    const dz = F[i].z - F[i - 1].z; if (Math.abs(dz) > 0.0005) { const s = Math.sign(dz); if (zDir && s !== zDir) zoomCh++; zDir = s; } }
  const secs = n * dt, cols = idx => [...new Set(idx.map(i => `${Math.floor(F[i].x / TS)},${Math.floor((F[i].y + F[i].h - 1) / TS)}`))].slice(0, 12).join(' ');
  return { w, finished: res.finished, cuts: res.cuts, secs: +secs.toFixed(1),
    vorlauf: +(mov ? sumLead / mov : 0).toFixed(2), kurz: pct(short, mov), rand: pct(edgeV, n), landungen: lands, blind: pct(blind, lands), landSicht: +(lands ? sumVis / lands : 0).toFixed(2),
    gefahren: hz, spaet: pct(late, hz), gefSicht: +(hz ? sumHz / hz : 0).toFixed(2), wechsel: +(rev / secs * 60).toFixed(1), rucke: +(jerk / secs * 60).toFixed(1), zoom: +(zoomCh / secs * 60).toFixed(1),
    stellen: { vorlauf: cols(bad1), rand: cols(bad2), blind: cols(bad3), gefahr: cols(bad4), wechsel: cols(bad5), rucke: cols(bad6) } };
}

const out = [];
for (const w of worlds) { const { D, ab, path } = await pathFor(w); if (!path) { console.log(`${w}: kein Weg zum Ziel gefunden`); continue; } out.push(measure(w, D, ab, path)); }
if (jsonOut) { console.log(JSON.stringify(out)); process.exit(0); }
const col = (s, n) => String(s).padStart(n);
console.log('Welt      Dauer  Vorlauf  zu kurz  am Rand  Landungen  blind  Sicht  Gefahren  zu spät  Sicht  Wechsel/min  Rucke/min  Zoomw./min');
for (const r of out) console.log(`${String(r.w).padEnd(8)} ${col(r.secs + ' s', 6)} ${col(r.vorlauf + ' s', 8)} ${col(r.kurz + ' %', 8)} ${col(r.rand + ' %', 8)} ${col(r.landungen, 10)} ${col(r.blind + ' %', 6)} ${col(r.landSicht + ' s', 6)} ${col(r.gefahren, 9)} ${col(r.spaet + ' %', 8)} ${col(r.gefSicht + ' s', 6)} ${col(r.wechsel, 12)} ${col(r.rucke, 10)} ${col(r.zoom, 11)}${r.cuts ? `  (${r.cuts} Schnitte)` : ''}`);
if (spots) for (const r of out) { console.log(`\n${r.w} – schlechte Stellen (Spalte,Zeile):`); for (const [k, v] of Object.entries(r.stellen)) if (v) console.log(`  ${k}: ${v}`); }
