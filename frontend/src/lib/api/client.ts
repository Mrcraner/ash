const BASE = {
  user: '/api/user',
  agent: '/api/agent',
  community: '/api/community',
} as const

export interface ApiBody<T> {
  code: number
  message: string
  data?: T
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiBody<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json() as Promise<ApiBody<T>>
}

/** Smoke-test helpers used by the scaffold status panel. */
export const api = {
  userHello: () => request<{ items: unknown[] }>(`${BASE.user}/v1/hello`),
  agentHello: () => request<{ message: string }>(`${BASE.agent}/v1/hello`),
  communityHello: () => request<{ message: string }>(`${BASE.community}/v1/hello`),
  createUserHello: (message: string) =>
    request(`${BASE.user}/v1/hello`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}
