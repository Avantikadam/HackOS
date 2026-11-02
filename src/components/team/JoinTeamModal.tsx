import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinTeamByCode, type JoinTeamResult } from '../../services/teamCodeService'

interface JoinTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (result: JoinTeamResult) => void
}

export function JoinTeamModal({ isOpen, onClose, onSuccess }: JoinTeamModalProps) {
  const [teamCode, setTeamCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<JoinTeamResult | null>(null)
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase()
    // Auto-prepend HACK- if user types directly alphanumeric without prefix
    if (!val.startsWith('HACK-') && val.length > 0 && !val.includes('-')) {
      val = 'HACK-' + val
    }
    setTeamCode(val)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await joinTeamByCode(teamCode)
      setResult(res)
      if (onSuccess) onSuccess(res)
    } catch (err: any) {
      setError(err?.message || 'Failed to join team.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted hover:text-ink text-lg font-bold"
        >
          ✕
        </button>

        {result ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sage-tint text-sage text-2xl font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-ink">
                {result.already_member ? 'Already on Team' : 'Team Joined!'}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                {result.message}
              </p>
              <div className="mt-4 rounded-xl border border-line bg-parchment/50 p-3">
                <p className="text-xs uppercase tracking-wider text-ink-muted font-bold">Team Name</p>
                <p className="font-heading text-base font-semibold text-cobalt">{result.team_name}</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/team/my-team')
                }}
                className="rounded-xl bg-cobalt px-5 py-2.5 text-sm font-semibold text-white hover:bg-cobalt-deep"
              >
                Go to Team Roster →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cobalt-tint text-cobalt font-mono font-bold">
                #
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-ink">
                  Join Team with Code
                </h2>
                <p className="text-xs text-ink-muted">
                  Enter the unique HACK-XXXXXX invite code from your team leader.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-coral/30 bg-coral-tint/40 p-3 text-xs font-semibold text-coral">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Team Invitation Code
                </label>
                <input
                  type="text"
                  required
                  value={teamCode}
                  onChange={handleInputChange}
                  placeholder="HACK-AB12CD"
                  maxLength={11}
                  className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-ink focus:border-cobalt focus:outline-none uppercase"
                />
                <p className="mt-1 text-center text-[0.72rem] text-ink-muted">
                  Format: <span className="font-mono">HACK-XXXXXX</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-parchment"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || teamCode.length < 6}
                  className="rounded-xl bg-cobalt px-5 py-2 text-sm font-semibold text-white hover:bg-cobalt-hover disabled:opacity-50"
                >
                  {submitting ? 'Verifying Code...' : 'Join Squad'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

