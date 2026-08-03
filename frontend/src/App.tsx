import { HoloScene } from '@/components/scene/HoloScene'
import { HudChrome } from '@/components/hud/HudChrome'
import { DevStatusPanel } from '@/components/hud/DevStatusPanel'

function App() {
  return (
    <div className="relative h-full w-full">
      <HoloScene />
      <HudChrome />
      <DevStatusPanel />
    </div>
  )
}

export default App
