import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchPublishedEvents } from '../../services/eventService'
import {
  fetchJudgeAssignedEvents,
  fetchEventSubmissions,
  fetchEventLeaderboard,
} from '../../services/submissionService'
import type { Event, ProjectSubmission, EventResult } from '../../types/database'

function AwardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="10" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m7 11-2 7 5-2 5 2-2-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const JUDGE_NAV = [
  { label: 'Evaluation Portal', href: '/judge', icon: <AwardIcon /> },
]

export function JudgePortalPage() {
  const { user, isSuperAdmin } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([])
  const [leaderboard, setLeaderboard] = useState<EventResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadJudgeEvents()
  }, [user])

  const loadJudgeEvents = async () => {
    if (!user) return
    setLoading(true)
    try {
      let evs: Event[] = []
      if (isSuperAdmin) {
        evs = await fetchPublishedEvents()
      } else {
        evs = await fetchJudgeAssignedEvents(user.id)
      }
      setEvents(evs)
      if (evs.length > 0) {
        setSelectedEventId(evs[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedEventId) return
    loadSubmissions(selectedEventId)
  }, [selectedEventId])

  const loadSubmissions = async (eventId: string) => {
    const [subs, lb] = await Promise.all([
      fetchEventSubmissions(eventId),
      fetchEventLeaderboard(eventId),
    ])
    setSubmissions(subs)
    setLeaderboard(lb)
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <DashboardLayout navItems={JUDGE_NAV} roleLabel="Hackathon Judge" roleColor="purple">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-purple-700">
            Jury & Assessment Portal
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Judge Evaluation Console
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Assess hackathon project submissions using the standardized 3-tier weighted scoring rubric.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white shadow-soft">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-purple-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-soft">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-purple-50 text-purple-700">
              <AwardIcon />
            </div>
            <h3 className="mt-3 font-heading text-lg font-bold text-ink">No Assigned Hackathons</h3>
            <p className="mt-1 text-sm text-ink-muted max-w-sm mx-auto">
              You haven't been assigned to evaluate any active events yet. Event organizers will assign you when judging commences.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Selector */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Select Hackathon Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="mt-1 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink focus:border-purple-600 focus:outline-none"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.format})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 text-xs text-ink-muted">
                <span>Submissions: <strong className="text-ink">{submissions.length}</strong></span>
                <span>Evaluated: <strong className="text-purple-700">{submissions.filter(s => s.submission_status === 'evaluated').length}</strong></span>
              </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-ink">
                Project Submissions for Evaluation
              </h2>

              {submissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-ink-muted">
                  No teams have submitted projects yet for {selectedEvent?.name}.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {submissions.map((sub) => {
                    const evalResult = leaderboard.find((r) => r.team_id === sub.team_id)
                    const isEvaluated = sub.submission_status === 'evaluated'

                    return (
                      <div
                        key={sub.id}
                        className="rounded-2xl border border-line bg-white p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-purple-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-parchment px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                              Team: {sub.team?.team_name || 'Squad'}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase ${
                                isEvaluated
                                  ? 'bg-sage-tint text-sage-ink border border-sage/30'
                                  : 'bg-amber-tint text-[#8a5a10] border border-amber/30'
                              }`}
                            >
                              {isEvaluated ? '✓ EVALUATED' : 'PENDING EVALUATION'}
                            </span>
                          </div>

                          <h3 className="mt-2.5 font-heading text-lg font-bold text-ink line-clamp-1">
                            {sub.title}
                          </h3>
                          <p className="mt-1 text-xs text-ink-muted line-clamp-2">
                            {sub.description}
                          </p>

                          <div className="mt-3 flex items-center gap-3 text-xs">
                            <a
                              href={sub.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-purple-700 hover:underline"
                            >
                              GitHub Repo ↗
                            </a>
                            {sub.demo_url && (
                              <a
                                href={sub.demo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-cobalt hover:underline"
                              >
                                Live Demo ↗
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line flex items-center justify-between">
                          <div>
                            {evalResult && (
                              <p className="text-xs text-ink-soft">
                                Weighted Score: <strong className="text-purple-700 font-bold">{evalResult.total_score} pts</strong>
                              </p>
                            )}
                          </div>
                          <Link
                            to={`/judge/evaluate?teamId=${sub.team_id}&eventId=${selectedEventId}`}
                            className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-800 transition"
                          >
                            {isEvaluated ? 'Review / Re-score →' : 'Evaluate Project →'}
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

