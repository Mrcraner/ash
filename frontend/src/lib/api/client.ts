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

export interface AuthUser {
  id: string
  username: string
  nickname: string
  created_at: string
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiBody<T>> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
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

  register: (body: {
    nickname: string
    username: string
    password: string
    confirm_password: string
  }) =>
    request<AuthUser>(`${BASE.user}/v1/auth/register`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { username: string; password: string }) =>
    request<AuthUser>(`${BASE.user}/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ logged_out: boolean }>(`${BASE.user}/v1/auth/logout`, {
      method: 'POST',
    }),

  me: () => request<AuthUser>(`${BASE.user}/v1/auth/me`),

  refresh: () =>
    request<AuthUser>(`${BASE.user}/v1/auth/refresh`, {
      method: 'POST',
    }),

  agentSecurePing: () =>
    request<{ user_id: string; username: string }>(`${BASE.agent}/v1/secure/ping`),
}
