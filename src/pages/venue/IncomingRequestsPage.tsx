import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchVenueByOwner, fetchIncomingRequests, updateRequestStatus } from '../../services/venueService'
import type { Venue, VenueRequest } from '../../types/database'

const NAV_ITEMS = [
  { label: 'Overview', href: '/venue', icon: <HomeIcon /> },
  { label: 'Venue Profile', href: '/venue/profile', icon: <BuildingIcon /> },
  { label: 'Verification', href: '/venue/verification', icon: <ShieldIcon /> },
  { label: 'Incoming Requests', href: '/venue/requests', icon: <InboxIcon /> },
]

function HomeIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2.5 8 10 2l7.5 6V17a1 1 0 0 1-1 1H13v-5H7v5H3.5a1 1 0 0 1-1-1V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function BuildingIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 17V9h6v8M7 6h2M11 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function ShieldIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 2.5 3.5 5v5c0 3.6 2.8 7 6.5 8 3.7-1 6.5-4.4 6.5-8V5L10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function InboxIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="2.5" y="4" width="15" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 12h4l2 2.5h3l2-2.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export function IncomingRequestsPage() {
  const { user } = useAuth()
  const [venue, setVenue] = useState<Venue | null>(null)
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
      const v = await fetchVenueByOwner(user.id)
      setVenue(v)
      if (v) {
        const reqs = await fetchIncomingRequests(v.id)
        setRequests(reqs)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    await updateRequestStatus(id, 'rejected')
    if (venue) {
      const reqs = await fetchIncomingRequests(venue.id)
      setRequests(reqs)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Venue Authority" roleColor="amber">
      <div className="max-w-[64rem]">
        <div className="mb-2 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/venue" className="hover:text-ink">Venue Authority</Link>
          <span>/</span>
          <span className="font-medium text-ink">Incoming Requests</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold text-ink">Incoming Booking Requests</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Review organizer hackathon date requests, attendance requirements, and prepare itemized quotations.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center shadow-soft">
            <h3 className="font-display text-[1.1rem] font-semibold text-ink">No requests received</h3>
            <p className="mt-1 text-[0.85rem] text-ink-muted">When organizers request dates for this venue, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-parchment px-2.5 py-0.5 text-[0.72rem] font-bold text-ink-muted">
                      {req.request_status.toUpperCase()}
                    </span>
                    <span className="font-display text-[1.15rem] font-semibold text-ink">{req.event?.name}</span>
                  </div>
                  <p className="mt-1.5 text-[0.85rem] text-ink-soft">
                    Organizer: <strong>{req.organizer?.full_name || 'Event Organizer'}</strong> ({req.organizer?.email})
                  </p>
                  <p className="mt-1 text-[0.8rem] text-ink-muted">
                    Dates: {new Date(req.requested_start).toLocaleDateString()} to {new Date(req.requested_end).toLocaleDateString()} · Expected Participants: {req.expected_participants}
                  </p>
                  {req.notes && (
                    <p className="mt-2 rounded-lg bg-parchment/60 p-2.5 text-[0.8rem] text-ink-soft">
                      Note: {req.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to={`/venue/requests/${req.id}/quotation`}
                    className="inline-flex h-10 items-center rounded-full bg-cobalt px-5 text-[0.86rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                  >
                    {req.request_status === 'pending' ? 'Prepare Quotation' : 'View Quotation & Agreement'}
                  </Link>

                  {req.request_status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleReject(req.id)}
                      className="rounded-full border border-line px-4 py-2 text-[0.84rem] font-semibold text-coral hover:bg-coral-tint"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

