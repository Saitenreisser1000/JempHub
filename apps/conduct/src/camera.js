// Handerkennung über die Kamera (MediaPipe Hand Landmarker, läuft im Browser,
// das Bild verlässt das Gerät nicht). Liefert die Handmitte, gespiegelt wie ein Spiegelbild.
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const PALM = [0, 5, 9, 13, 17] // Handgelenk und Fingeransätze

let landmarker = null

async function createLandmarker() {
  if (landmarker) return landmarker
  const { FilesetResolver, HandLandmarker } = await import(MP + '/vision_bundle.mjs')
  const vision = await FilesetResolver.forVisionTasks(MP + '/wasm')
  const make = (delegate) => HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
  })
  try { landmarker = await make('GPU') } catch { landmarker = await make('CPU') }
  return landmarker
}

// onPoint(x, y, t, hand, unit) mit x, y in 0..1 und unit = Länge der Handfläche im Bild
// (in Bildhöhen, gegen unterschiedlichen Abstand zur Kamera); isLeft(): Linkshänder?
// Gibt eine Stopp-Funktion zurück.
export async function startCamera(video, onPoint, isLeft = () => false) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  const lm = await createLandmarker()
  let running = true, last = -1, lastTs = 0, unit = null
  // Zeitstempel des tatsächlich gezeigten Kamerabilds, wenn der Browser ihn liefert
  const rvfc = typeof video.requestVideoFrameCallback === 'function'
  const next = () => (rvfc ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop))
  const loop = (frameTime) => {
    if (!running) return
    if (video.readyState >= 2 && (rvfc || video.currentTime !== last)) {
      last = video.currentTime
      let now = rvfc && frameTime ? frameTime : performance.now()
      if (now <= lastTs) now = lastTs + 1
      lastTs = now
      const res = lm.detectForVideo(video, now)
      const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3
      // Handmitten (gespiegelt); bei zwei Händen die Schlaghand: im Spiegelbild
      // ist die rechte Hand die weiter rechts, die linke die weiter links
      const palms = ((res && res.landmarks) || []).map((h) => {
        let x = 0, y = 0
        for (const i of PALM) { x += h[i].x; y += h[i].y }
        const len = Math.hypot((h[0].x - h[9].x) * aspect, h[0].y - h[9].y)
        return [1 - x / PALM.length, y / PALM.length, len]
      })
      if (palms.length) {
        palms.sort((a, b) => a[0] - b[0])
        const [x, y, len] = isLeft() ? palms[0] : palms[palms.length - 1]
        unit = unit === null ? len : unit + 0.1 * (len - unit)
        onPoint(x, y, now / 1000, true, Math.max(0.04, Math.min(0.3, unit)))
      } else onPoint(null, null, now / 1000, false)
    }
    next()
  }
  next()
  return () => {
    running = false
    stream.getTracks().forEach((tr) => tr.stop())
    video.srcObject = null
  }
}
