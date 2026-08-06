import { useEffect, useRef } from 'react'
import { HAND_CONNECTIONS } from '@/lib/hand/landmarks'
import { useAshStore } from '@/stores/ashStore'
import type { TrackedHand } from '@/types/interaction'

/**
 * Cyan dashed skeleton overlay matching mirrored webcam space (screenshot 2).
 */
export function HandSkeletonOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const leftHand = useAshStore(s => s.leftHand)
  const rightHand = useAshStore(s => s.rightHand)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio
      canvas.height = canvas.clientHeight * devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (leftHand) drawHand(ctx, leftHand, w, h, '左手-01')
    if (rightHand) drawHand(ctx, rightHand, w, h, '右手-01')
  }, [leftHand, rightHand])

  return <canvas ref={canvasRef} className="hand-skeleton-overlay" aria-hidden="true" />
}

function drawHand(ctx: CanvasRenderingContext2D, hand: TrackedHand, w: number, h: number, label: string) {
  const pts = hand.landmarks.map(lm => ({
    // Mirror X to match CSS-mirrored video
    x: (1 - lm.x) * w,
    y: lm.y * h,
  }))

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.lineCap = 'round'

  for (const [a, b] of HAND_CONNECTIONS) {
    const pa = pts[a]
    const pb = pts[b]
    if (!pa || !pb) continue
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  ctx.setLineDash([])
  for (const p of pts) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(180, 255, 255, 0.9)'
    ctx.fill()
  }

  const wrist = pts[0]
  if (wrist) {
    ctx.font = '11px ui-monospace, Cascadia Code, monospace'
    ctx.fillStyle = 'rgba(0, 229, 255, 0.9)'
    ctx.fillText(`ID: ${label}`, wrist.x + 10, wrist.y + 4)
  }
}
