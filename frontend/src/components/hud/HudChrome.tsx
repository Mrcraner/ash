import type { ReactNode } from 'react'
import { FloatingGeoPanel } from '@/components/hud/FloatingGeoPanel'
import { JarvisRightRail, JarvisTetraFloat } from '@/components/hud/JarvisDecor'
import { ScaleCoach } from '@/components/hud/ScaleCoach'
import { enterGlobeDefault, enterTerrainFullscreen } from '@/lib/gesture/physics'
import { useAshStore } from '@/stores/ashStore'
import { selectIsAuthenticated, useAuthStore } from '@/stores/authStore'

interface HudChromeProps {
  /** Sleep (authed) or 立即登录 (guest) — only this updates ashWake + returns to standby. */
  onReturnStandby: () => void
}

export function HudChrome({ onReturnStandby }: HudChromeProps) {
  const sceneMode = useAshStore(s => s.sceneMode)
  const metrics = useAshStore(s => s.metrics)
  const cameraReady = useAshStore(s => s.cameraReady)
  const leftOnline = useAshStore(s => s.leftOnline)
  const rightOnline = useAshStore(s => s.rightOnline)
  const holoInteractionEnabled = useAshStore(s => s.holoInteractionEnabled)
  const voiceControlEnabled = useAshStore(s => s.voiceControlEnabled)
  const setHoloInteractionEnabled = useAshStore(s => s.setHoloInteractionEnabled)
  const setVoiceControlEnabled = useAshStore(s => s.setVoiceControlEnabled)
  const isAuthed = useAuthStore(selectIsAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)

  const now = new Date()
  const clock = now.toISOString().slice(11, 23)

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <header className="pointer-events-auto flex items-start justify-between gap-4 p-4" data-hud-interactive>
        <div className="flex flex-col gap-2">
          <div className="rounded border border-[var(--ash-cyan-dim)] bg-[var(--ash-panel)] px-3 py-2 backdrop-blur">
            <div className="text-sm tracking-[0.2em] text-[var(--ash-cyan)]">ASH / OPERATOR</div>
            <div className="mt-1 text-xs text-white/60">
              cam {holoInteractionEnabled ? (cameraReady ? 'ready' : 'idle') : 'off'} · track {(metrics.trackingConfidence * 100).toFixed(0)}%{user ? ` · ${user.nickname}` : ' · GUEST'}
            </div>
          </div>
          <div className="ash-hud-actions">
            <button className="ash-rect-btn" type="button" onClick={onReturnStandby}>
              {isAuthed ? '睡眠' : '立即登录'}
            </button>
            {isAuthed && (
              <button className="ash-rect-btn" type="button" onClick={() => void logout()}>
                登出
              </button>
            )}
          </div>
        </div>

        <div className="control-toggles">
          <ControlToggle label="全息交互" hint="摄像头 · 手势" checked={holoInteractionEnabled} onChange={setHoloInteractionEnabled} />
          <ControlToggle label="语音控制" hint="麦克风 · Agent" checked={voiceControlEnabled} onChange={setVoiceControlEnabled} />
        </div>

        <div className="text-right">
          <div className="text-2xl font-semibold tracking-[0.35em] text-[var(--ash-cyan)]">A.S.H</div>
          <div className="font-mono text-sm text-white/70">{clock}</div>
        </div>
      </header>

      <JarvisTetraFloat />
      {!holoInteractionEnabled && <JarvisRightRail />}

      <aside className="pointer-events-auto absolute left-4 top-38 space-y-3" data-hud-interactive>
        <Gauge label="SYS" value={74} />
        <Gauge label="CV" value={Math.round(metrics.trackingConfidence * 100)} />
        <div className="rounded border border-[var(--ash-cyan-dim)] bg-[var(--ash-panel)] p-3 text-xs backdrop-blur">
          <div className="mb-2 text-[var(--ash-cyan)]">SCENE</div>
          <div className="flex gap-2">
            <ModeButton active={sceneMode === 'globe'} onClick={() => enterGlobeDefault()}>
              GLOBE
            </ModeButton>
            <ModeButton active={sceneMode === 'terrain'} onClick={() => enterTerrainFullscreen()}>
              TERRAIN
            </ModeButton>
          </div>
        </div>
      </aside>

      {holoInteractionEnabled && <ScaleCoach />}

      {holoInteractionEnabled && (
        <div className="hand-status-panel">
          <div className="hand-status-panel__title">生物识别输入</div>
          <HandStatusRow label="左手操控模组" online={leftOnline} />
          <HandStatusRow label="右手交互模组" online={rightOnline} />
        </div>
      )}

      <FloatingGeoPanel />

      <footer className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/75">ASH不会上传您的图像或声音，推理服务由第三方知名开源模型提供</footer>
    </div>
  )
}

function ControlToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <div
      className={`control-toggle ${checked ? 'control-toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      role="presentation"
    >
      <span className="control-toggle__text">
        <span className="control-toggle__label">{label}</span>
        <span className="control-toggle__hint">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="control-toggle__switch"
        onClick={e => {
          e.stopPropagation()
          onChange(!checked)
        }}
      >
        <span className="control-toggle__knob" />
      </button>
    </div>
  )
}

function HandStatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="hand-status-panel__row">
      <span>{label}</span>
      <span className={online ? 'hand-status-panel__online' : 'hand-status-panel__offline'}>{online ? '在线' : '离线'}</span>
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

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded px-2 py-1 ${active ? 'bg-[var(--ash-cyan)] text-black' : 'border border-[var(--ash-cyan-dim)] text-[var(--ash-cyan)]'}`}>
      {children}
    </button>
  )
}
