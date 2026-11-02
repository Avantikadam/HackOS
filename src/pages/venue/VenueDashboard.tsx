import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchVenuesByOwner, fetchIncomingRequests } from '../../services/venueService'
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

export function VenueDashboard() {
  const { user, profile } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [requests, setRequests] = useState<VenueRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadVenueData()
  }, [user])

  const loadVenueData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const ownedVenues = await fetchVenuesByOwner(user.id)
      setVenues(ownedVenues)

      const reqs = ownedVenues.length ? await fetchIncomingRequests() : []
      setRequests(reqs)
    } catch (err) {
      console.error('Failed to load venue dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const pendingRequests = requests.filter(r => r.request_status === 'pending')
  const maxCapacity = venues.reduce((max, v) => Math.max(max, v.capacity || 0), 0)

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Venue Authority" roleColor="amber">
      <div className="max-w-[64rem]">
        <div className="mb-8">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-amber" />
            Venue Operations Workspace
          </p>
          <h1 className="mt-1 font-display text-[1.85rem] font-semibold text-ink">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[0.92rem] text-ink-muted">
            Manage your facility profiles, issue itemized quotations, and authorize agreements via OTP.
          </p>
        </div>

        {/* Verification Status Banners */}
        {venues.length > 0 && (
          <div className="mb-8 space-y-3">
            {venues.map((venue) => (
              <div key={venue.id} className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/90 bg-white p-5 shadow-soft sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.78rem] font-bold uppercase tracking-wider text-ink-muted">Venue Status:</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${
                        venue.verification_status === 'verified'
                          ? 'bg-sage-tint text-sage'
                          : 'bg-amber-tint text-[#8a5a10]'
                      }`}
                    >
                      {venue.verification_status.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-[1.2rem] font-semibold text-ink">{venue.venue_name}</h2>
                  <p className="text-[0.82rem] text-ink-muted">
                    {venue.city}, {venue.state} · Capacity {venue.capacity} seats
                  </p>
                </div>
                <Link
                  to="/venue/verification"
                  className="rounded-full border border-line bg-white px-4 py-2 text-[0.84rem] font-semibold text-ink hover:bg-parchment"
                >
                  Verification Documents →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Quick Metrics */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Pending Requests</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-amber">
              {pendingRequests.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Total Requests</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-ink">
              {requests.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Accepted</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-sage">
              {requests.filter(r => r.request_status === 'accepted').length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Venues / Max Capacity</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-cobalt">
              {venues.length} / {maxCapacity}
            </p>
          </div>
        </div>

        {/* Action cards if no venue profile */}
        {venues.length === 0 && !loading && (
          <div className="mb-8 rounded-2xl border border-dashed border-amber/40 bg-amber-tint/20 p-8 text-center shadow-soft">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-tint text-[#8a5a10]">
              <BuildingIcon />
            </div>
            <h2 className="font-display text-[1.2rem] font-semibold text-ink">Set up your Venue Profile</h2>
            <p className="mx-auto mt-2 max-w-[28rem] text-[0.88rem] text-ink-muted">
              Add your venue details, seating capacity, power/network infrastructure, and submit documents for verification.
            </p>
            <Link
              to="/venue/profile"
              className="mt-5 inline-flex h-10 items-center rounded-full bg-cobalt px-5 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
            >
              Configure Venue Profile
            </Link>
          </div>
        )}

        {/* Incoming Requests Feed */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[1.2rem] font-semibold text-ink">Incoming Booking Requests</h2>
            <Link to="/venue/requests" className="text-[0.84rem] font-semibold text-cobalt hover:underline">
              View all
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
              <p className="text-[0.85rem] text-ink-muted">No booking requests received yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-parchment px-2 py-0.5 text-[0.72rem] font-bold text-ink-muted">
                        {req.request_status.toUpperCase()}
                      </span>
                      <span className="font-semibold text-ink">{req.event?.name}</span>
                    </div>
                    <p className="mt-1 text-[0.78rem] text-ink-muted">
                      Expected: {req.expected_participants} participants · Dates: {new Date(req.requested_start).toLocaleDateString()} to {new Date(req.requested_end).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/venue/requests/${req.id}/quotation`}
                    className="inline-flex h-9 items-center rounded-full bg-cobalt px-4 text-[0.82rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                  >
                    Review & Quote →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
