import { useRef, useState } from 'react'
import wakeVideo from '@/assets/video/Ash_wake.mp4'
import { AshBiometrics } from './AshBiometrics'
import { AuthPanel } from './AuthPanel'
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore'

interface AshStandbyProps {
  phase: 'sleep' | 'waking'
  onWakeStart: () => void
  onWakeComplete: () => void
  /** Guest path: enter console without login (抢先体验). */
  onGuestEnter: () => void
}

export function AshStandby({ phase, onWakeStart, onWakeComplete, onGuestEnter }: AshStandbyProps) {
  const wakeRef = useRef<HTMLVideoElement>(null)
  const [wakeReady, setWakeReady] = useState(false)
  const isAuthed = useAuthStore(selectIsAuthenticated)
  const logout = useAuthStore(s => s.logout)

  const wakeAsh = () => {
    if (!wakeReady || !wakeRef.current || phase === 'waking') return
    wakeRef.current.currentTime = 0
    onWakeStart()
    void wakeRef.current.play()
  }

  return (
    <section className="ash-standby" aria-label="Ash 待机界面">
      <video ref={wakeRef} className={`ash-video${phase === 'sleep' ? ' ash-video--breathing' : ''}`} src={wakeVideo} muted playsInline preload="auto" onCanPlay={() => setWakeReady(true)} onEnded={onWakeComplete} aria-hidden="true" />

      <div className="ash-vignette" aria-hidden="true" />
      <div className="ash-scanlines" aria-hidden="true" />
      <AshBiometrics />

      {phase === 'sleep' && (
        <div className={`ash-activation-row${isAuthed ? '' : ' ash-activation-row--guest'}`}>
          {isAuthed ? (
            <>
              <div className="ash-activation">
                <button className="ash-activation__button" type="button" onClick={wakeAsh} disabled={!wakeReady} aria-label="唤醒 Ash">
                  <span className="ash-activation__orbit" aria-hidden="true" />
                  <span className="ash-activation__core" aria-hidden="true">
                    <span className="ash-activation__glyph" />
                  </span>
                </button>
                <p className="ash-activation__label">{wakeReady ? '唤醒' : '神经网络加载中...'}</p>
              </div>
              <button className="ash-rect-btn" type="button" onClick={() => void logout()}>
                登出
              </button>
            </>
          ) : (
            <>
              <AuthPanel />
              <button className="ash-rect-btn ash-rect-btn--accent" type="button" onClick={onGuestEnter}>
                抢先体验
              </button>
            </>
          )}
        </div>
      )}

      <div className="ash-status" aria-hidden="true">
        <span>ASH // NEURAL CORE</span>
        <span className="ash-status__pulse" />
        <span>{phase === 'waking' ? 'AWAKENING' : 'STANDBY'}</span>
      </div>
    </section>
  )
}
