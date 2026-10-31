import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchPublishedEvents } from '../../services/eventService'
import { fetchMyApplications } from '../../services/participantService'
import { fetchParticipantStats } from '../../services/statsService'
import { JoinTeamModal } from '../../components/team/JoinTeamModal'
import { PublicVerificationBadge, VenueVerificationBadge } from '../../components/verification/PublicVerificationBadge'
import type { Event, Application } from '../../types/database'
import type { ParticipantStats } from '../../services/statsService'

function DiscoverIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="m8 8 4 2-2 4-4-2 2-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
}
function FileIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M11 2.5V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}
function UsersIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M7.5 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12.5 7.5a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167ZM2.5 15v-.833a4.167 4.167 0 0 1 8.333 0V15M12.5 15v-.833a3.333 3.333 0 0 0-2.5-3.225" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function QrIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12h2v2h-2zM15 15h2v2h-2z" fill="currentColor"/></svg>
}

const NAV_ITEMS = [
  { label: 'Overview', href: '/participant', icon: <FileIcon /> },
  { label: 'Discover', href: '/participant/discover', icon: <DiscoverIcon /> },
  { label: 'My Applications', href: '/participant/applications', icon: <FileIcon /> },
  { label: 'My Squad & Codes', href: '/team/my-team', icon: <UsersIcon /> },
  { label: 'My QR Pass', href: '/participant/qr-pass', icon: <QrIcon /> },
]

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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!stats) {
    return (
      <DashboardLayout navItems={NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Participant" roleColor="cobalt">
      <div className="max-w-[64rem]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-coral" />
              Participant Portal
            </p>
            <h1 className="mt-1 font-display text-[1.85rem] font-semibold text-ink">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-[0.92rem] text-ink-muted">
              Discover hackathons, manage team applications, and view live results.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-5 text-[0.88rem] font-semibold text-ink shadow-soft hover:bg-parchment"
            >
              # Join Team with Code
            </button>
            <Link
              to="/participant/discover"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-cobalt px-5 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
            >
              <DiscoverIcon />
              Discover Hackathons
            </Link>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Published Hackathons</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-ink">{stats.publishedEvents}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">My Applications</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-cobalt">{stats.myApplications}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Accepted</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-sage">{stats.acceptedApplications}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Completed</p>
            <p className="tabular mt-2 font-display text-[2rem] font-semibold text-ink">{stats.completedEvents}</p>
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[1.25rem] font-semibold text-ink">Your Applications</h2>
            <Link to="/participant/applications" className="text-[0.84rem] font-semibold text-cobalt hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-cobalt" />
            </div>
          ) : myApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center shadow-soft">
              <p className="text-[0.9rem] font-semibold text-ink">You haven't applied to any hackathons yet</p>
              <p className="mt-1 text-[0.82rem] text-ink-muted">Explore published hackathons and submit a team application.</p>
              <Link
                to="/participant/discover"
                className="mt-4 inline-flex h-9 items-center rounded-full bg-cobalt px-4 text-[0.82rem] font-semibold text-white hover:bg-cobalt-deep"
              >
                Find Hackathons
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => (
                <div key={app.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{app.event?.name}</span>
                      <PublicVerificationBadge
                        eventId={app.event?.id || ''}
                        verificationStatus={app.event?.verification_status}
                        compact
                        showUnverified
                      />
                      <span className="rounded-full bg-sage-tint px-2.5 py-0.5 text-[0.7rem] font-bold text-sage">
                        {app.application_status.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-parchment px-2 py-0.5 text-[0.7rem] font-medium text-ink-muted">
                        Payment: {app.payment_status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[0.82rem] text-ink-muted">
                      <span>Team: <strong className="text-ink">{app.team?.team_name}</strong></span>
                      <span>·</span>
                      <span>Submitted: {new Date(app.submitted_at).toLocaleDateString()}</span>
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
                    className="self-start sm:self-center shrink-0 rounded-full border border-line bg-white px-4 py-2 text-[0.82rem] font-semibold text-ink hover:bg-parchment shadow-2xs"
                  >
                    View Workspace →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[1.25rem] font-semibold text-ink">Featured Upcoming Hackathons</h2>
            <Link to="/participant/discover" className="text-[0.84rem] font-semibold text-cobalt hover:underline">
              Browse all ({publishedEvents.length})
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {publishedEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex w-[300px] shrink-0 flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="rounded-full bg-cobalt-tint px-2.5 py-0.5 text-[0.68rem] font-bold text-cobalt-deep">
                      {ev.format.toUpperCase()}
                    </span>
                    <span className="text-[0.75rem] font-semibold text-ink-muted">
                      {ev.registration_fee > 0 ? `₹${ev.registration_fee}` : 'Free'}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <PublicVerificationBadge
                      eventId={ev.id}
                      verificationStatus={ev.verification_status}
                      compact
                      showUnverified
                    />
                  </div>

                  <h3 className="mt-2.5 font-display text-[1.1rem] font-semibold text-ink leading-snug">{ev.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[0.8rem] text-ink-muted">{ev.description || 'Live hackathon event.'}</p>

                  <div className="mt-3">
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
                    className="mt-3 block w-full rounded-full bg-cobalt py-2 text-center text-[0.8rem] font-semibold text-white hover:bg-cobalt-deep shadow-2xs"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div>
            <h3 className="font-display text-[1.15rem] font-semibold text-ink">Need a full team workspace?</h3>
            <p className="mt-1 text-[0.86rem] text-ink-muted">
              Track venue authorization, official announcements, QR passes, rounds, and published results.
            </p>
          </div>
          <Link
            to="/participant/applications"
            className="inline-flex h-10 items-center rounded-full bg-cobalt px-5 text-[0.86rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
          >
            Open Applications Workspace
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
