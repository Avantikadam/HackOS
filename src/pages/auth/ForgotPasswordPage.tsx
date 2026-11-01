import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../components/Nav'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) {
      const msg =
        err.message === 'Failed to fetch'
          ? 'Unable to connect to authentication server. Please check your internet connection and try again.'
          : err.message
      setError(msg)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <Link to="/" className="mb-8 flex justify-center rounded-xl">
          <Wordmark />
        </Link>

        <div className="rounded-2xl border border-line/90 bg-white p-8 shadow-soft">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage-tint">
                <svg viewBox="0 0 20 20" className="h-6 w-6 text-sage" fill="none">
                  <path d="m4.5 10.5 3.4 3.4 7.6-7.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="font-display text-[1.4rem] font-semibold text-ink">Email sent</h2>
              <p className="mt-2 text-[0.88rem] text-ink-muted">
                Check <strong className="text-ink">{email}</strong> for a password reset link.
              </p>
              <Link to="/login" className="mt-6 block text-[0.88rem] font-semibold text-cobalt hover:text-cobalt-deep">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[1.65rem] font-semibold tracking-[-0.02em] text-ink">
                Reset password
              </h1>
              <p className="mt-1.5 text-[0.88rem] text-ink-muted">
                Enter your email and we'll send you a reset link.
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
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt px-5 text-[0.94rem] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(31,78,216,0.9)] transition-all duration-200 hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
              <p className="mt-5 text-center text-[0.85rem]">
                <Link to="/login" className="font-semibold text-cobalt hover:text-cobalt-deep">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

