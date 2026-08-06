import { useEffect, useRef } from 'react'
import { applyHandFrame } from '@/lib/gesture/applyHandFrame'
import { bootstrapPhysicsFromStore, ensurePhysicsLoop } from '@/lib/gesture/physics'
import { HandTracker } from '@/lib/hand/HandTracker'
import { HandSkeletonOverlay } from '@/components/hand/HandSkeletonOverlay'
import { useAshStore } from '@/stores/ashStore'

/**
 * Full-bleed webcam feed + MediaPipe hand tracking for the control stage.
 */
export function CameraBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const setCameraReady = useAshStore(s => s.setCameraReady)

  useEffect(() => {
    bootstrapPhysicsFromStore()
    ensurePhysicsLoop()

    const video = videoRef.current
    if (!video) return

    const tracker = new HandTracker({
      video,
      onResults: applyHandFrame,
    })
    let cancelled = false

    void (async () => {
      try {
        await tracker.start()
        if (!cancelled) setCameraReady(true)
      } catch {
        if (!cancelled) setCameraReady(false)
      }
    })()

    return () => {
      cancelled = true
      tracker.stop()
      setCameraReady(false)
    }
  }, [setCameraReady])

  return (
    <div className="camera-background" aria-hidden="true">
      <video ref={videoRef} className="camera-background__video" muted playsInline autoPlay />
      <div className="camera-background__veil" />
      <HandSkeletonOverlay />
    </div>
  )
}
