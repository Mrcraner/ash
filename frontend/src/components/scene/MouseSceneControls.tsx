import { useEffect, useRef } from 'react'
import {
  applyMouseRotation,
  injectRotationVelocity,
  nudgeScale,
  setMouseDragActive,
} from '@/lib/gesture/physics'
import { useAshStore } from '@/stores/ashStore'

const DRAG_YAW = 0.0055
const DRAG_PITCH = 0.0035
const WHEEL_ZOOM = 0.00135
const FLICK_GAIN = 0.012

/**
 * Pointer drag rotates the globe/map.
 * Wheel zooms the current scene; past enter/exit thresholds, mode switches smoothly.
 */
export function MouseSceneControls() {
  const enabled = useAshStore((s) => !s.holoInteractionEnabled)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0, t: 0 })
  const vel = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setMouseDragActive(false)
      return
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-hud-interactive]')) return
      dragging.current = true
      setMouseDragActive(true)
      last.current = { x: e.clientX, y: e.clientY, t: performance.now() }
      vel.current = 0
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return
      const now = performance.now()
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      const dt = Math.max(1, now - last.current.t)
      applyMouseRotation(dx * DRAG_YAW, dy * DRAG_PITCH)
      vel.current = (dx / dt) * 1000 * FLICK_GAIN
      last.current = { x: e.clientX, y: e.clientY, t: now }
    }

    const endDrag = () => {
      if (!dragging.current) return
      dragging.current = false
      if (Math.abs(vel.current) > 0.4) {
        injectRotationVelocity(vel.current)
      }
      vel.current = 0
      setMouseDragActive(false)
    }

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-hud-interactive]')) return
      e.preventDefault()
      // Scroll up → zoom in; past threshold → terrain / globe switch with ease
      nudgeScale(-e.deltaY * WHEEL_ZOOM)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    window.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      dragging.current = false
      setMouseDragActive(false)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('wheel', onWheel)
    }
  }, [enabled])

  return null
}
