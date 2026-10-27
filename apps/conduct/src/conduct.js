// Schlagerkennung für das Dirigieren. Reine Funktionen, ohne Browser.
// Koordinaten: x, y normiert 0..1 (y wächst nach unten), t in Sekunden.

// Glättung mit dem One-Euro-Filter: bei langsamer Hand stark (gegen Zittern),
// bei schneller Hand schwach (wenig Verzögerung).
export function oneEuro({ minCutoff = 4, beta = 20, dCutoff = 1.2 } = {}) {
  let x = null, dx = 0, lt = null
  const alpha = (cut, dt) => 1 / (1 + 1 / (2 * Math.PI * cut * dt))
  return {
    reset() { x = null; dx = 0; lt = null },
    filter(v, t) {
      if (x === null || t <= lt) { x = v; lt = t; return v }
      const dt = Math.min(0.1, t - lt)
      lt = t
      dx += alpha(dCutoff, dt) * ((v - x) / dt - dx)
      x += alpha(minCutoff + beta * Math.abs(dx), dt) * (v - x)
      return x
    },
  }
}

// Schlagpunkt (Iktus) = unterster Punkt einer Abwärtsbewegung, sobald die Hand
// danach wieder etwas steigt. Schwellen in „Handgrößen“ (unit): bei der Kamera die
// Länge der Handfläche im Bild, sonst 0,1 – so zählt dieselbe Geste nah und fern gleich.
export function createBeatTracker(opts = {}) {
  const o = { minDrop: 0.3, rise: 0.12, minGap: 0.22, unit: 0.1, ...opts }
  const fx = oneEuro(o.filter), fy = oneEuro(o.filter)
  let sx = null, sy = null, px = null, py = null
  let top = null // höchster Punkt seit dem letzten Schlag-Kandidaten
  let low = null // tiefster Punkt der laufenden Abwärtsbewegung
  let lastBeat = -Infinity
  let path = 0 // Weg seit dem letzten Schlag (in Handgrößen · 0,1)
  let pathAtLow = 0
  let gap = o.minGap

  return {
    reset() { fx.reset(); fy.reset(); sx = sy = px = py = null; top = low = null; path = pathAtLow = 0; lastBeat = -Infinity },
    // Sperrzeit nach einem Schlag an das Tempo anpassen (gegen Doppelschläge beim Rückprall)
    setInterval(iv) { gap = iv ? Math.max(0.15, Math.min(0.4, iv * 0.42)) : o.minGap },
    // liefert einen Schlag { t, x, y, size, drop } oder null
    push(x, y, t, unit = o.unit) {
      const u = Math.max(0.02, unit)
      sx = fx.filter(x, t); sy = fy.filter(y, t)
      if (px !== null) path += (Math.hypot(sx - px, sy - py) / u) * 0.1
      px = sx; py = sy
      const p = { x: sx, y: sy, t }
      if (!top || sy < top.y) { top = p; low = null; return null }
      if (!low || sy >= low.y) { low = p; pathAtLow = path; return null }
      const drop = low.y - top.y
      if (drop >= o.minDrop * u && low.y - sy >= o.rise * u && low.t - lastBeat >= gap) {
        const beat = { t: low.t, x: low.x, y: low.y, size: pathAtLow, drop: (drop / u) * 0.1 }
        lastBeat = low.t
        path -= pathAtLow
        top = p
        low = null
        return beat
      }
      return null
    },
  }
}

// Verpasster Schlag? Eine deutlich größere Abwärtsbewegung als zuletzt ist die Eins.
export function isDownbeat(drop, recent) {
  if (recent.length < 4) return false
  const sorted = [...recent].sort((a, b) => a - b)
  return drop > 1.7 * sorted[Math.floor(sorted.length / 2)]
}

// Tempo aus den Abständen der Schläge; Ausreißer zählen erst, wenn sie sich wiederholen.
export function createTempo({ min = 0.25, max = 2.5, weight = 0.5 } = {}) {
  let last = null, est = null, odd = 0
  return {
    get interval() { return est },
    get bpm() { return est ? 60 / est : null },
    reset() { last = null; est = null; odd = 0 },
    beat(t) {
      if (last !== null) {
        const d = t - last
        if (d >= min && d <= max) {
          if (est === null) est = d
          else if (d < est * 0.55 || d > est * 1.8) { if (++odd >= 2) { est = d; odd = 0 } }
          else { est += weight * (d - est); odd = 0 }
        }
      }
      last = t
      return est
    },
  }
}

// Lautstärke aus der Größe der Bewegung (Weg pro Schlag)
export function dynamicsFrom(size) {
  return Math.max(0.15, Math.min(1, 0.15 + (size - 0.04) * 2.2))
}
const DYN = [[0.3, 'pp'], [0.45, 'p'], [0.6, 'mp'], [0.75, 'mf'], [0.9, 'f'], [Infinity, 'ff']]
export const dynamicLabel = (v) => DYN.find(([lim]) => v < lim)[1]

// Schlagfiguren für die rechte Hand, gesehen im Spiegelbild (Kamera) bzw. am Bildschirm.
// Für die linke Hand wird die Figur gespiegelt (figurePoints, figureOk mit left = true).
// Punkte: Lage der Schlagpunkte in einem Kasten 0..1, dazu die Prüfung je Schlag.
export const FIGURES = {
  2: { points: [[0.5, 0.82], [0.62, 0.62]] },
  3: { points: [[0.5, 0.82], [0.8, 0.74], [0.56, 0.5]] },
  4: { points: [[0.5, 0.82], [0.2, 0.74], [0.8, 0.74], [0.56, 0.5]] },
}

export const figurePoints = (meter, left = false) => FIGURES[meter].points.map(([x, y]) => [left ? 1 - x : x, y])

// Prüft, ob ein Schlag in die richtige Richtung geht, relativ zur Eins des Takts.
// beat: 0-basiert im Takt; one/cur: { x, y }; scale: Größe der Figur (für Toleranz); left: linke Hand
export function figureOk(meter, beat, one, cur, scale = 0.2, left = false) {
  if (beat === 0 || !one) return true
  const dx = (cur.x - one.x) * (left ? -1 : 1), dy = cur.y - one.y // dy < 0: höher als die Eins
  const tol = Math.max(0.02, scale * 0.15)
  if (meter === 2) return dy < -tol / 2 || dx > tol
  if (meter === 3) return beat === 1 ? dx > tol : dy < -tol / 2
  if (beat === 1) return dx < -tol
  if (beat === 2) return dx > tol
  return dy < -tol / 2
}
