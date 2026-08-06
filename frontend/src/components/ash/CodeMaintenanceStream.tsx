const MAINTENANCE_LOGS = [
  ['00:14:08', 'CACHE', 'purge temp_vector[0x7A]'],
  ['00:14:09', 'MEM', 'defrag semantic.heap --pass=04'],
  ['00:14:09', 'CHECK', 'verify neural_link integrity'],
  ['00:14:10', 'CORE', 'checksum cortex.map :: OK'],
  ['00:14:10', 'CACHE', 'release dormant_context[]'],
  ['00:14:11', 'TRAIN', 'replay latent_batch_8842'],
  ['00:14:11', 'LOSS', 'gradient convergence 0.0031'],
  ['00:14:12', 'MODEL', 'merge delta_weights --safe'],
  ['00:14:12', 'CHECK', 'validate response lattice'],
  ['00:14:13', 'SYNC', 'checkpoint committed :: OK'],
]

function LogSequence({ copy }: { copy: number }) {
  return (
    <div className="maintenance-stream__sequence" aria-hidden={copy > 0}>
      {MAINTENANCE_LOGS.map(([time, scope, message], index) => (
        <div className="maintenance-stream__line" key={`${copy}-${index}`}>
          <time>{time}</time>
          <b>{scope}</b>
          <code>{message}</code>
        </div>
      ))}
    </div>
  )
}

export function CodeMaintenanceStream() {
  return (
    <section className="bio-panel maintenance-stream" aria-label="Ash 睡眠维护进程">
      <div className="bio-panel__header">
        <span>SYS.03</span>
        <strong>SLEEP MAINTENANCE</strong>
        <i />
      </div>

      <div className="maintenance-stream__viewport">
        <div className="maintenance-stream__track">
          <LogSequence copy={0} />
          <LogSequence copy={1} />
        </div>
      </div>

      <div className="maintenance-stream__footer">
        <span><i /> AUTONOMOUS CYCLE</span>
        <strong>PROCESSING</strong>
      </div>
    </section>
  )
}
