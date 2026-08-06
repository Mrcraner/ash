import { useEffect, useRef } from 'react'

type Vec3 = [number, number, number]

/** Regular tetrahedron: base in XZ, one base edge // X, centroid at origin. */
const EDGE = 1.9
const HEIGHT = (Math.sqrt(6) / 3) * EDGE
const Y_BASE = -HEIGHT / 4
const Y_APEX = (3 * HEIGHT) / 4

const VERTICES: Vec3[] = [
  [0, Y_APEX, 0],
  [-EDGE / 2, Y_BASE, (-Math.sqrt(3) / 6) * EDGE],
  [EDGE / 2, Y_BASE, (-Math.sqrt(3) / 6) * EDGE],
  [0, Y_BASE, (Math.sqrt(3) / 3) * EDGE],
]

const FACES: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 1],
  [1, 3, 2],
]

/** Subdivision per triangle edge — denser = fuller faces. */
const FACE_DIV = 28

type Seed = { a: number; b: number; c: number; u: number; v: number }

function buildFaceSeeds(): Seed[] {
  const seeds: Seed[] = []
  for (const [a, b, c] of FACES) {
    for (let i = 0; i <= FACE_DIV; i++) {
      for (let j = 0; j <= FACE_DIV - i; j++) {
        seeds.push({ a, b, c, u: i / FACE_DIV, v: j / FACE_DIV })
      }
    }
  }
  return seeds
}

const SEEDS = buildFaceSeeds()

function rotateY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]
}

export function ParticleTetrahedron() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    let dpr = 1

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const start = performance.now()

    const draw = (now: number) => {
      if (!running) return
      const { width, height } = canvas.getBoundingClientRect()
      const t = (now - start) / 1000

      // upright: base // XZ, spin only around Y
      const rotY = t * 0.28
      const breath = 0.5 + 0.5 * Math.sin(t * 1.15)
      const alpha = 0.1 + 0.9 * breath

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cx = width * 0.5
      const cy = height * 0.52
      const scale = Math.min(width, height) * 0.34

      const projected: { x: number; y: number; z: number }[] = []

      for (const seed of SEEDS) {
        const w = 1 - seed.u - seed.v
        const p = rotateY(
          [
            VERTICES[seed.a][0] * w + VERTICES[seed.b][0] * seed.u + VERTICES[seed.c][0] * seed.v,
            VERTICES[seed.a][1] * w + VERTICES[seed.b][1] * seed.u + VERTICES[seed.c][1] * seed.v,
            VERTICES[seed.a][2] * w + VERTICES[seed.b][2] * seed.u + VERTICES[seed.c][2] * seed.v,
          ],
          rotY,
        )

        const z = p[2] + 3.2
        const persp = 2.6 / z
        projected.push({
          x: cx + p[0] * scale * persp,
          y: cy - p[1] * scale * persp,
          z: p[2],
        })
      }

      projected.sort((a, b) => a.z - b.z)

      ctx.fillStyle = `rgba(232, 188, 96, ${alpha})`
      for (const pt of projected) {
        ctx.fillRect(Math.round(pt.x * dpr), Math.round(pt.y * dpr), 1, 1)
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="jarvis-viz__canvas" aria-hidden />
}
