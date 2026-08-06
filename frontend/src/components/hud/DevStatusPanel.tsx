import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

interface PingState {
  user: string
  agent: string
  community: string
}

/** Local-dev smoke panel: confirms nginx/vite proxy + Go services respond. */
export function DevStatusPanel() {
  const [state, setState] = useState<PingState>({
    user: '…',
    agent: '…',
    community: '…',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next: PingState = { user: 'fail', agent: 'fail', community: 'fail' }
      try {
        const u = await api.userHello()
        next.user = u.code === 0 ? 'ok' : `code ${u.code}`
      } catch {
        next.user = 'down'
      }
      try {
        const a = await api.agentHello()
        next.agent = a.code === 0 ? 'ok' : `code ${a.code}`
      } catch {
        next.agent = 'down'
      }
      try {
        const c = await api.communityHello()
        next.community = c.code === 0 ? 'ok' : `code ${c.code}`
      } catch {
        next.community = 'down'
      }
      if (!cancelled) setState(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="pointer-events-none absolute bottom-4 right-4 z-20 rounded border border-[var(--ash-cyan-dim)] bg-[var(--ash-panel)] px-3 py-2 font-mono text-xs backdrop-blur"
      data-hud-interactive
    >
      <div className="mb-1 text-[var(--ash-cyan)]">API SMOKE</div>
      <div>user: {state.user}</div>
      <div>agent: {state.agent}</div>
      <div>community: {state.community}</div>
    </div>
  )
}
