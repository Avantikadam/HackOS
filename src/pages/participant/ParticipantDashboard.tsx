import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchPublishedEvents } from '../../services/eventService'
import { fetchMyApplications } from '../../services/participantService'
import { fetchParticipantStats } from '../../services/statsService'
import { JoinTeamModal } from '../../components/team/JoinTeamModal'
import { PublicVerificationBadge, VenueVerificationBadge } from '../../components/verification/PublicVerificationBadge'
import { PARTICIPANT_NAV_ITEMS, DiscoverIcon } from '../../constants/navigation'
import type { Event, Application } from '../../types/database'
import type { ParticipantStats } from '../../services/statsService'

function GlobeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 10h15M10 2.5a11 11 0 0 1 3 7.5 11 11 0 0 1-3 7.5 11 11 0 0 1-3-7.5 11 11 0 0 1 3-7.5Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414a1.5 1.5 0 0 0 1.06.44H16A1.5 1.5 0 0 1 17.5 7.79v6.71a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m6.5 10 2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M5 4.5h10v4a5 5 0 0 1-10 0v-4ZM5 6H3a2 2 0 0 0 0 4h2M15 6h2a2 2 0 0 1 0 4h-2M10 13.5v3M7 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ParticipantDashboard() {
  const { user, profile } = useAuth()
  const [publishedEvents, setPublishedEvents] = useState<Event[]>([])
  const [myApplications, setMyApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<ParticipantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [events, apps, participantStats] = await Promise.all([
        fetchPublishedEvents(),
        fetchMyApplications(user.id),
        fetchParticipantStats(user.id)
      ])
      setPublishedEvents(events)
      setMyApplications(apps)
      setStats(participantStats)
    } catch (err) {
      console.error('Failed to load participant dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getApplicationStatusBadge = (status: string) => {
    const normalized = (status || '').toLowerCase()
    if (normalized === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-sage/25 bg-sage-tint px-2.5 py-0.5 text-[0.7rem] font-bold text-sage">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          ACCEPTED
        </span>
      )
    }
    if (normalized === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-coral/25 bg-coral-tint px-2.5 py-0.5 text-[0.7rem] font-bold text-coral">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          REJECTED
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber-tint px-2.5 py-0.5 text-[0.7rem] font-bold text-[#8a5a10]">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        PENDING
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const normalized = (status || '').toLowerCase()
    if (normalized === 'waived' || normalized === 'paid') {
      return (
        <span className="rounded-full border border-sage/20 bg-sage-tint/60 px-2 py-0.5 text-[0.68rem] font-semibold text-sage">
          Payment: {status.toUpperCase()}
        </span>
      )
    }
    return (
      <span className="rounded-full border border-line bg-parchment px-2 py-0.5 text-[0.68rem] font-medium text-ink-muted">
        Payment: {status ? status.toUpperCase() : 'PENDING'}
      </span>
    )
  }

  if (loading && !stats) {
    return (
      <DashboardLayout navItems={PARTICIPANT_NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
        <div className="max-w-[68rem]">
          <div className="mb-8 h-20 w-72 animate-pulse rounded-2xl bg-parchment/60" />
          <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-line/60 bg-white p-5 shadow-soft" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-line/60 bg-white shadow-soft" />
        </div>
      </DashboardLayout>
    )
  }

  const displayName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Participant'

  return (
    <DashboardLayout navItems={PARTICIPANT_NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
      <div className="max-w-[68rem] space-y-9">
        {/* Header Block */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
              Participant Portal
            </p>
            <h1 className="mt-1 font-display text-[1.95rem] font-semibold tracking-[-0.01em] text-ink sm:text-[2.2rem]">
              Welcome, {displayName}
            </h1>
            <p className="mt-1 text-[0.9rem] text-ink-muted">
              Discover verified hackathons, manage your squad applications, and monitor results.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-5 text-[0.84rem] font-semibold text-ink shadow-soft transition-all hover:border-line-dark hover:bg-parchment hover:shadow-card focus:outline-none focus:ring-2 focus:ring-cobalt/20 active:scale-98"
            >
              <span className="text-ink-muted">#</span>
              Join Team with Code
            </button>
            <Link
              to="/participant/discover"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-cobalt px-5 text-[0.84rem] font-semibold text-white shadow-soft transition-all hover:bg-cobalt-deep hover:shadow-card focus:outline-none focus:ring-2 focus:ring-cobalt/30 active:scale-98"
            >
              <DiscoverIcon />
              Discover Hackathons
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-5">
          <div className="group rounded-2xl border border-line/80 bg-white p-5 shadow-soft transition-all hover:border-line hover:shadow-card">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[0.72rem] font-bold uppercase tracking-wider">Published Hackathons</span>
              <span className="text-ink-muted/80 transition-colors group-hover:text-ink"><GlobeIcon /></span>
            </div>
            <p className="tabular-nums mt-2.5 font-display text-[2.1rem] font-bold tracking-tight text-ink">
              {stats?.publishedEvents ?? publishedEvents.length}
            </p>
            <p className="mt-1 text-[0.76rem] text-ink-muted">Active in the ecosystem</p>
          </div>

          <div className="group rounded-2xl border border-line/80 bg-white p-5 shadow-soft transition-all hover:border-cobalt/30 hover:shadow-card">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[0.72rem] font-bold uppercase tracking-wider">My Applications</span>
              <span className="text-cobalt/70 transition-colors group-hover:text-cobalt"><FolderIcon /></span>
            </div>
            <p className="tabular-nums mt-2.5 font-display text-[2.1rem] font-bold tracking-tight text-cobalt">
              {stats?.myApplications ?? myApplications.length}
            </p>
            <p className="mt-1 text-[0.76rem] text-ink-muted">Submitted team entries</p>
          </div>

          <div className="group rounded-2xl border border-line/80 bg-white p-5 shadow-soft transition-all hover:border-sage/40 hover:shadow-card">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[0.72rem] font-bold uppercase tracking-wider">Accepted</span>
              <span className="text-sage/80 transition-colors group-hover:text-sage"><CheckCircleIcon /></span>
            </div>
            <p className="tabular-nums mt-2.5 font-display text-[2.1rem] font-bold tracking-tight text-sage">
              {stats?.acceptedApplications ?? 0}
            </p>
            <p className="mt-1 text-[0.76rem] text-ink-muted">Confirmed team spots</p>
          </div>

          <div className="group rounded-2xl border border-line/80 bg-white p-5 shadow-soft transition-all hover:border-line hover:shadow-card">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[0.72rem] font-bold uppercase tracking-wider">Completed</span>
              <span className="text-ink-muted/80 transition-colors group-hover:text-ink"><TrophyIcon /></span>
            </div>
            <p className="tabular-nums mt-2.5 font-display text-[2.1rem] font-bold tracking-tight text-ink">
              {stats?.completedEvents ?? 0}
            </p>
            <p className="mt-1 text-[0.76rem] text-ink-muted">Past hackathons finished</p>
          </div>
        </div>

        {/* Your Applications Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[1.3rem] font-semibold tracking-[-0.01em] text-ink">
                Your Applications
              </h2>
              <p className="text-[0.82rem] text-ink-muted">
                Status of hackathons you and your team have submitted applications for.
              </p>
            </div>
            {myApplications.length > 0 && (
              <Link
                to="/participant/applications"
                className="group inline-flex items-center gap-1 text-[0.82rem] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
              >
                <span>View all ({myApplications.length})</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            )}
          </div>

          {myApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white/70 p-8 text-center shadow-soft">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-parchment text-ink-muted">
                <FolderIcon />
              </div>
              <p className="font-display text-[1.1rem] font-semibold text-ink">
                You haven't applied to any hackathons yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-[0.84rem] text-ink-muted">
                Explore verified, venue-authorized hackathons, form your team, and submit your first application.
              </p>
              <Link
                to="/participant/discover"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-cobalt px-5 text-[0.82rem] font-semibold text-white shadow-soft transition-all hover:bg-cobalt-deep"
              >
                Browse Hackathons →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-4 rounded-2xl border border-line/80 bg-white p-5 shadow-soft transition-all hover:border-line hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.05rem] font-semibold text-ink">
                        {app.event?.name || 'Hackathon Event'}
                      </span>
                      <PublicVerificationBadge
                        eventId={app.event?.id || ''}
                        verificationStatus={app.event?.verification_status}
                        compact
                        showUnverified
                      />
                      {getApplicationStatusBadge(app.application_status)}
                      {getPaymentStatusBadge(app.payment_status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[0.82rem] text-ink-muted">
                      <span>
                        Team: <strong className="font-semibold text-ink">{app.team?.team_name || 'Individual'}</strong>
                      </span>
                      <span className="text-line-dark">·</span>
                      <span>
                        Submitted:{' '}
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recently'}
                      </span>
                    </div>

                    <div>
                      <VenueVerificationBadge
                        format={app.event?.format}
                        venue={app.event?.venue_request?.venue || app.event?.venue}
                      />
                    </div>
                  </div>

                  <Link
                    to="/participant/applications"
                    className="self-start shrink-0 rounded-full border border-line bg-white px-4 py-2 text-[0.82rem] font-semibold text-ink shadow-2xs transition-all hover:border-line-dark hover:bg-parchment hover:text-cobalt sm:self-center"
                  >
                    View Workspace →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Featured Upcoming Hackathons Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[1.3rem] font-semibold tracking-[-0.01em] text-ink">
                Featured Upcoming Hackathons
              </h2>
              <p className="text-[0.82rem] text-ink-muted">
                Verified competitions accepting participant applications right now.
              </p>
            </div>
            <Link
              to="/participant/discover"
              className="group inline-flex items-center gap-1 text-[0.82rem] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
            >
              <span>Browse all ({publishedEvents.length})</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {publishedEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white/70 p-8 text-center shadow-soft">
              <p className="font-display text-[1.05rem] font-semibold text-ink">
                No published hackathons available right now
              </p>
              <p className="mt-1 text-[0.82rem] text-ink-muted">
                Check back shortly as new organizer events are verified and published.
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1">
              {publishedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex w-[310px] shrink-0 flex-col justify-between rounded-2xl border border-line/80 bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-line hover:shadow-card"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="rounded-full border border-cobalt/20 bg-cobalt-tint px-2.5 py-0.5 text-[0.68rem] font-bold text-cobalt-deep uppercase">
                        {ev.format}
                      </span>
                      <span className="text-[0.78rem] font-semibold text-ink-muted">
                        {ev.registration_fee > 0 ? `₹${ev.registration_fee}` : 'Free'}
                      </span>
                    </div>

                    <div>
                      <PublicVerificationBadge
                        eventId={ev.id}
                        verificationStatus={ev.verification_status}
                        compact
                        showUnverified
                      />
                    </div>

                    <div>
                      <h3 className="font-display text-[1.12rem] font-semibold leading-snug text-ink line-clamp-1">
                        {ev.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[0.8rem] text-ink-muted">
                        {ev.description || 'Verified hackathon competition.'}
                      </p>
                    </div>

                    <div>
                      <VenueVerificationBadge
                        format={ev.format}
                        venue={ev.venue_request?.venue || ev.venue}
                        compact
                      />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-line/60 pt-3">
                    <div className="flex items-center justify-between text-[0.76rem] text-ink-muted">
                      <span>Team: {ev.minimum_team_size}–{ev.maximum_team_size}</span>
                      <span>{ev.duration_hours || 24} hours</span>
                    </div>
                    <Link
                      to={`/participant/events/${ev.id}/apply`}
                      className="mt-3 block w-full rounded-full bg-cobalt py-2 text-center text-[0.8rem] font-semibold text-white shadow-2xs transition-all hover:bg-cobalt-deep hover:shadow-soft"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Workspace CTA Card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line/90 bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-[1.2rem] font-semibold text-ink">
              Need a full team workspace?
            </h3>
            <p className="mt-1 max-w-xl text-[0.86rem] text-ink-muted">
              Access venue authorization documents, team check-in QR passes, official rounds, project submission links, and live judging results.
            </p>
          </div>
          <Link
            to="/participant/applications"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-cobalt px-5 text-[0.84rem] font-semibold text-white shadow-soft transition-all hover:bg-cobalt-deep hover:shadow-card"
          >
            Open Applications Workspace →
          </Link>
        </div>
      </div>

      <JoinTeamModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => loadData()}
      />
    </DashboardLayout>
  )
}
