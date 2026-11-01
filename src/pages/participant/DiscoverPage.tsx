import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchPublishedEvents } from '../../services/eventService'
import { PublicVerificationBadge, VenueVerificationBadge } from '../../components/verification/PublicVerificationBadge'
import { PARTICIPANT_NAV_ITEMS } from '../../constants/navigation'
import type { Event } from '../../types/database'

export function DiscoverPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [format, setFormat] = useState('all')
  const [category, setCategory] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all')

  useEffect(() => {
    loadEvents()
  }, [format, category, verificationFilter])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await fetchPublishedEvents({
        search: search.trim() || undefined,
        format: format !== 'all' ? format : undefined,
        category: category !== 'all' ? category : undefined,
        verificationStatus: verificationFilter !== 'all' ? verificationFilter : undefined
      })
      setEvents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadEvents()
  }

  return (
    <DashboardLayout navItems={PARTICIPANT_NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
      <div className="max-w-[64rem]">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-coral" />
            Hackathon Discovery Feed
          </p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink">Discover Published Hackathons</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Find vetted, venue-authorized hackathons across categories and formats.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-2xl border border-line bg-white p-5 shadow-soft">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search hackathons by keyword, theme or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-line px-4 py-2 text-[0.9rem]"
            />
            <button
              type="submit"
              className="rounded-full bg-cobalt px-5 py-2 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/60 pt-3 text-[0.82rem]">
            <span className="font-semibold text-ink-muted">Format:</span>
            {['all', 'offline', 'online', 'hybrid'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  format === fmt ? 'bg-cobalt text-white' : 'bg-parchment text-ink-soft hover:bg-linen'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}

            <span className="ml-2 font-semibold text-ink-muted">Trust / Verification:</span>
            {[
              { id: 'all', label: 'All Hackathons' },
              { id: 'verified', label: '✓ Officially Verified' },
              { id: 'unverified', label: 'Pending Review' }
            ].map((vf) => (
              <button
                key={vf.id}
                type="button"
                onClick={() => setVerificationFilter(vf.id as any)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  verificationFilter === vf.id ? 'bg-sage text-white' : 'bg-parchment text-ink-soft hover:bg-linen'
                }`}
              >
                {vf.label}
              </button>
            ))}

            <span className="ml-auto font-semibold text-ink-muted">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-line bg-white px-2 py-1 text-[0.8rem]"
            >
              <option value="all">All Categories</option>
              <option value="Open Innovation">Open Innovation</option>
              <option value="Artificial Intelligence">Artificial Intelligence</option>
              <option value="Climate & Sustainability">Climate & Sustainability</option>
              <option value="Healthcare & Bio">Healthcare & Bio</option>
            </select>
          </div>
        </div>

        {/* Event Cards Grid */}
        {loading ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-soft">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-soft">
            <p className="text-ink-muted">No published hackathons found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col justify-between rounded-2xl border border-line/90 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cobalt-tint px-2.5 py-0.5 text-[0.72rem] font-bold text-cobalt-deep">
                        {ev.format.toUpperCase()}
                      </span>
                      <PublicVerificationBadge
                        eventId={ev.id}
                        verificationStatus={ev.verification_status}
                        compact
                        showUnverified
                      />
                    </div>
                    <span className="text-[0.8rem] font-semibold text-ink shrink-0">
                      {ev.registration_fee > 0 ? `₹${ev.registration_fee} fee` : 'Free Registration'}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-[1.25rem] font-semibold text-ink leading-snug">{ev.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[0.85rem] text-ink-muted">
                    {ev.description || 'Join builders and innovators in this hackathon.'}
                  </p>

                  <div className="mt-3">
                    <VenueVerificationBadge
                      format={ev.format}
                      venue={ev.venue_request?.venue || ev.venue}
                    />
                  </div>

                  <div className="mt-4 space-y-1 text-[0.78rem] text-ink-soft">
                    {ev.category && <p>Theme: <strong className="text-ink">{ev.category}</strong></p>}
                    <p>Team Size: <strong>{ev.minimum_team_size}–{ev.maximum_team_size} members</strong></p>
                    {ev.start_at && (
                      <p>Dates: <strong>{new Date(ev.start_at).toLocaleDateString()} to {new Date(ev.end_at || '').toLocaleDateString()}</strong></p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-line/70 pt-4">
                  <Link
                    to={`/participant/events/${ev.id}/apply`}
                    className="flex h-10 w-full items-center justify-center rounded-full bg-cobalt text-[0.86rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                  >
                    View Details & Apply as Team Lead
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

