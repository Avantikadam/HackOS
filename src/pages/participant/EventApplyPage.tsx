import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchEventDetails, fetchRounds } from '../../services/eventService'
import { applyForEvent } from '../../services/participantService'
import { PublicVerificationBadge, VenueVerificationBadge } from '../../components/verification/PublicVerificationBadge'
import { PARTICIPANT_NAV_ITEMS } from '../../constants/navigation'
import type { Event, EventRound } from '../../types/database'

export function EventApplyPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [event, setEvent] = useState<Event | null>(null)
  const [rounds, setRounds] = useState<EventRound[]>([])
  const [loading, setLoading] = useState(true)

  // Team Application Form
  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState<Array<{ name: string; email: string }>>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    loadData()
  }, [eventId])

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [ev, r] = await Promise.all([
        fetchEventDetails(eventId),
        fetchRounds(eventId)
      ])
      setEvent(ev)
      setRounds(r)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim() || !newMemberEmail.trim()) return

    if (!event) return
    if (1 + members.length >= event.maximum_team_size) {
      setError(`Cannot add more members: Maximum team size is ${event.maximum_team_size}.`)
      return
    }

    setMembers([...members, { name: newMemberName.trim(), email: newMemberEmail.trim().toLowerCase() }])
    setNewMemberName('')
    setNewMemberEmail('')
    setError(null)
  }

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx))
  }

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId || !user) return
    setError(null)

    if (!teamName.trim()) {
      setError('Please provide a team name.')
      return
    }

    setSubmitting(true)
    try {
      const res = await applyForEvent({
        eventId,
        teamName: teamName.trim(),
        teamLeaderId: user.id,
        members
      })

      if (res.success) {
        navigate('/participant/applications')
      } else {
        setError(res.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout navItems={PARTICIPANT_NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
        </div>
      </DashboardLayout>
    )
  }

  if (!event) {
    return (
      <DashboardLayout navItems={PARTICIPANT_NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <p className="text-ink-muted">Event not found.</p>
          <Link to="/participant/discover" className="mt-4 inline-block font-semibold text-cobalt">
            Back to Discover
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={PARTICIPANT_NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
      <div className="mx-auto max-w-[50rem]">
        {/* Breadcrumb */}
        <div className="mb-2 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/participant/discover" className="hover:text-ink">Discover</Link>
          <span>/</span>
          <span className="font-medium text-ink">{event.name}</span>
        </div>

        {/* Event Header Card */}
        <div className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cobalt-tint px-2.5 py-0.5 text-[0.72rem] font-bold text-cobalt-deep">
              {event.format.toUpperCase()}
            </span>
            <span className="rounded-full bg-parchment px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink-muted">
              {event.registration_fee > 0 ? `₹${event.registration_fee} fee` : 'Free entry'}
            </span>
            <PublicVerificationBadge
              eventId={event.id}
              verificationStatus={event.verification_status}
              compact
              showUnverified
            />
          </div>

          <h1 className="mt-2 font-display text-[1.85rem] font-semibold text-ink">{event.name}</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">{event.description}</p>

          {/* Official Verification & Venue Verification Section */}
          <div className="mt-4 space-y-3">
            <PublicVerificationBadge
              eventId={event.id}
              verificationStatus={event.verification_status}
              venueName={event.venue_request?.venue?.venue_name || event.venue?.venue_name}
              venueLocation={event.venue_request?.venue?.city || event.venue?.city}
              verifiedAt={event.verified_at}
              showUnverified
            />

            <div>
              <VenueVerificationBadge
                format={event.format}
                venue={event.venue_request?.venue || event.venue}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line/70 pt-4 text-[0.82rem] text-ink-soft sm:grid-cols-4">
            <div>
              <p className="text-ink-muted">Team Limits</p>
              <p className="font-semibold text-ink">{event.minimum_team_size}–{event.maximum_team_size} members</p>
            </div>
            <div>
              <p className="text-ink-muted">Duration</p>
              <p className="font-semibold text-ink">{event.duration_hours || 24} hours</p>
            </div>
            <div>
              <p className="text-ink-muted">Event Dates</p>
              <p className="font-semibold text-ink">{event.start_at ? new Date(event.start_at).toLocaleDateString() : 'TBA'}</p>
            </div>
            <div>
              <p className="text-ink-muted">Category</p>
              <p className="font-semibold text-ink">{event.category || 'Open'}</p>
            </div>
          </div>
        </div>

        {/* Rounds Timeline */}
        {rounds.length > 0 && (
          <div className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-soft">
            <h2 className="font-display text-[1.1rem] font-semibold text-ink">Schedule & Rounds</h2>
            <div className="mt-3 space-y-2">
              {rounds.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-parchment/50 p-3 text-[0.85rem]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[0.75rem] font-bold text-ink shadow-sm">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-ink">{r.name}</span>
                    {r.description && <span className="ml-2 text-ink-muted">· {r.description}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Application Form */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <h2 className="font-display text-[1.2rem] font-semibold text-ink">Team Application (Team Lead)</h2>
          <p className="mt-1 text-[0.84rem] text-ink-muted">
            You are applying as the Team Leader. You can invite your co-builders to complete the team roster.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-coral/25 bg-coral-tint p-4 text-[0.88rem] text-coral-ink">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="mt-6 space-y-6">
            <div>
              <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Team Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Null Pointer or CodeCrafters"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-xl border border-line px-4 py-2.5 text-[0.92rem] focus:border-cobalt focus:outline-none"
              />
            </div>

            {/* Team Leader box */}
            <div className="rounded-xl bg-parchment/60 p-4">
              <p className="text-[0.76rem] font-bold uppercase text-ink-muted">Team Leader</p>
              <p className="mt-1 font-semibold text-ink">{profile?.full_name || 'You'} ({user?.email})</p>
            </div>

            {/* Team Members List */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[0.82rem] font-semibold text-ink">
                  Team Members ({members.length + 1} of max {event.maximum_team_size})
                </label>
                <span className="text-[0.76rem] text-ink-muted">
                  Requires {event.minimum_team_size} to {event.maximum_team_size} total members
                </span>
              </div>

              {members.length > 0 && (
                <div className="mb-4 space-y-2">
                  {members.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-line p-3 text-[0.85rem]">
                      <div>
                        <span className="font-semibold text-ink">{m.name}</span>
                        <span className="ml-2 text-ink-muted">({m.email})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-coral hover:text-coral-ink text-[0.8rem]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Member inputs */}
              {1 + members.length < event.maximum_team_size && (
                <div className="rounded-xl border border-dashed border-line p-4">
                  <p className="text-[0.8rem] font-semibold text-ink">Add a teammate</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Teammate Name"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="flex-1 rounded-xl border border-line px-3 py-2 text-[0.86rem]"
                    />
                    <input
                      type="email"
                      placeholder="teammate@example.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="flex-1 rounded-xl border border-line px-3 py-2 text-[0.86rem]"
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="rounded-full bg-parchment px-4 py-2 text-[0.82rem] font-semibold text-ink hover:bg-linen"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-line/70 pt-4">
              <Link
                to="/participant/discover"
                className="rounded-full border border-line bg-white px-5 py-2.5 text-[0.86rem] font-semibold text-ink-soft hover:bg-parchment"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-cobalt px-6 py-2.5 text-[0.9rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
              >
                {submitting ? 'Submitting Application…' : 'Submit Team Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

