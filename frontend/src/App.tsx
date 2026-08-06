import { useCallback, useEffect, useState } from 'react'
import { AshStandby } from '@/components/ash/AshStandby'
import { CameraBackground } from '@/components/camera/CameraBackground'
import { DataTunnel } from '@/components/transition/DataTunnel'
import { HoloScene } from '@/components/scene/HoloScene'
import { MouseSceneControls } from '@/components/scene/MouseSceneControls'
import { HudChrome } from '@/components/hud/HudChrome'
import { DevStatusPanel } from '@/components/hud/DevStatusPanel'
import { useAshStore } from '@/stores/ashStore'
import { useAuthStore } from '@/stores/authStore'

type AppPhase = 'sleep' | 'waking' | 'tunnel' | 'control'

const ASH_WAKE_KEY = 'ashWake'

function readAshWake(): boolean {
  try {
    return localStorage.getItem(ASH_WAKE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeAshWake(awake: boolean) {
  try {
    localStorage.setItem(ASH_WAKE_KEY, awake ? 'true' : 'false')
  } catch {
    /* ignore quota / private mode */
  }
}

function App() {
  const [phase, setPhase] = useState<AppPhase>(() => (readAshWake() ? 'control' : 'sleep'))
  const holoInteractionEnabled = useAshStore((s) => s.holoInteractionEnabled)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const enterControl = useCallback(() => {
    writeAshWake(true)
    setPhase('control')
  }, [])

  const goSleep = useCallback(() => {
    writeAshWake(false)
    setPhase('sleep')
  }, [])

  const startWake = useCallback(() => {
    writeAshWake(true)
    setPhase('waking')
  }, [])

  const guestEnter = useCallback(() => {
    writeAshWake(true)
    setPhase('tunnel')
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#02060c]">
      {(phase === 'sleep' || phase === 'waking') && (
        <AshStandby
          phase={phase}
          onWakeStart={startWake}
          onWakeComplete={() => setPhase('tunnel')}
          onGuestEnter={guestEnter}
        />
      )}

      {(phase === 'tunnel' || phase === 'control') && (
        <main
          className={`control-stage ${phase === 'control' ? 'control-stage--visible' : ''} ${phase === 'control' && !holoInteractionEnabled ? 'control-stage--mouse' : ''}`}
        >
          {phase === 'control' && holoInteractionEnabled && <CameraBackground />}
          <HoloScene />
          {phase === 'control' && <MouseSceneControls />}
          <HudChrome onReturnStandby={goSleep} />
          <DevStatusPanel />
        </main>
      )}

      {phase === 'tunnel' && <DataTunnel onComplete={enterControl} />}
    </div>
  )
}

export default App
