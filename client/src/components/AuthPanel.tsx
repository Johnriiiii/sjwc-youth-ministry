import { useState } from 'react'
import type { FormEvent } from 'react'

type AuthPanelProps = {
  loading: boolean
  onSignup: (input: { fullName: string; email: string; password: string }) => Promise<void>
  onLogin: (input: { email: string; password: string }) => Promise<void>
  onResendActivation: (email: string) => Promise<void>
}

export function AuthPanel({ loading, onSignup, onLogin, onResendActivation }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Full name is required')
          return
        }
        await onSignup({ fullName, email, password })
        setFullName('')
        setEmail('')
        setPassword('')
        setMode('login')
      } else {
        await onLogin({ email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const canResend =
    mode === 'login' &&
    error.toLowerCase().includes('please activate your account') &&
    email.trim().length > 0

  const resendActivation = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }

    setResendLoading(true)
    setError('')
    try {
      await onResendActivation(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend activation link')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/SWJC-YOUTH.png" alt="St. Joseph the Worker Chapel Youth Council" className="logo-auth" />
        </div>
        <div className="auth-head">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
          <p>
            {mode === 'login'
              ? 'Login first before accessing the form.'
              : 'Register your account to continue.'}
          </p>
        </div>

        <div className="auth-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Login
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
            </div>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>
          {mode === 'signup' && <p className="auth-note">An activation link will be sent to your Gmail before first login.</p>}

          {error && <p className="auth-error">{error}</p>}
          {canResend && (
            <button className="auth-resend" type="button" onClick={resendActivation} disabled={resendLoading || loading}>
              {resendLoading ? 'Sending activation link...' : 'Resend activation link'}
            </button>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
