import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../components/Nav'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      const msg =
        authError.message === 'Failed to fetch'
          ? 'Unable to connect to authentication server. Please check your internet connection and try again.'
          : authError.message
      setError(msg)
      return
    }
    navigate(from ?? '/select-role', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <Link to="/" className="mb-8 flex justify-center rounded-xl">
          <Wordmark />
        </Link>

        <div className="rounded-2xl border border-line/90 bg-white p-8 shadow-soft">
          <h1 className="font-display text-[1.65rem] font-semibold tracking-[-0.02em] text-ink">
            Sign in
          </h1>
          <p className="mt-1.5 text-[0.88rem] text-ink-muted">
            Welcome back. Choose your role after signing in.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-coral/25 bg-coral-tint px-4 py-3 text-[0.85rem] text-coral-ink">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[0.82rem] font-semibold text-ink">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink placeholder-ink-muted transition-colors focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-[0.82rem] font-semibold text-ink">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[0.8rem] text-cobalt hover:text-cobalt-deep"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink placeholder-ink-muted transition-colors focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt px-5 text-[0.94rem] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(31,78,216,0.9)] transition-all duration-200 hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[0.85rem] text-ink-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-cobalt hover:text-cobalt-deep">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

