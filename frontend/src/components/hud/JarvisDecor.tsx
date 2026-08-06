import type { ReactNode } from 'react'
import { ParticleTetrahedron } from '@/components/hud/ParticleTetrahedron'
import { RadarScanner } from '@/components/hud/RadarScanner'
import { EnergyCore } from '@/components/hud/EnergyCore'
import { NeuralLink } from '@/components/hud/NeuralLink'

function PanelHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="jarvis-panel__header">
      <span>{index}</span>
      <strong>{title}</strong>
      <i />
    </div>
  )
}

function JarvisPanel({
  index,
  title,
  children,
  className = '',
}: {
  index: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`jarvis-panel ${className}`.trim()}>
      <PanelHeader index={index} title={title} />
      <div className="jarvis-panel__body">{children}</div>
    </section>
  )
}

/** Frameless particle tetrahedron — lower left. */
export function JarvisTetraFloat() {
  return (
    <div className="jarvis-tetra-float" aria-hidden>
      <ParticleTetrahedron />
    </div>
  )
}

/** Right-side JARVIS decorative stack. */
export function JarvisRightRail() {
  return (
    <aside className="jarvis-right-rail" aria-label="ASH 全息诊断模组">
      <JarvisPanel index="SYS.01" title="SIGNAL SCAN" className="jarvis-panel--scan">
        <RadarScanner />
      </JarvisPanel>

      <JarvisPanel index="SYS.02" title="ENERGY CORE" className="jarvis-panel--core">
        <EnergyCore />
      </JarvisPanel>

      <JarvisPanel index="SYS.03" title="NEURAL LINK" className="jarvis-panel--neural">
        <NeuralLink />
      </JarvisPanel>
    </aside>
  )
}
