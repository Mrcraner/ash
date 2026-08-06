import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'
import { dedupeHandLabels, resetHandednessState, resolveHandednessStable, type PoseAnchors } from '@/lib/hand/handedness'
import type { HandLandmark } from '@/types/interaction'

export interface HandFrame {
  hands: Array<{
    landmarks: HandLandmark[]
    handedness: 'Left' | 'Right'
  }>
  confidence: number
  pose: PoseAnchors | null
}

export interface HandTrackerOptions {
  video: HTMLVideoElement
  onResults?: (frame: HandFrame) => void
}

/** BlazePose landmark indices */
const LS = 11
const RS = 12
const LW = 15
const RW = 16

/**
 * MediaPipe Hands + Pose: shoulders/wrists anchor stable Left/Right labels.
 */
export class HandTracker {
  private running = false
  private rafId = 0
  private handLandmarker: HandLandmarker | null = null
  private poseLandmarker: PoseLandmarker | null = null
  private lastTimestamp = -1
  private readonly options: HandTrackerOptions

  constructor(options: HandTrackerOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 1280, height: 720 },
      audio: false,
    })
    this.options.video.srcObject = stream
    await this.options.video.play()

    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm')

    const handOpts = {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      runningMode: 'VIDEO' as const,
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: handOpts.modelAssetPath, delegate: 'GPU' },
      runningMode: handOpts.runningMode,
      numHands: handOpts.numHands,
      minHandDetectionConfidence: handOpts.minHandDetectionConfidence,
      minHandPresenceConfidence: handOpts.minHandPresenceConfidence,
      minTrackingConfidence: handOpts.minTrackingConfidence,
    }).catch(async () =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: handOpts.modelAssetPath, delegate: 'CPU' },
        runningMode: handOpts.runningMode,
        numHands: handOpts.numHands,
        minHandDetectionConfidence: handOpts.minHandDetectionConfidence,
        minHandPresenceConfidence: handOpts.minHandPresenceConfidence,
        minTrackingConfidence: handOpts.minTrackingConfidence,
      })
    )

    const poseModel = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

    try {
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: poseModel, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }).catch(async () =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: poseModel, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
      )
    } catch {
      this.poseLandmarker = null
    }

    resetHandednessState()
    this.running = true
    this.loop()
  }

  stop(): void {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.handLandmarker?.close()
    this.poseLandmarker?.close()
    this.handLandmarker = null
    this.poseLandmarker = null
    resetHandednessState()

    const stream = this.options.video.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())
    this.options.video.srcObject = null
  }

  get isRunning(): boolean {
    return this.running
  }

  private readPose(now: number): PoseAnchors | null {
    const pose = this.poseLandmarker
    const video = this.options.video
    if (!pose) return null

    try {
      const result = pose.detectForVideo(video, now)
      const lm = result.landmarks[0]
      if (!lm) return null

      const pt = (i: number) => {
        const p = lm[i]
        return p ? { x: p.x, y: p.y } : null
      }

      return {
        leftShoulder: pt(LS),
        rightShoulder: pt(RS),
        leftWrist: pt(LW),
        rightWrist: pt(RW),
      }
    } catch {
      return null
    }
  }

  private loop = (): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)

    const video = this.options.video
    const handsLm = this.handLandmarker
    if (!handsLm || video.readyState < 2) return

    const now = performance.now()
    if (now <= this.lastTimestamp) return
    this.lastTimestamp = now

    const poseAnchors = this.readPose(now)
    const result = handsLm.detectForVideo(video, now)

    const raw: HandFrame['hands'] = []
    for (let i = 0; i < result.landmarks.length; i += 1) {
      const lm = result.landmarks[i]
      const category = result.handedness[i]?.[0]
      if (!lm) continue

      const landmarks = lm.map(p => ({ x: p.x, y: p.y, z: p.z }))
      const handedness = resolveHandednessStable(landmarks, poseAnchors, category?.categoryName ?? '', now)
      raw.push({ handedness, landmarks })
    }

    const hands = dedupeHandLabels(raw, poseAnchors)

    const confidence = hands.length === 0 ? 0 : result.handedness.reduce((sum, cats) => sum + (cats[0]?.score ?? 0), 0) / Math.max(result.handedness.length, 1)

    this.options.onResults?.({ hands, confidence, pose: poseAnchors })
  }
}
