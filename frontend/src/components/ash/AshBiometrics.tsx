import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CodeMaintenanceStream } from './CodeMaintenanceStream'

const ECG_PATH =
  'M0 32 L20 32 L27 29 L34 35 L43 32 L55 32 L61 12 L70 51 L78 24 L85 32 L106 32 L114 29 L122 35 L132 32 L146 32 L152 17 L160 45 L168 27 L176 32 L200 32'

const INITIAL_MEMORY_CELLS = [
  0.2, 0.32, 0.58, 0.42, 0.78, 0.9,
  0.26, 0.66, 0.84, 0.35, 0.52, 0.72,
  0.48, 0.76, 0.96, 0.62, 0.3, 0.56,
]

const INITIAL_NEURAL_ACTIVITY = [12, 17, 15, 23, 20, 29, 25, 32, 28, 38, 34, 42]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const drift = (value: number, amount: number, min: number, max: number) =>
  clamp(value + (Math.random() - 0.5) * amount, min, max)

const formatClock = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function PanelHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="bio-panel__header">
      <span>{index}</span>
      <strong>{title}</strong>
      <i />
    </div>
  )
}

export function AshBiometrics() {
  const [metrics, setMetrics] = useState({
    respiration: 8,
    oxygen: 98.7,
    heartRate: 42,
    variability: 71,
    energy: 82,
    power: 4.72,
    memory: 63.4,
    temperature: 18.6,
    syncRate: 99.2,
  })
  const [memoryCells, setMemoryCells] = useState(INITIAL_MEMORY_CELLS)
  const [neuralActivity, setNeuralActivity] = useState(INITIAL_NEURAL_ACTIVITY)
  const [clock, setClock] = useState(() => new Date())
  const [stasisSeconds, setStasisSeconds] = useState(3 * 3600 + 48 * 60 + 12)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
      setStasisSeconds((value) => value + 1)
      setMetrics((current) => ({
        respiration: Math.round(drift(current.respiration, 0.8, 7, 9)),
        oxygen: drift(current.oxygen, 0.25, 98.3, 99.1),
        heartRate: Math.round(drift(current.heartRate, 1.8, 40, 45)),
        variability: Math.round(drift(current.variability, 4, 66, 76)),
        energy: drift(current.energy, 0.35, 81.2, 83.8),
        power: drift(current.power, 0.025, 4.68, 4.78),
        memory: drift(current.memory, 0.08, 63.2, 63.8),
        temperature: drift(current.temperature, 0.12, 18.3, 18.9),
        syncRate: drift(current.syncRate, 0.1, 99, 99.5),
      }))
      setMemoryCells((cells) =>
        cells.map((value) => drift(value, 0.2, 0.16, 0.98)),
      )
      setNeuralActivity((samples) => [
        ...samples.slice(1),
        drift(samples.at(-1) ?? 30, 13, 13, 47),
      ])
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const neuralPath = useMemo(
    () => neuralActivity
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${(index / (neuralActivity.length - 1)) * 260} ${58 - value}`)
      .join(' '),
    [neuralActivity],
  )
  const neuralArea = `${neuralPath} L260 62 L0 62Z`
  const energyPercent = metrics.energy.toFixed(0)

  return (
    <div className="ash-biometrics" aria-label="Ash 生命监测系统">
      <aside className="bio-left">
        <section className="bio-panel bio-respiration">
          <PanelHeader index="SYS.01" title="RESPIRATION" />
          <div className="respiration-core">
            <div className="respiration-orbit">
              <span />
            </div>
            <div>
              <span className="bio-kicker">BREATH CYCLE</span>
              <strong className="respiration-value">{String(metrics.respiration).padStart(2, '0')}</strong>
              <span className="bio-unit">BPM</span>
            </div>
          </div>
          <div className="bio-readout">
            <span>O₂ SATURATION</span>
            <strong>{metrics.oxygen.toFixed(1)}%</strong>
          </div>
        </section>

        <section className="bio-panel bio-ecg">
          <PanelHeader index="SYS.02" title="CARDIAC SIGNAL" />
          <div className="ecg-chart">
            <svg viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
              <path className="ecg-grid" d="M0 16H200M0 32H200M0 48H200M40 0V64M80 0V64M120 0V64M160 0V64" />
              <g className="ecg-stream">
                <path className="ecg-glow" d={ECG_PATH} />
                <path className="ecg-glow" d={ECG_PATH} transform="translate(200 0)" />
                <path className="ecg-line" d={ECG_PATH} />
                <path className="ecg-line" d={ECG_PATH} transform="translate(200 0)" />
              </g>
            </svg>
          </div>
          <div className="ecg-stats">
            <div><span>HEART RATE</span><strong>{metrics.heartRate}</strong><small>BPM</small></div>
            <div><span>VARIABILITY</span><strong>{metrics.variability}</strong><small>MS</small></div>
          </div>
        </section>

        <CodeMaintenanceStream />
      </aside>

      <aside className="bio-right">
        <section className="bio-panel bio-vitals">
          <PanelHeader index="ASH // 07" title="VITAL MATRIX" />
          <div className="vitals-state">
            <span className="vitals-state__dot" />
            <span>STASIS NOMINAL</span>
            <strong>{formatDuration(stasisSeconds)}</strong>
          </div>

          <div className="vitals-energy">
            <div className="energy-ring" style={{ '--energy': `${energyPercent}%` } as CSSProperties}>
              <div><strong>{energyPercent}</strong><span>%</span></div>
            </div>
            <div className="energy-copy">
              <span>CORE ENERGY</span>
              <strong>{metrics.power.toFixed(2)} <small>kWh</small></strong>
              <i><b style={{ width: `${energyPercent}%` }} /></i>
              <em>+{(0.72 + (metrics.energy - 82) * 0.05).toFixed(1)}% / HR</em>
            </div>
          </div>

          <div className="vitals-section">
            <div className="vitals-label"><span>NEURAL ACTIVITY</span><strong>LOW / STABLE</strong></div>
            <svg className="neural-chart" viewBox="0 0 260 62" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="neural-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#51edf3" stopOpacity=".3" />
                  <stop offset="1" stopColor="#51edf3" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="neural-area" d={neuralArea} />
              <path className="neural-line" d={neuralPath} />
            </svg>
          </div>

          <div className="vitals-section">
            <div className="vitals-label"><span>MEMORY MATRIX</span><strong>{metrics.memory.toFixed(1)} TB / 80 TB</strong></div>
            <div className="memory-heatmap" aria-hidden="true">
              {memoryCells.map((opacity, index) => (
                <i key={index} style={{ '--cell-alpha': opacity } as CSSProperties} />
              ))}
            </div>
          </div>

          <div className="vitals-footer">
            <div><span>LOCAL TIME</span><strong>{formatClock(clock)}</strong></div>
            <div><span>CORE TEMP</span><strong>{metrics.temperature.toFixed(1)}<small>°C</small></strong></div>
            <div><span>SYNC RATE</span><strong>{metrics.syncRate.toFixed(1)}<small>%</small></strong></div>
          </div>
        </section>
      </aside>
    </div>
  )
}
