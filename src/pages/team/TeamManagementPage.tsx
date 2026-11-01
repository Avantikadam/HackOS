import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchUserTeams, type ExtendedTeam } from '../../services/teamCodeService'
import { JoinTeamModal } from '../../components/team/JoinTeamModal'

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M7.5 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12.5 7.5a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167ZM2.5 15v-.833a4.167 4.167 0 0 1 8.333 0V15M12.5 15v-.833a3.333 3.333 0 0 0-2.5-3.225" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="m13.333 14.167 4.167-4.167-4.167-4.167M6.667 5.833 2.5 10l4.167 4.167M11.667 3.333 8.333 16.667" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12h2v2h-2zM15 15h2v2h-2zM12 16h1v1h-1zM16 12h1v1h-1z" fill="currentColor" />
    </svg>
  )
}

const TEAM_NAV_ITEMS = [
  { label: 'Overview', href: '/participant', icon: <UsersIcon /> },
  { label: 'My Team & Code', href: '/team/my-team', icon: <UsersIcon /> },
  { label: 'Project Submission', href: '/team/submissions', icon: <CodeIcon /> },
  { label: 'My QR Pass', href: '/participant/qr-pass', icon: <QrIcon /> },
]

export function TeamManagementPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<ExtendedTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<ExtendedTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (!user) return
    loadTeams()
  }, [user])

  const loadTeams = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchUserTeams(user.id)
      setTeams(data)
      if (data.length > 0) {
        setSelectedTeam(data[0])
      }
    } catch (err) {
      console.error('Failed to load user teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/participant?code=${code}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <DashboardLayout navItems={TEAM_NAV_ITEMS} roleLabel="Team Leader & Squad" roleColor="sage">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
              Squad Headquarters
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Team Roster & Unique Codes
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Distribute your non-sequential cryptographic team code to invite squad members and prepare your submission.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-parchment"
            >
              + Join with Code
            </button>
            <Link
              to="/participant/discover"
              className="inline-flex items-center gap-2 rounded-xl bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cobalt-hover"
            >
              Discover Events
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-soft">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cobalt-tint text-cobalt font-mono text-xl font-bold">
              #
            </div>
            <h2 className="mt-4 font-heading text-xl font-bold text-ink">No Teams Found</h2>
            <p className="mt-1 max-w-md mx-auto text-sm text-ink-muted">
              You haven't formed or joined a squad yet. You can join a team with an invite code or register a new team on an open hackathon.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="rounded-xl bg-cobalt px-5 py-2.5 text-sm font-semibold text-white hover:bg-cobalt-hover"
              >
                Join Team with Code
              </button>
              <Link
                to="/participant/discover"
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-parchment"
              >
                Browse Hackathons
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Multiple teams tabs if member of more than 1 team */}
            {teams.length > 1 && (
              <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeam(t)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedTeam?.id === t.id
                        ? 'bg-cobalt text-white shadow-sm'
                        : 'bg-white text-ink-soft border border-line hover:bg-parchment'
                    }`}
                  >
                    {t.team_name} ({t.event?.name || 'Event'})
                  </button>
                ))}
              </div>
            )}

            {selectedTeam && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Cols: Team Overview & Roster */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Event & Team Info Banner */}
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="rounded-full bg-cobalt-tint px-2.5 py-0.5 text-xs font-semibold text-cobalt">
                          {selectedTeam.is_leader ? 'Squad Leader' : 'Team Member'}
                        </span>
                        <h2 className="mt-2 font-heading text-2xl font-bold text-ink">
                          {selectedTeam.team_name}
                        </h2>
                        <p className="text-sm font-medium text-ink-muted">
                          Registered for: <strong className="text-ink">{selectedTeam.event?.name || 'Hackathon Event'}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <Link
                          to={`/team/submissions?teamId=${selectedTeam.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink-soft transition-colors"
                        >
                          Submit Project ↗
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Member Roster Card */}
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between border-b border-line pb-4">
                      <div>
                        <h3 className="font-heading text-base font-bold text-ink">
                          Squad Members
                        </h3>
                        <p className="text-xs text-ink-muted">
                          Active roster for this event. Max team size: {selectedTeam.max_team_size || selectedTeam.event?.maximum_team_size || 4}
                        </p>
                      </div>
                      <span className="rounded-full bg-sage-tint px-3 py-1 text-xs font-bold text-sage-ink border border-sage/30">
                        {selectedTeam.members?.length || 1} / {selectedTeam.max_team_size || selectedTeam.event?.maximum_team_size || 4} Joined
                      </span>
                    </div>

                    <div className="mt-4 divide-y divide-line/60">
                      {/* Leader Row */}
                      <div className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-sage-tint text-sage font-bold text-xs">
                            ★
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {user?.id === selectedTeam.team_leader_id ? 'You (Team Leader)' : 'Team Leader'}
                            </p>
                            <p className="text-xs text-ink-muted">Created the squad</p>
                          </div>
                        </div>
                        <span className="rounded-full border border-sage/40 bg-sage-tint/40 px-2 py-0.5 text-[0.7rem] font-bold text-sage-ink">
                          LEADER
                        </span>
                      </div>

                      {/* Member Rows */}
                      {(selectedTeam.members || [])
                        .filter((m) => m.user_id !== selectedTeam.team_leader_id)
                        .map((member) => (
                          <div key={member.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-parchment text-ink-muted font-bold text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-ink">{member.name}</p>
                                <p className="text-xs text-ink-muted">{member.email}</p>
                              </div>
                            </div>
                            <span className="rounded-full border border-line bg-parchment/60 px-2 py-0.5 text-[0.7rem] font-semibold text-ink-soft uppercase">
                              {member.invitation_status}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Right Col: Team Code & Shortcuts */}
                <div className="space-y-6">
                  {/* Team Code Display Box */}
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                    <p className="text-[0.72rem] font-bold uppercase tracking-wider text-cobalt">
                      Invite Team Members
                    </p>
                    <h3 className="mt-1 font-heading text-lg font-bold text-ink">
                      Team Code
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                      Share this unique cryptographic code with your teammates. They can enter it on their dashboard to join instantly.
                    </p>

                    <div className="mt-4 rounded-xl border-2 border-dashed border-cobalt/30 bg-cobalt-tint/30 p-4 text-center">
                      <p className="text-[0.68rem] font-bold uppercase tracking-widest text-cobalt">
                        Cryptographic Key
                      </p>
                      <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-ink select-all">
                        {selectedTeam.team_code || 'HACK-CODE'}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedTeam.team_code || '')}
                        className="w-full rounded-xl bg-cobalt py-2.5 text-xs font-semibold text-white hover:bg-cobalt-hover transition"
                      >
                        {copiedCode ? '✓ Code Copied to Clipboard!' : 'Copy Team Code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(selectedTeam.team_code || '')}
                        className="w-full rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink-soft hover:bg-parchment transition"
                      >
                        {copiedLink ? '✓ Direct Link Copied!' : 'Copy Direct Invite Link'}
                      </button>
                    </div>
                  </div>

                  {/* QR Pass Shortcut */}
                  <div className="rounded-2xl border border-line bg-gradient-to-br from-parchment/60 to-white p-6 shadow-soft">
                    <h4 className="font-heading text-sm font-bold text-ink">
                      Offline Check-In QR Pass
                    </h4>
                    <p className="mt-1 text-xs text-ink-muted">
                      Your attendance pass with zero PII. Ready for physical venue gate check-in.
                    </p>
                    <Link
                      to={`/participant/qr-pass?eventId=${selectedTeam.event_id}`}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink hover:bg-parchment transition"
                    >
                      <QrIcon />
                      Open My QR Pass →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <JoinTeamModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => loadTeams()}
      />
    </DashboardLayout>
  )
}
