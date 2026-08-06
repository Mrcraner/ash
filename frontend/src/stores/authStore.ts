import { create } from 'zustand'
import { api, type AuthUser } from '@/lib/api/client'

type AuthStatus = 'idle' | 'loading' | 'ready'

interface AuthStore {
  status: AuthStatus
  user: AuthUser | null
  error: string | null
  bootstrap: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  register: (input: {
    nickname: string
    username: string
    password: string
    confirmPassword: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'idle',
  user: null,
  error: null,

  bootstrap: async () => {
    set({ status: 'loading', error: null })
    try {
      const res = await api.me()
      if (res.code === 0 && res.data) {
        set({ user: res.data, status: 'ready' })
        return
      }
      set({ user: null, status: 'ready' })
    } catch {
      set({ user: null, status: 'ready' })
    }
  },

  login: async (username, password) => {
    set({ error: null })
    try {
      const res = await api.login({ username, password })
      if (res.code !== 0 || !res.data) {
        set({ error: res.message || '登录失败' })
        return false
      }
      set({ user: res.data })
      return true
    } catch {
      set({ error: '网络异常，请稍后重试' })
      return false
    }
  },

  register: async ({ nickname, username, password, confirmPassword }) => {
    set({ error: null })
    try {
      const res = await api.register({
        nickname,
        username,
        password,
        confirm_password: confirmPassword,
      })
      if (res.code !== 0 || !res.data) {
        set({ error: res.message || '注册失败' })
        return false
      }
      set({ user: res.data })
      return true
    } catch {
      set({ error: '网络异常，请稍后重试' })
      return false
    }
  },

  logout: async () => {
    try {
      await api.logout()
    } catch {
      /* ignore network errors on logout */
    }
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export const selectIsAuthenticated = (s: AuthStore) => s.user !== null
