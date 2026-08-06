import { useState, type FormEvent } from 'react'
import { useAuthStore } from '@/stores/authStore'

type AuthMode = 'login' | 'register'

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [nickname, setNickname] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const switchMode = (next: AuthMode) => {
    clearError()
    setMode(next)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(username.trim(), password)
      } else {
        await register({
          nickname: nickname.trim(),
          username: username.trim(),
          password,
          confirmPassword,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ash-auth-panel" onSubmit={onSubmit} autoComplete="on">
      <div className="ash-auth-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`ash-auth-panel__tab${mode === 'login' ? ' is-active' : ''}`}
          onClick={() => switchMode('login')}
        >
          登录
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`ash-auth-panel__tab${mode === 'register' ? ' is-active' : ''}`}
          onClick={() => switchMode('register')}
        >
          注册
        </button>
      </div>

      {mode === 'register' && (
        <label className="ash-auth-panel__field">
          <span>昵称</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={32}
            required
            placeholder="显示名称"
          />
        </label>
      )}

      <label className="ash-auth-panel__field">
        <span>用户名</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={32}
          required
          autoComplete="username"
          placeholder="1–32 字符"
        />
      </label>

      <label className="ash-auth-panel__field">
        <span>密码</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="至少 8 位，含字母和数字"
        />
      </label>

      {mode === 'register' && (
        <label className="ash-auth-panel__field">
          <span>确认密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="再次输入密码"
          />
        </label>
      )}

      {error && <p className="ash-auth-panel__error">{error}</p>}

      <button className="ash-auth-panel__submit" type="submit" disabled={submitting}>
        {submitting ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
      </button>
    </form>
  )
}
