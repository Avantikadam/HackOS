import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../components/Nav'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      const msg =
        err.message === 'Failed to fetch'
          ? 'Unable to connect to authentication server. Please check your internet connection and try again.'
          : err.message
      setError(msg)
      return
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-2xl border border-line/90 bg-white p-8 shadow-soft">
          <h1 className="font-display text-[1.65rem] font-semibold tracking-[-0.02em] text-ink">
            Set new password
          </h1>
          {error && (
            <div className="mt-4 rounded-xl border border-coral/25 bg-coral-tint px-4 py-3 text-[0.85rem] text-coral-ink">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[0.82rem] font-semibold text-ink">
                New password
              </label>
              <input
                id="password"
                type="password"
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
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

