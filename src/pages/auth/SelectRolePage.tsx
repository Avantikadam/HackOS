import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Wordmark } from '../../components/Nav'
import { CAST, Character } from '../../components/characters/Character'
import type { UserRole } from '../../types/database'

const ROLE_OPTIONS: {
  id: UserRole
  label: string
  description: string
  character: keyof typeof CAST
  color: string
  borderColor: string
  bgColor: string
}[] = [
  {
    id: 'organizer',
    label: 'Organizer',
    description: 'Create and manage hackathons, coordinate venues, and oversee the full operational lifecycle.',
    character: 'ada',
    color: 'text-coral',
    borderColor: 'border-coral/30',
    bgColor: 'bg-coral-tint/40',
  },
  {
    id: 'participant',
    label: 'Participant',
    description: 'Discover hackathons, join teams using unique codes, and generate your secure check-in QR pass.',
    character: 'isha',
    color: 'text-cobalt',
    borderColor: 'border-cobalt/30',
    bgColor: 'bg-cobalt-tint/40',
  },
  {
    id: 'team_leader',
    label: 'Team Leader',
    description: 'Form a squad, distribute your unique HACK code, manage roster members, and submit your project.',
    character: 'theo',
    color: 'text-sage-ink',
    borderColor: 'border-sage/40',
    bgColor: 'bg-sage-tint/40',
  },
  {
    id: 'venue_admin',
    label: 'Venue Administrator',
    description: 'Manage venue profile, review booking requests, issue quotations, and approve agreements.',
    character: 'noor',
    color: 'text-[#8a5a10]',
    borderColor: 'border-amber/30',
    bgColor: 'bg-amber-tint/40',
  },
  {
    id: 'volunteer_scanner',
    label: 'Volunteer Scanner',
    description: 'Rapidly check in arriving participants via camera QR scanner with full offline support and syncing.',
    character: 'mira',
    color: 'text-cobalt',
    borderColor: 'border-cobalt/30',
    bgColor: 'bg-cobalt-tint/40',
  },
]

export function SelectRolePage() {
  const { user, roles, setActiveRole, signOut, refreshProfile } = useAuth()
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const hasAdmin = roles.some((r) => (r.role === 'admin' || r.role === 'super_admin') && r.status === 'active')
  const hasJudge = roles.some((r) => r.role === 'judge' && r.status === 'active')

  const availableOptions = [...ROLE_OPTIONS]
  if (hasJudge) {
    availableOptions.push({
      id: 'judge',
      label: 'Hackathon Judge',
      description: 'Evaluate assigned team project submissions using the standardized 3-tier weighted scoring rubric.',
      character: 'kenji',
      color: 'text-purple-700',
      borderColor: 'border-purple-300',
      bgColor: 'bg-purple-50',
    })
  }

  if (hasAdmin) {
    availableOptions.push({
      id: 'super_admin',
      label: 'Super Admin / Trust Officer',
      description: 'Institutional domain registry management, official venue authorization review, and system audits.',
      character: 'ada',
      color: 'text-sage-ink',
      borderColor: 'border-sage/40',
      bgColor: 'bg-sage-tint/40',
    })
  }

  const proceed = async () => {
    if (!selected || !user) return
    setError('')
    setLoading(true)

    try {
      // If already has this active role, avoid re-inserting
      const alreadyHas = roles.some((r) => {
        if (r.status !== 'active') return false
        if (r.role === selected) return true
        if (selected === 'super_admin' && r.role === 'admin') return true
        if (selected === 'venue_admin' && r.role === 'venue_authority') return true
        return false
      })

      if (!alreadyHas) {
        const { error: roleErr } = await supabase.from('user_roles').upsert(
          { user_id: user.id, role: selected, status: 'active' },
          { onConflict: 'user_id,role' },
        )
        if (roleErr) throw roleErr
        await refreshProfile()
      }

      setActiveRole(selected)

      const redirectMap: Record<UserRole, string> = {
        super_admin: '/admin/verifications',
        admin: '/admin/verifications',
        organizer: '/organizer',
        venue_admin: '/venue',
        venue_authority: '/venue',
        team_leader: '/team/my-team',
        participant: '/participant',
        judge: '/judge',
        volunteer_scanner: '/scanner',
      }
      navigate(redirectMap[selected] || '/participant', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ivory px-5 py-12">
      <div className="mx-auto max-w-[56rem]">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <Wordmark />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[0.85rem] font-medium text-ink-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold tracking-[-0.025em] text-ink sm:text-[2.5rem]">
            How will you use HACKOS?
          </h1>
          <p className="mt-2.5 max-w-[36rem] text-[0.95rem] leading-relaxed text-ink-soft">
            Select your role. You can add other roles later from your profile settings.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-coral/25 bg-coral-tint px-4 py-3 text-[0.85rem] text-coral-ink">
            {error}
          </div>
        )}

        <div className={`grid gap-4 ${availableOptions.length > 3 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {availableOptions.map((opt) => {
            const isSelected = selected === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className={`group relative cursor-pointer rounded-2xl border-2 bg-white p-5 text-left shadow-soft transition-all duration-200 ${
                  isSelected
                    ? `${opt.borderColor} ${opt.bgColor}`
                    : 'border-transparent hover:border-line hover:bg-parchment/40'
                }`}
              >
                {/* Character illustration */}
                <div className="mb-4 flex h-[120px] items-end justify-center overflow-hidden">
                  {(() => {
                    const charConfig = (opt.character && CAST[opt.character]) || CAST.mira || Object.values(CAST)[0]
                    return charConfig ? (
                      <Character
                        config={charConfig}
                        title={charConfig.name || opt.label}
                        className="h-[120px] w-auto"
                      />
                    ) : null
                  })()}
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-cobalt">
                    <svg viewBox="0 0 20 20" className="h-3 w-3 text-white" fill="none">
                      <path d="m4.5 10.5 3.4 3.4 7.6-7.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                <p className={`text-[0.7rem] font-bold uppercase tracking-[0.15em] ${opt.color}`}>
                  {opt.label}
                </p>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-end gap-4">
          <p className="text-[0.82rem] text-ink-muted">
            {selected ? `Continuing as ${availableOptions.find(r => r.id === selected)?.label}` : 'Select a role to continue'}
          </p>
          <button
            type="button"
            disabled={!selected || loading}
            onClick={proceed}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cobalt px-7 text-[0.94rem] font-semibold text-white shadow-[0_10px_22px_-14px_rgba(31,78,216,0.9)] transition-all duration-200 hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Setting up…
              </>
            ) : (
              <>
                Continue
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path d="M3.5 10h12m-4.5-4.5L15.5 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

