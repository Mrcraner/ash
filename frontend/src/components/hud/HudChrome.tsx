import type { ReactNode } from 'react'
import { useAshStore } from '@/stores/ashStore'

export function HudChrome() {
  const sceneMode = useAshStore((s) => s.sceneMode)
  const setSceneMode = useAshStore((s) => s.setSceneMode)
  const metrics = useAshStore((s) => s.metrics)
  const cameraReady = useAshStore((s) => s.cameraReady)

  const now = new Date()
  const clock = now.toISOString().slice(11, 23)

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <header className="pointer-events-auto flex items-start justify-between p-4">
        <div className="rounded border border-[var(--ash-cyan-dim)] bg-[var(--ash-panel)] px-3 py-2 backdrop-blur">
          <div className="text-sm tracking-[0.2em] text-[var(--ash-cyan)]">ASH / OPERATOR</div>
          <div className="mt-1 text-xs text-white/60">
            cam {cameraReady ? 'ready' : 'idle'} · track {(metrics.trackingConfidence * 100).toFixed(0)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-[0.35em] text-[var(--ash-cyan)]">J.A.R.V.I.S.</div>
          <div className="font-mono text-sm text-white/70">{clock}</div>
        </div>
      </header>

      <aside className="pointer-events-auto absolute left-4 top-28 space-y-3">
        <Gauge label="SYS" value={74} />
        <Gauge label="CV" value={58} />
        <div className="rounded border border-[var(--ash-cyan-dim)] bg-[var(--ash-panel)] p-3 text-xs backdrop-blur">
          <div className="mb-2 text-[var(--ash-cyan)]">SCENE</div>
          <div className="flex gap-2">
            <ModeButton active={sceneMode === 'globe'} onClick={() => setSceneMode('globe')}>
              GLOBE
            </ModeButton>
            <ModeButton active={sceneMode === 'terrain'} onClick={() => setSceneMode('terrain')}>
              TERRAIN
            </ModeButton>
          </div>
        </div>
      </aside>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/75">
        Scaffold ready — hand skeleton / gestures / SFX modules are stubbed for upcoming implementation
      </footer>
    </div>
  )
}

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--ash-cyan-dim)] bg-[var(--ash-panel)] text-center backdrop-blur">
      <div>
        <div className="text-lg text-[var(--ash-cyan)]">{value}%</div>
        <div className="text-[10px] tracking-widest text-white/50">{label}</div>
      </div>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 ${
        active
          ? 'bg-[var(--ash-cyan)] text-black'
          : 'border border-[var(--ash-cyan-dim)] text-[var(--ash-cyan)]'
      }`}
    >
      {children}
    </button>
  )
}
