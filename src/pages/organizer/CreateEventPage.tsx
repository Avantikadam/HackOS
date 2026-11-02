import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { createEvent } from '../../services/eventService'
import type { EventFormat } from '../../types/database'

const NAV_ITEMS = [
  { label: 'Overview', href: '/organizer', icon: <HomeIcon /> },
  { label: 'Create Event', href: '/organizer/events/new', icon: <PlusIcon /> },
  { label: 'Venue Requests', href: '/organizer/venues', icon: <BuildingIcon /> },
]

function HomeIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2.5 8 10 2l7.5 6V17a1 1 0 0 1-1 1H13v-5H7v5H3.5a1 1 0 0 1-1-1V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function PlusIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}
function BuildingIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 17V9h6v8M7 6h2M11 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

export function CreateEventPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [detailedDescription, setDetailedDescription] = useState('')
  const [category, setCategory] = useState('Open Innovation')
  const [format, setFormat] = useState<EventFormat>('offline')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [durationHours, setDurationHours] = useState(36)
  const [registrationFee, setRegistrationFee] = useState(0)
  const [minTeamSize, setMinTeamSize] = useState(2)
  const [maxTeamSize, setMaxTeamSize] = useState(4)
  const [maxTeams, setMaxTeams] = useState(100)
  const [maxParticipants, setMaxParticipants] = useState(400)
  const [eligibility, setEligibility] = useState('Open to all university students and developers.')
  const [rules, setRules] = useState('Code must be authored during the hackathon period. Pre-existing libraries and APIs are permitted.')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('You must be signed in to create an event.')
      return
    }

    if (!name.trim()) {
      setError('Please provide an event name.')
      return
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after the start date.')
      return
    }

    if (maxTeamSize < minTeamSize) {
      setError('Maximum team size cannot be smaller than minimum team size.')
      return
    }

    setLoading(true)
    try {
      const newEvent = await createEvent({
        organizer_id: user.id,
        name: name.trim(),
        description: description.trim(),
        detailed_description: detailedDescription.trim(),
        category,
        format,
        start_at: startDate ? new Date(startDate).toISOString() : undefined,
        end_at: endDate ? new Date(endDate).toISOString() : undefined,
        duration_hours: Number(durationHours) || 24,
        registration_fee: Number(registrationFee) || 0,
        minimum_team_size: Number(minTeamSize),
        maximum_team_size: Number(maxTeamSize),
        maximum_teams: Number(maxTeams) || 100,
        maximum_participants: Number(maxParticipants) || 400,
        eligibility: eligibility.trim(),
        rules: rules.trim()
      })

      navigate(`/organizer/events/${newEvent.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
      <div className="mx-auto max-w-[48rem]">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/organizer" className="hover:text-ink">Organizer</Link>
          <span>/</span>
          <span className="font-medium text-ink">New Event</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-ink">
            Create a New Hackathon
          </h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Configure your event details. Events are saved as drafts until published.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-coral/25 bg-coral-tint p-4 text-[0.88rem] text-coral-ink">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Basic Information */}
          <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
            <h2 className="font-display text-[1.15rem] font-semibold text-ink">1. Basic Information</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HackNorthside 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink focus:border-cobalt focus:outline-none"
                  >
                    <option value="Open Innovation">Open Innovation</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Climate & Sustainability">Climate & Sustainability</option>
                    <option value="Healthcare & Bio">Healthcare & Bio</option>
                    <option value="Fintech & Web3">Fintech & Web3</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Format *</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as EventFormat)}
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink focus:border-cobalt focus:outline-none"
                  >
                    <option value="offline">Offline (In-person venue required)</option>
                    <option value="hybrid">Hybrid (Venue + virtual participants)</option>
                    <option value="online">Online only (No venue required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Short Summary</label>
                <input
                  type="text"
                  placeholder="A one-sentence summary for listings and cards"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Overview of the hackathon theme, goals, and opportunities"
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.92rem] text-ink focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
                />
              </div>
            </div>
          </div>

          {/* Card: Timing & Duration */}
          <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
            <h2 className="font-display text-[1.15rem] font-semibold text-ink">2. Schedule & Duration</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Duration (Hours)</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                >
                  <option value={24}>24 Hours</option>
                  <option value={36}>36 Hours</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card: Registration & Team Limits */}
          <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
            <h2 className="font-display text-[1.15rem] font-semibold text-ink">3. Participation & Pricing</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Registration Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
                <span className="text-[0.7rem] text-ink-muted">Set to 0 for free entry</span>
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Min Team Size</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={minTeamSize}
                  onChange={(e) => setMinTeamSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Max Team Size</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Max Teams</label>
                <input
                  type="number"
                  min="1"
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Max Participants</label>
                <input
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Eligibility Requirements</label>
                <input
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Event Rules</label>
                <input
                  type="text"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink focus:border-cobalt focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/organizer"
              className="rounded-full border border-line bg-white px-5 py-2.5 text-[0.88rem] font-semibold text-ink-soft hover:bg-parchment"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-cobalt px-6 text-[0.92rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving Draft…
                </>
              ) : (
                'Save as Draft & Configure'
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
