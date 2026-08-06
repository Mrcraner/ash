import { TERRAIN_LANDMARKS } from '@/data/landmarks'
import { useAshStore } from '@/stores/ashStore'

/**
 * Floating GEO intel panel that follows the probing finger (screenshot 4).
 */
export function FloatingGeoPanel() {
  const panel = useAshStore((s) => s.floatingPanel)
  const sceneMode = useAshStore((s) => s.sceneMode)

  if (sceneMode !== 'terrain' || !panel) return null

  const landmark = TERRAIN_LANDMARKS.find((l) => l.id === panel.landmarkId)
  if (!landmark) return null

  return (
    <div
      className="floating-geo-panel"
      style={{
        left: `${panel.x * 100}%`,
        top: `${panel.y * 100}%`,
      }}
    >
      <div className="floating-geo-panel__title">GEO_INTEL_LIVE</div>
      <div className="floating-geo-panel__body">
        <div className="floating-geo-panel__name">{landmark.name}</div>
        <div className="floating-geo-panel__detail">{landmark.detail}</div>
        <div className="floating-geo-panel__signal">信号强度 98%</div>
        <div className="floating-geo-panel__coords">
          <span>{landmark.coords[0]}</span>
          <span>{landmark.coords[1]}</span>
        </div>
      </div>
    </div>
  )
}
