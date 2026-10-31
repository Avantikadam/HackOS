import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchOrganizerEvents } from '../../services/eventService'
import { fetchOrganizerStats } from '../../services/statsService'
import type { Event } from '../../types/database'
import type { OrganizerStats } from '../../services/statsService'

function QrIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12h2v2h-2zM15 15h2v2h-2z" fill="currentColor"/></svg>
}

const NAV_ITEMS = [
  { label: 'Overview', href: '/organizer', icon: <HomeIcon /> },
  { label: 'Create Event', href: '/organizer/events/new', icon: <PlusIcon /> },
  { label: 'Venue Requests', href: '/organizer/venues', icon: <BuildingIcon /> },
  { label: 'Gate Scanner', href: '/scanner', icon: <QrIcon /> },
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

export function OrganizerDashboard() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<OrganizerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [data, organizerStats] = await Promise.all([fetchOrganizerEvents(user.id), fetchOrganizerStats(user.id)])
      setEvents(data)
      setStats(organizerStats)
    } catch (err) {
      console.error('Failed to load organizer events:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!stats) {
    return (
      <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
        </div>
      </DashboardLayout>
    )
  }

  const pendingVenueCount = stats.pendingVenueRequests
  const totalApplications = stats.totalApplications
  const totalTeams = stats.totalTeams

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
      <div className="max-w-[58rem]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-[1.65rem] font-semibold text-ink">
              Organizer Workspace
            </h1>
            <p className="mt-0.5 text-[0.85rem] text-ink-muted">
              Signed in as {profile?.full_name || 'Organizer'}. Manage event configurations, venue requests, and teams.
            </p>
          </div>
          <Link
            to="/organizer/events/new"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-cobalt px-4 text-[0.82rem] font-semibold text-white transition-colors hover:bg-cobalt-deep"
          >
            <PlusIcon />
            New Event
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Total Events</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-ink">{stats.totalEvents}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Published</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-sage">{stats.publishedCount}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Drafts</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-ink">{stats.draftCount}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Upcoming</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-cobalt">{stats.upcomingEvents}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Pending Venue Requests</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-amber">{pendingVenueCount}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Applications</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-ink">{totalApplications}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Teams</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-ink">{totalTeams}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">Accepted Applications</p>
            <p className="tabular mt-1 font-display text-[1.6rem] font-semibold text-sage">{stats.acceptedApplications}</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-line/60 px-5 py-3.5">
            <h2 className="text-[0.92rem] font-semibold text-ink">Events</h2>
            <span className="text-[0.75rem] text-ink-muted">{events.length} records</span>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-cobalt" />
              <p className="mt-2 text-[0.8rem] text-ink-muted">Loading events…</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[0.88rem] font-semibold text-ink">No events created yet</p>
              <p className="mt-1 text-[0.8rem] text-ink-muted">
                Create a hackathon to start configuring rounds, venue requests, and judging.
              </p>
              <Link
                to="/organizer/events/new"
                className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-cobalt px-3.5 text-[0.78rem] font-semibold text-white hover:bg-cobalt-deep"
              >
                <PlusIcon />
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {events.map((event) => {
                const statusBadge = {
                  published: 'bg-sage-tint text-sage border-sage/20',
                  draft: 'bg-parchment text-ink-muted border-line',
                  pending_venue: 'bg-amber-tint text-[#8a5a10] border-amber/25',
                  ready: 'bg-cobalt-tint text-cobalt border-cobalt/20',
                  closed: 'bg-parchment text-ink-muted border-line',
                  cancelled: 'bg-coral-tint text-coral border-coral/20',
                }[event.publication_status] || 'bg-parchment text-ink-muted border-line'

                return (
                  <div
                    key={event.id}
                    className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-parchment/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${statusBadge}`}>
                          {event.publication_status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[0.72rem] font-semibold uppercase text-ink-muted">
                          {event.format}
                        </span>
                        {event.category && (
                          <span className="text-[0.72rem] text-ink-muted">· {event.category}</span>
                        )}
                      </div>
                      <h3 className="mt-1 font-display text-[1.05rem] font-semibold text-ink">
                        {event.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 text-[0.76rem] text-ink-muted">
                        <span>Duration: {event.duration_hours || 24}h</span>
                        <span>Team size: {event.minimum_team_size}–{event.maximum_team_size}</span>
                        <span>Fee: {event.registration_fee > 0 ? `₹${event.registration_fee}` : 'Free'}</span>
                      </div>
                    </div>

                    <Link
                      to={`/organizer/events/${event.id}`}
                      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line bg-white px-3 text-[0.78rem] font-medium text-ink transition-colors hover:bg-parchment"
                    >
                      Manage →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
