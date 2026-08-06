import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { completeTransition } from '@/lib/gesture/physics'
import { useAshStore } from '@/stores/ashStore'

/**
 * Sci-fi crossfade / ring flash when globe ⇄ terrain threshold is crossed.
 * Swaps the 3D mode at the peak of the veil, then fades out.
 */
export function SceneModeTransition() {
  const transitioning = useAshStore((s) => s.transitioning)
  const transitionDir = useAshStore((s) => s.transitionDir)
  const veilRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const swapped = useRef(false)

  useEffect(() => {
    if (!transitioning || !transitionDir) return

    const veil = veilRef.current
    const ring = ringRef.current
    const label = labelRef.current
    if (!veil || !ring || !label) return

    swapped.current = false
    label.textContent =
      transitionDir === 'to-terrain' ? 'TERRAIN LINK // ENGAGED' : 'ORBITAL VIEW // RESTORED'

    const tl = gsap.timeline({
      onComplete: () => {
        completeTransition()
      },
    })

    tl.set(veil, { opacity: 0 })
      .set(ring, { opacity: 0, scale: 0.3, rotation: 0, xPercent: -50, yPercent: -50 })
      .set(label, { opacity: 0 })
      .to(veil, { opacity: 1, duration: 0.32, ease: 'power2.in' }, 0)
      .to(
        ring,
        { opacity: 1, scale: 1.05, rotate: 140, duration: 0.5, ease: 'power3.out' },
        0.04,
      )
      .to(label, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0.18)
      .add(() => {
        if (swapped.current) return
        swapped.current = true
        const store = useAshStore.getState()
        if (transitionDir === 'to-terrain') {
          store.setSceneMode('terrain')
          store.setTerrainScale(1)
        } else {
          store.setSceneMode('globe')
        }
      }, 0.48)
      .to(ring, { scale: 2.6, opacity: 0, duration: 0.48, ease: 'power2.in' }, 0.52)
      .to(label, { opacity: 0, duration: 0.22 }, 0.68)
      .to(veil, { opacity: 0, duration: 0.38, ease: 'power2.out' }, 0.72)

    return () => {
      tl.kill()
    }
  }, [transitioning, transitionDir])

  if (!transitioning) return null

  return (
    <div className="scene-mode-transition" aria-hidden="true">
      <div ref={veilRef} className="scene-mode-transition__veil" />
      <div ref={ringRef} className="scene-mode-transition__ring" />
      <div ref={labelRef} className="scene-mode-transition__label" />
    </div>
  )
}
