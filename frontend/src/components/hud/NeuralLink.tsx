import { useEffect, useRef } from 'react'

type Node = { x: number; y: number; r: number; phase: number }
type Link = { a: number; b: number }

function buildGraph(w: number, h: number) {
  const nodes: Node[] = []
  const cols = 5
  const rows = 4
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const jitterX = (Math.random() - 0.5) * 0.08
      const jitterY = (Math.random() - 0.5) * 0.1
      nodes.push({
        x: (0.12 + (col / (cols - 1)) * 0.76 + jitterX) * w,
        y: (0.18 + (row / (rows - 1)) * 0.64 + jitterY) * h,
        r: 1.4 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  const links: Link[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const d = Math.hypot(dx, dy)
      if (d < w * 0.32 && Math.random() > 0.35) {
        links.push({ a: i, b: j })
      }
    }
  }
  return { nodes, links }
}

export function NeuralLink() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const start = performance.now()
    let graph = { nodes: [] as Node[], links: [] as Link[] }
    let packets: { link: number; t: number; speed: number }[] = []

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      graph = buildGraph(width, height)
      packets = Array.from({ length: 6 }, () => ({
        link: Math.floor(Math.random() * Math.max(1, graph.links.length)),
        t: Math.random(),
        speed: 0.25 + Math.random() * 0.45,
      }))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      if (!running) return
      const { width, height } = canvas.getBoundingClientRect()
      const t = (now - start) / 1000
      const { nodes, links } = graph

      ctx.clearRect(0, 0, width, height)

      for (const link of links) {
        const a = nodes[link.a]
        const b = nodes[link.b]
        const pulse = 0.12 + 0.1 * Math.sin(t * 2 + a.phase + b.phase)
        ctx.beginPath()
        ctx.strokeStyle = `rgba(90,230,255,${pulse})`
        ctx.lineWidth = 0.8
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }

      for (const pkt of packets) {
        if (!links.length) continue
        pkt.t += pkt.speed * 0.016
        if (pkt.t > 1) {
          pkt.t = 0
          pkt.link = Math.floor(Math.random() * links.length)
          pkt.speed = 0.25 + Math.random() * 0.45
        }
        const link = links[pkt.link % links.length]
        const a = nodes[link.a]
        const b = nodes[link.b]
        const x = a.x + (b.x - a.x) * pkt.t
        const y = a.y + (b.y - a.y) * pkt.t
        ctx.beginPath()
        ctx.fillStyle = 'rgba(180,255,255,0.95)'
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 6
        ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      for (const node of nodes) {
        const glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3.2 + node.phase))
        ctx.beginPath()
        ctx.fillStyle = `rgba(100,240,255,${0.15 * glow})`
        ctx.arc(node.x, node.y, node.r * 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.fillStyle = `rgba(200,250,255,${0.55 + glow * 0.4})`
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const cx = width * 0.5
      const cy = height * 0.5
      const beat = 0.5 + 0.5 * Math.sin(t * 2.4)
      ctx.beginPath()
      ctx.strokeStyle = `rgba(120,245,255,${0.2 + beat * 0.35})`
      ctx.lineWidth = 1
      ctx.arc(cx, cy, 10 + beat * 6, 0, Math.PI * 2)
      ctx.stroke()

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
