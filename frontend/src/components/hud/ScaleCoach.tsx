import { useAshStore } from '@/stores/ashStore'

/**
 * Coach HUD for scale clutch: OK glyph while editing, lock flash, re-edit hint.
 */
export function ScaleCoach() {
  const scaleMode = useAshStore((s) => s.scaleMode)
  const scaleSettling = useAshStore((s) => s.scaleSettling)
  const scaleFlash = useAshStore((s) => s.scaleFlash)
  const leftOnline = useAshStore((s) => s.leftOnline)
  const globeScale = useAshStore((s) => s.globeScale)
  const terrainScale = useAshStore((s) => s.terrainScale)
  const sceneMode = useAshStore((s) => s.sceneMode)

  const scale = sceneMode === 'globe' ? globeScale : terrainScale
  const editing = scaleMode === 'editing'

  return (
    <div
      className={`scale-coach ${editing ? 'scale-coach--editing' : 'scale-coach--locked'}${scaleSettling ? ' scale-coach--settling' : ''}`}
    >
      {editing ? (
        <>
          <div className="scale-coach__ok" aria-hidden="true">
            <OkGlyph />
          </div>
          <div className="scale-coach__body">
            <div className="scale-coach__title">
              {scaleSettling ? '姿态校准中' : '缩放编辑中'}
            </div>
            <div className="scale-coach__hint">
              {scaleSettling
                ? '保持左手约 1 秒，记录当前开合为基准'
                : '左手张开→最大 · 握拳→最小 · 右手握紧拖转'}
            </div>
            <div className="scale-coach__meter">
              <div
                className="scale-coach__meter-fill"
                style={{ width: `${Math.min(100, ((scale - 0.42) / 2.43) * 100)}%` }}
              />
            </div>
            <div className="scale-coach__value">{scale.toFixed(2)}×</div>
          </div>
        </>
      ) : (
        <div className="scale-coach__body">
          <div className="scale-coach__title">尺寸已锁定</div>
          <div className="scale-coach__hint">
            {leftOnline
              ? '右手 OK 可重新调节 · 双手张开片刻 → 地形'
              : '举起左手调节 · 双手张开片刻 → 地形 / 双手握拳 → 地球'}
          </div>
        </div>
      )}

      {scaleFlash && (
        <div className={`scale-coach__flash scale-coach__flash--${scaleFlash}`}>
          {scaleFlash === 'locked' ? 'LOCKED' : 'EDIT'}
        </div>
      )}
    </div>
  )
}

function OkGlyph() {
  return (
    <svg className="scale-coach__ok-svg" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="26" cy="28" r="8" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M34 24c2 1 4 4 4 8v18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M38 30c2.5 0 5 1.5 5 5v15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M42 32c2.5 0 5 1.2 5 4.5V52"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <text x="32" y="58" textAnchor="middle" fill="currentColor" fontSize="7" letterSpacing="0.15em">
        OK
      </text>
    </svg>
  )
}
