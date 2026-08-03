/**
 * MediaPipe Hands integration scaffold.
 * Business logic (landmark → skeleton overlay / gestures) intentionally omitted.
 */

export interface HandTrackerOptions {
  /** Video element receiving the webcam stream. */
  video: HTMLVideoElement
  /** Called ~every frame once tracking is active. */
  onResults?: (landmarks: Array<Array<{ x: number; y: number; z: number }>>) => void
}

export class HandTracker {
  private running = false
  private readonly options: HandTrackerOptions

  constructor(options: HandTrackerOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    // Placeholder: request camera + init MediaPipe HandLandmarker in a later PR.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 1280, height: 720 },
      audio: false,
    })
    this.options.video.srcObject = stream
    await this.options.video.play()
    this.running = true
  }

  stop(): void {
    this.running = false
    const stream = this.options.video.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    this.options.video.srcObject = null
  }

  get isRunning(): boolean {
    return this.running
  }
}
