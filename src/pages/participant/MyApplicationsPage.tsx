import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchMyApplications, withdrawApplication } from '../../services/participantService'
import { fetchRounds, fetchAnnouncements } from '../../services/eventService'
import { fetchPublishedResults } from '../../services/judgingService'
import { fetchAgreementByRequest, fetchQuotationByRequest } from '../../services/venueService'
import { generateAuthorizationPdf } from '../../utils/pdfGenerator'
import { QrCode } from '../../components/story/QrCode'
import { PublicVerificationBadge, VenueVerificationBadge } from '../../components/verification/PublicVerificationBadge'
import type {
  Application,
  EventRound,
  EventAnnouncement,
  EventResult,
  VenueAgreement,
  VenueQuotation
} from '../../types/database'

function DiscoverIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="m8 8 4 2-2 4-4-2 2-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
}
function FileIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M11 2.5V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}

const NAV_ITEMS = [
  { label: 'Overview', href: '/participant', icon: <FileIcon /> },
  { label: 'Discover', href: '/participant/discover', icon: <DiscoverIcon /> },
  { label: 'My Applications', href: '/participant/applications', icon: <FileIcon /> },
]

export function MyApplicationsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [rounds, setRounds] = useState<EventRound[]>([])
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([])
  const [results, setResults] = useState<EventResult[]>([])
  const [agreement, setAgreement] = useState<VenueAgreement | null>(null)
  const [quotation, setQuotation] = useState<VenueQuotation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadApplications()
  }, [user])

  const loadApplications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const apps = await fetchMyApplications(user.id)
      setApplications(apps)
      if (apps.length > 0) {
        setSelectedApp(apps[0])
        await loadSubData(apps[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadSubData = async (app: Application) => {
    try {
      const [r, ann, res] = await Promise.all([
        fetchRounds(app.event_id),
        fetchAnnouncements(app.event_id),
        fetchPublishedResults(app.event_id)
      ])
      setRounds(r)
      setAnnouncements(ann)
      setResults(res)

      // Check if event has a venue request & agreement
      const vr = (app.event as any)?.venue_request
      if (vr?.id) {
        const [agr, q] = await Promise.all([
          fetchAgreementByRequest(vr.id),
          fetchQuotationByRequest(vr.id)
        ])
        setAgreement(agr)
        setQuotation(q)
      } else {
        setAgreement(null)
        setQuotation(null)
      }
    } catch (err) {
      console.error('Error loading sub-data:', err)
    }
  }

  const handleWithdraw = async (app: Application) => {
    if (!user?.id) return
    setWithdrawingId(app.id)
    try {
      await withdrawApplication(app.id)
      const apps = await fetchMyApplications(user.id)
      setApplications(apps)
      if (selectedApp?.id === app.id) {
        setSelectedApp(apps[0] ?? null)
        if (apps[0]) await loadSubData(apps[0])
      }
    } finally {
      setWithdrawingId(null)
    }
  }

  const handleSelectApp = async (app: Application) => {
    setSelectedApp(app)
    await loadSubData(app)
  }

  const vr = (selectedApp?.event as any)?.venue_request
  const venue = vr?.venue

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
      <div className="max-w-[64rem]">
        <div className="mb-8">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-coral" />
            Participant Applications
          </p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink">My Applications Workspace</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Track admission status, venue authorization, official announcements, QR pass, and live results.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-soft">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center shadow-soft">
            <h3 className="font-display text-[1.1rem] font-semibold text-ink">No applications found</h3>
            <p className="mt-1 text-[0.85rem] text-ink-muted">Discover hackathons and submit a team registration.</p>
            <Link
              to="/participant/discover"
              className="mt-4 inline-flex h-10 items-center rounded-full bg-cobalt px-5 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
            >
              Browse Published Hackathons
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            {/* Left selector */}
            <div className="space-y-3">
              <p className="text-[0.78rem] font-bold uppercase tracking-wider text-ink-muted">Applied Hackathons</p>
              {applications.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleSelectApp(app)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selectedApp?.id === app.id
                      ? 'border-cobalt bg-white shadow-soft'
                      : 'border-line bg-parchment/40 hover:bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-sage-tint px-2 py-0.5 text-[0.7rem] font-bold text-sage">
                      {app.application_status.toUpperCase()}
                    </span>
                    <PublicVerificationBadge
                      eventId={app.event?.id || ''}
                      verificationStatus={app.event?.verification_status}
                      compact
                      showUnverified
                    />
                  </div>
                  <h3 className="mt-2 font-display text-[1rem] font-semibold text-ink">{app.event?.name}</h3>
                  <p className="text-[0.78rem] text-ink-muted">Team: {app.team?.team_name}</p>
                  <div className="mt-2">
                    <VenueVerificationBadge
                      format={app.event?.format}
                      venue={app.event?.venue_request?.venue || app.event?.venue}
                      compact
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Right workspace details */}
            {selectedApp && (
              <div className="space-y-6">
                {/* Official Anti-Fraud Verification & Trust Card */}
                <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
                      Anti-Fraud & Venue Verification Review
                    </span>
                    <span className="text-[0.75rem] font-medium text-ink-muted">Official HACKOS Trust Audit</span>
                  </div>

                  <div className="space-y-4">
                    <PublicVerificationBadge
                      eventId={selectedApp.event_id}
                      verificationStatus={selectedApp.event?.verification_status}
                      venueName={venue?.venue_name}
                      venueLocation={venue?.city ? `${venue?.city}, ${venue?.state || ''}` : undefined}
                      verifiedAt={selectedApp.event?.verified_at}
                      showUnverified
                    />

                    <div className="border-t border-line/60 pt-3">
                      <p className="text-[0.75rem] font-bold uppercase text-ink-muted mb-1.5">Assigned Venue Status</p>
                      <VenueVerificationBadge
                        format={selectedApp.event?.format}
                        venue={venue}
                      />
                    </div>
                  </div>
                </div>

                {/* Status card */}
                <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-parchment px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink-muted">
                          {selectedApp.event?.format?.toUpperCase()}
                        </span>
                        <PublicVerificationBadge
                          eventId={selectedApp.event_id}
                          verificationStatus={selectedApp.event?.verification_status}
                          compact
                          showUnverified
                        />
                      </div>
                      <h2 className="mt-2 font-display text-[1.4rem] font-semibold text-ink">
                        {selectedApp.event?.name}
                      </h2>
                      <p className="text-[0.85rem] text-ink-muted">
                        Team: <strong>{selectedApp.team?.team_name}</strong> · Submitted: {new Date(selectedApp.submitted_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-sage/30 bg-sage-tint px-3 py-1 text-[0.8rem] font-bold text-sage">
                        {selectedApp.application_status.toUpperCase()}
                      </span>
                      <span className="rounded-full border border-line bg-parchment px-3 py-1 text-[0.8rem] font-semibold text-ink-soft">
                        Payment: {selectedApp.payment_status.toUpperCase()}
                      </span>
                      {selectedApp.application_status === 'accepted' && (
                        <button
                          type="button"
                          disabled={withdrawingId === selectedApp.id}
                          onClick={() => handleWithdraw(selectedApp)}
                          className="rounded-full border border-coral/40 px-4 py-2 text-[0.8rem] font-semibold text-coral hover:bg-coral-tint disabled:opacity-50"
                        >
                          {withdrawingId === selectedApp.id ? 'Withdrawing…' : 'Withdraw Application'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QR Pass */}
                  <div className="mt-6 flex flex-col items-center gap-5 border-t border-line/70 pt-5 sm:flex-row">
                    <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                      <QrCode value={`HACKOS-PASS-${selectedApp.id.slice(0, 8)}`} size={110} />
                    </div>
                    <div className="text-center sm:text-left">
                      <span className="rounded-full bg-sage-tint px-2.5 py-0.5 text-[0.72rem] font-bold text-sage">
                        ✔ Check-in QR Pass
                      </span>
                      <p className="mt-2 font-semibold text-ink">Electronic Admission Pass</p>
                      <p className="text-[0.82rem] text-ink-muted">
                        Present this pass at door check-in on load-in day. Works offline on mobile.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Approved Venue Details & Authorization Agreement */}
                {venue && (
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="rounded-full bg-sage-tint px-2.5 py-0.5 text-[0.72rem] font-bold text-sage">
                          ✔ Verified Venue Authorized
                        </span>
                        <h3 className="mt-2 font-display text-[1.15rem] font-semibold text-ink">
                          {venue.venue_name}
                        </h3>
                        <p className="text-[0.85rem] text-ink-muted">
                          {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.state} · Capacity {venue.capacity}
                        </p>
                      </div>

                      {agreement?.agreement_status === 'accepted' && quotation && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedApp.event) {
                              generateAuthorizationPdf({
                                agreement,
                                quotation,
                                venue,
                                event: selectedApp.event
                              })
                            }
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-cobalt px-4 text-[0.82rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                        >
                          Download Agreement PDF
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Official Announcements */}
                {announcements.length > 0 && (
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <h3 className="font-display text-[1.1rem] font-semibold text-ink">Organizer Announcements</h3>
                    <div className="mt-4 space-y-3">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="rounded-xl border border-line bg-parchment/40 p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-ink">{ann.title}</h4>
                            <span className="text-[0.75rem] text-ink-muted">
                              {new Date(ann.published_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 text-[0.85rem] text-ink-soft">{ann.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team roster */}
                <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                  <h3 className="font-display text-[1.1rem] font-semibold text-ink">Team Roster</h3>
                  <div className="mt-4 divide-y divide-line/60">
                    <div className="flex items-center justify-between py-2 text-[0.86rem]">
                      <div>
                        <span className="font-semibold text-ink">Team Leader (You)</span>
                      </div>
                      <span className="rounded-full bg-cobalt-tint px-2 py-0.5 text-[0.72rem] font-bold text-cobalt-deep">
                        Confirmed
                      </span>
                    </div>
                    {selectedApp.team?.members?.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2.5 text-[0.86rem]">
                        <div>
                          <p className="font-semibold text-ink">{m.name}</p>
                          <p className="text-[0.76rem] text-ink-muted">{m.email}</p>
                        </div>
                        <span className="rounded-full bg-parchment px-2 py-0.5 text-[0.72rem] font-medium text-ink-muted">
                          {m.invitation_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Schedule Rounds */}
                {rounds.length > 0 && (
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <h3 className="font-display text-[1.1rem] font-semibold text-ink">Event Timeline & Rounds</h3>
                    <div className="mt-4 space-y-2.5">
                      {rounds.map((r, i) => (
                        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line/70 p-3 text-[0.85rem]">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-parchment text-[0.75rem] font-bold text-ink">
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

                {/* Published Results if available */}
                {results.length > 0 && (
                  <div className="rounded-2xl border border-sage/30 bg-sage-tint/30 p-6 shadow-soft">
                    <h3 className="font-display text-[1.15rem] font-semibold text-sage-ink">Published Results & Leaderboard</h3>
                    <p className="text-[0.82rem] text-ink-muted">Official results announced by the organizing committee.</p>
                    <div className="mt-4 space-y-2">
                      {results.map((res) => {
                        const isMyTeam = res.team_id === selectedApp.team_id
                        return (
                          <div
                            key={res.id}
                            className={`flex items-center justify-between rounded-xl p-3.5 shadow-sm ${
                              isMyTeam ? 'border-2 border-cobalt bg-white' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ink">Rank #{res.rank}</span>
                              <span className="font-semibold text-ink">{res.team?.team_name}</span>
                              {isMyTeam && (
                                <span className="rounded-full bg-cobalt-tint px-2 py-0.5 text-[0.7rem] font-bold text-cobalt-deep">
                                  Your Team
                                </span>
                              )}
                            </div>
                            <span className="font-display text-[1.1rem] font-bold text-cobalt">{res.total_score} pts</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
