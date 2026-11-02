import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchOrganizerRequests } from '../../services/venueService'
import type { VenueRequest } from '../../types/database'

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

export function VenueRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<VenueRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadRequests()
  }, [user])

  const loadRequests = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchOrganizerRequests(user.id)
      setRequests(data)
    } catch (err) {
      console.error('Failed to load venue requests:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
      <div className="max-w-[64rem]">
        <div className="mb-6">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-coral" />
            Venue Approvals
          </p>
          <h1 className="mt-1 font-display text-[1.85rem] font-semibold text-ink">Venue Requests</h1>
          <p className="text-[0.92rem] text-ink-muted">Track all venue booking requests, quotations, and authorization agreements.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center shadow-soft">
            <h3 className="font-display text-[1.1rem] font-semibold text-ink">No venue requests submitted yet</h3>
            <p className="mx-auto mt-2 max-w-[28rem] text-[0.88rem] text-ink-muted">
              You can submit venue booking requests directly from your event workspace.
            </p>
            <Link
              to="/organizer"
              className="mt-5 inline-flex h-10 items-center rounded-full bg-cobalt px-5 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
            >
              Go to Your Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-parchment px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink">
                      {req.request_status.toUpperCase()}
                    </span>
                    <span className="text-[0.82rem] font-semibold text-cobalt">{req.event?.name}</span>
                  </div>
                  <h3 className="mt-2 font-display text-[1.15rem] font-semibold text-ink">{req.venue?.venue_name}</h3>
                  <p className="text-[0.78rem] text-ink-muted">
                    {req.venue?.city}, {req.venue?.state} · Expected: {req.expected_participants} participants
                  </p>
                </div>
                <Link
                  to={`/organizer/events/${req.event_id}`}
                  className="rounded-full border border-line bg-white px-4 py-2 text-[0.84rem] font-semibold text-ink hover:bg-parchment"
                >
                  View Details in Event →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

