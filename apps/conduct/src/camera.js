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

// onPoint(x, y, t, hand) mit x, y in 0..1; isLeft(): Linkshänder?; gibt eine Stopp-Funktion zurück
export async function startCamera(video, onPoint, isLeft = () => false) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  const lm = await createLandmarker()
  let running = true, last = -1
  const loop = () => {
    if (!running) return
    if (video.readyState >= 2 && video.currentTime !== last) {
      last = video.currentTime
      const now = performance.now()
      const res = lm.detectForVideo(video, now)
      // Handmitten (gespiegelt); bei zwei Händen die Schlaghand: im Spiegelbild
      // ist die rechte Hand die weiter rechts, die linke die weiter links
      const palms = ((res && res.landmarks) || []).map((h) => {
        let x = 0, y = 0
        for (const i of PALM) { x += h[i].x; y += h[i].y }
        return [1 - x / PALM.length, y / PALM.length]
      })
      if (palms.length) {
        palms.sort((a, b) => a[0] - b[0])
        const [x, y] = isLeft() ? palms[0] : palms[palms.length - 1]
        onPoint(x, y, now / 1000, true)
      } else onPoint(null, null, now / 1000, false)
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  return () => {
    running = false
    stream.getTracks().forEach((tr) => tr.stop())
    video.srcObject = null
  }
}
