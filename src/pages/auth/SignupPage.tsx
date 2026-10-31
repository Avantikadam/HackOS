import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../components/Nav'

export function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    // If session is immediately available (email confirmation disabled), redirect
    if (data.session) {
      navigate('/select-role', { replace: true })
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
        <div className="w-full max-w-[26rem] text-center">
          <Wordmark className="justify-center" />
          <div className="mt-8 rounded-2xl border border-line/90 bg-white p-8 shadow-soft">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage-tint">
              <svg viewBox="0 0 20 20" className="h-6 w-6 text-sage" fill="none">
                <path d="m4.5 10.5 3.4 3.4 7.6-7.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-display text-[1.4rem] font-semibold text-ink">Check your email</h2>
            <p className="mt-2 text-[0.88rem] text-ink-muted">
              We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click it
              to activate your account, then sign in.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt px-5 text-[0.94rem] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(31,78,216,0.9)] transition-all duration-200 hover:bg-cobalt-deep"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <Link to="/" className="mb-8 flex justify-center rounded-xl">
          <Wordmark />
        </Link>

        <div className="rounded-2xl border border-line/90 bg-white p-8 shadow-soft">
          <h1 className="font-display text-[1.65rem] font-semibold tracking-[-0.02em] text-ink">
            Create account
          </h1>
          <p className="mt-1.5 text-[0.88rem] text-ink-muted">
            Join HACKOS as an organizer, participant, or venue.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-coral/25 bg-coral-tint px-4 py-3 text-[0.85rem] text-coral-ink">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[0.82rem] font-semibold text-ink">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink placeholder-ink-muted transition-colors focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                placeholder="Ada Okoye"
              />
            </div>

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
              <label htmlFor="password" className="mb-1.5 block text-[0.82rem] font-semibold text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink placeholder-ink-muted transition-colors focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                placeholder="8+ characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-[0.82rem] font-semibold text-ink">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[0.85rem] text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-cobalt hover:text-cobalt-deep">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

