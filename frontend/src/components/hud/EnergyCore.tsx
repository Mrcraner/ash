import { useEffect, useState } from 'react'

const SEGMENTS = 24

export function EnergyCore({ power = 82 }: { power?: number }) {
  const [pulse, setPulse] = useState(power)

  useEffect(() => {
    const id = window.setInterval(() => {
      setPulse((v) => {
        const next = v + (Math.random() - 0.5) * 1.4
        return Math.min(88, Math.max(76, next))
      })
    }, 420)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="energy-core" aria-hidden>
      <div className="energy-core__glow" />
      <svg className="energy-core__svg" viewBox="0 0 120 120">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(120,250,255,0.55)" />
            <stop offset="55%" stopColor="rgba(0,229,255,0.12)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>
          <filter id="coreBloom">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="60" cy="60" r="48" fill="url(#coreGlow)" />

        {/* outer segmented ring */}
        <g className="energy-core__ring energy-core__ring--outer" filter="url(#coreBloom)">
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const a0 = (i / SEGMENTS) * Math.PI * 2 - Math.PI / 2
            const a1 = ((i + 0.72) / SEGMENTS) * Math.PI * 2 - Math.PI / 2
            const r0 = 42
            const r1 = 48
            const lit = i % 3 !== 2
            const x0 = 60 + Math.cos(a0) * r0
            const y0 = 60 + Math.sin(a0) * r0
            const x1 = 60 + Math.cos(a1) * r0
            const y1 = 60 + Math.sin(a1) * r0
            const x2 = 60 + Math.cos(a1) * r1
            const y2 = 60 + Math.sin(a1) * r1
            const x3 = 60 + Math.cos(a0) * r1
            const y3 = 60 + Math.sin(a0) * r1
            return (
              <path
                key={i}
                d={`M${x0} ${y0} L${x1} ${y1} L${x2} ${y2} L${x3} ${y3} Z`}
                fill={lit ? 'rgba(110,247,255,0.85)' : 'rgba(20,60,80,0.55)'}
                opacity={lit ? 0.9 : 0.45}
              />
            )
          })}
        </g>

        {/* mid ring */}
        <circle
          className="energy-core__ring energy-core__ring--mid"
          cx="60"
          cy="60"
          r="34"
          fill="none"
          stroke="rgba(110,247,255,0.35)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        {/* inner triangle frame — apex down */}
        <polygon
          points="60,92 28,36 92,36"
          fill="none"
          stroke="rgba(150,250,255,0.55)"
          strokeWidth="1.2"
        />
        <polygon
          className="energy-core__triangle"
          points="60,82 40,44 80,44"
          fill="rgba(80,240,255,0.92)"
          filter="url(#coreBloom)"
        />

        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(100,230,255,0.2)" strokeWidth="0.6" />
      </svg>
      <div className="energy-core__readout">
        <span>{pulse.toFixed(1)}%</span>
        <small>ARC OUTPUT</small>
      </div>
    </div>
  )
}
