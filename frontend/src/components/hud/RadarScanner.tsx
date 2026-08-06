import { useEffect, useRef } from 'react'

type Blip = {
  x: number
  y: number
  strength: number
  phase: number
  flash: number
}

function seedBlips(count: number): Blip[] {
  return Array.from({ length: count }, (_, i) => ({
    x: 0.12 + Math.random() * 0.76,
    y: 0.1 + Math.random() * 0.8,
    strength: 0.45 + Math.random() * 0.55,
    phase: i * 1.7 + Math.random(),
    flash: 0,
  }))
}

export function RadarScanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blipsRef = useRef<Blip[]>(seedBlips(9))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const start = performance.now()

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      if (!running) return
      const { width, height } = canvas.getBoundingClientRect()
      const t = (now - start) / 1000
      // vertical scan 0 → 1 loop (~2.8s)
      const scanPeriod = 2.8
      const scanY = ((t % scanPeriod) / scanPeriod) * height
      const blips = blipsRef.current

      ctx.clearRect(0, 0, width, height)

      // grid
      ctx.strokeStyle = 'rgba(0,229,255,0.08)'
      ctx.lineWidth = 1
      const step = 16
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // faint orbital arc
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(0,229,255,0.18)'
      ctx.setLineDash([2, 4])
      ctx.ellipse(width * 0.5, height * 0.92, width * 0.42, height * 0.22, 0, Math.PI, 0)
      ctx.stroke()
      ctx.setLineDash([])

      // base pedestal
      const pedGrad = ctx.createLinearGradient(width * 0.2, height * 0.88, width * 0.8, height * 0.95)
      pedGrad.addColorStop(0, 'rgba(0,229,255,0)')
      pedGrad.addColorStop(0.5, 'rgba(0,229,255,0.35)')
      pedGrad.addColorStop(1, 'rgba(0,229,255,0)')
      ctx.fillStyle = pedGrad
      ctx.fillRect(width * 0.18, height * 0.9, width * 0.64, 3)

      // update + draw blips
      for (const blip of blips) {
        const bx = blip.x * width
        const by = blip.y * height
        const dist = Math.abs(by - scanY)
        if (dist < 10) {
          blip.flash = 1
        } else {
          blip.flash = Math.max(0, blip.flash - 0.035)
        }

        // occasional drift
        blip.x += Math.sin(t * 0.4 + blip.phase) * 0.00015
        blip.y += Math.cos(t * 0.3 + blip.phase) * 0.00012
        blip.x = Math.min(0.88, Math.max(0.1, blip.x))
        blip.y = Math.min(0.86, Math.max(0.08, blip.y))

        const idle = 0.15 + 0.1 * Math.sin(t * 3 + blip.phase)
        const alpha = idle + blip.flash * 0.85 * blip.strength
        const size = 1.5 + blip.flash * 3.2 * blip.strength

        if (blip.flash > 0.05) {
          ctx.beginPath()
          ctx.fillStyle = `rgba(80,230,255,${blip.flash * 0.25})`
          ctx.arc(bx, by, size * 3.5, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.beginPath()
        ctx.fillStyle = `rgba(120,245,255,${alpha})`
        ctx.arc(bx, by, size, 0, Math.PI * 2)
        ctx.fill()

        // square marker when flashing
        if (blip.flash > 0.4) {
          const s = 4 + blip.flash * 2
          ctx.strokeStyle = `rgba(180,255,255,${blip.flash})`
          ctx.lineWidth = 1
          ctx.strokeRect(bx - s / 2, by - s / 2, s, s)
        }
      }

      // scan beam
      const beam = ctx.createLinearGradient(0, scanY - 28, 0, scanY + 8)
      beam.addColorStop(0, 'rgba(0,229,255,0)')
      beam.addColorStop(0.7, 'rgba(0,229,255,0.12)')
      beam.addColorStop(1, 'rgba(160,250,255,0.55)')
      ctx.fillStyle = beam
      ctx.fillRect(0, scanY - 28, width, 36)

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(180,255,255,0.85)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#00e5ff'
      ctx.shadowBlur = 8
      ctx.moveTo(0, scanY)
      ctx.lineTo(width, scanY)
      ctx.stroke()
      ctx.shadowBlur = 0

      // occasionally respawn a blip
      if (Math.random() < 0.004) {
        const i = Math.floor(Math.random() * blips.length)
        blips[i] = {
          x: 0.12 + Math.random() * 0.76,
          y: 0.1 + Math.random() * 0.8,
          strength: 0.45 + Math.random() * 0.55,
          phase: Math.random() * 10,
          flash: 0,
        }
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
