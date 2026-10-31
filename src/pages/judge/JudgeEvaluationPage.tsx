import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import {
  fetchTeamSubmission,
  fetchEventCriteria,
  submitJudgeEvaluation,
  getSignedPresentationUrl,
} from '../../services/submissionService'
import type { ProjectSubmission, JudgingCriterion } from '../../types/database'

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

export function JudgeEvaluationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const teamId = searchParams.get('teamId')
  const eventId = searchParams.get('eventId')

  const [submission, setSubmission] = useState<ProjectSubmission | null>(null)
  const [criteria, setCriteria] = useState<JudgingCriterion[]>([])
  const [scores, setScores] = useState<Record<string, { score: number; comments: string }>>({})
  const [generalComments, setGeneralComments] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{ score: number } | null>(null)

  useEffect(() => {
    if (!teamId || !eventId) return
    loadData(teamId, eventId)
  }, [teamId, eventId])

  const loadData = async (tId: string, eId: string) => {
    setLoading(true)
    setError(null)
    try {
      const [sub, critList] = await Promise.all([
        fetchTeamSubmission(tId),
        fetchEventCriteria(eId),
      ])

      setSubmission(sub)

      // Fallback to standard 3-tier rubric if event has no explicit criteria in database
      let resolvedCriteria = critList
      if (resolvedCriteria.length === 0) {
        resolvedCriteria = [
          { id: 'crit-innovation', event_id: eId, name: 'Innovation & Originality', description: 'Novelty of approach and problem framing', weight: 30, sequence_number: 1, created_at: '' },
          { id: 'crit-impact', event_id: eId, name: 'Impact & Practical Relevance', description: 'Real-world utility and market potential', weight: 30, sequence_number: 2, created_at: '' },
          { id: 'crit-execution', event_id: eId, name: 'Technical Execution & Architecture', description: 'Code quality, system design, and functional depth', weight: 40, sequence_number: 3, created_at: '' },
        ]
      }
      setCriteria(resolvedCriteria)

      // Initialize scores
      const initial: Record<string, { score: number; comments: string }> = {}
      for (const c of resolvedCriteria) {
        initial[c.id] = { score: 8.0, comments: '' }
      }
      setScores(initial)

      if (sub?.presentation_storage_path) {
        getSignedPresentationUrl(sub.presentation_storage_path).then((url) => {
          setPdfUrl(url)
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load evaluation details.')
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = (criterionId: string, val: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: Math.min(10, Math.max(0, val)),
      },
    }))
  }

  const handleCommentsChange = (criterionId: string, val: string) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        comments: val,
      },
    }))
  }

  // Provisional client-side calculation for UI guidance
  const provisionalWeighted = criteria.reduce((sum, c) => {
    const sc = scores[c.id]?.score ?? 0
    return sum + (sc * (c.weight / 100))
  }, 0)

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId || !eventId) return
    setError(null)
    setSubmitting(true)

    try {
      const payloadScores = criteria.map((c) => ({
        criterion_id: c.id,
        score: scores[c.id]?.score ?? 0,
        comments: scores[c.id]?.comments || undefined,
      }))

      const res = await submitJudgeEvaluation({
        event_id: eventId,
        team_id: teamId,
        scores: payloadScores,
        general_comments: generalComments,
      })

      setSuccessResult({ score: res.weighted_score })
    } catch (err: any) {
      setError(err?.message || 'Failed to record evaluation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout navItems={JUDGE_NAV} roleLabel="Hackathon Judge" roleColor="purple">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/judge" className="text-xs font-semibold text-purple-700 hover:underline">
              ← Back to Submissions Queue
            </Link>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Evaluate Project Submission
            </h1>
          </div>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
            3-Tier Rubric
          </span>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white shadow-soft">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-purple-600" />
          </div>
        ) : !submission ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-soft">
            <p className="text-sm font-semibold text-ink">Project submission not found or not yet submitted.</p>
            <Link to="/judge" className="mt-3 inline-block text-xs font-semibold text-purple-700 hover:underline">
              Return to Submissions Queue
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Overview Card */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <span className="rounded-full bg-parchment px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                    Team: {submission.team?.team_name}
                  </span>
                  <h2 className="mt-2 font-heading text-xl font-bold text-ink">
                    {submission.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={submission.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink-soft transition"
                  >
                    Inspect GitHub Repo ↗
                  </a>
                  {submission.demo_url && (
                    <a
                      href={submission.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-cobalt hover:bg-parchment transition"
                    >
                      Open Live Demo ↗
                    </a>
                  )}
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition"
                    >
                      View Slides PDF ↗
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Solution Brief
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">
                  {submission.description}
                </p>
              </div>
            </div>

            {/* Success Banner */}
            {successResult && (
              <div className="rounded-2xl border border-sage/40 bg-sage-tint/60 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-sage-ink">
                  <span>✓</span>
                  <span>Evaluation Successfully Recorded & Verified by PostgreSQL Engine!</span>
                </div>
                <p className="text-xs text-ink-soft">
                  Final server-weighted score: <strong className="text-sage-ink font-bold">{successResult.score.toFixed(2)} pts</strong>. Event leaderboard standings have been updated.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/judge')}
                    className="rounded-xl bg-sage-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Return to Submissions Queue →
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-coral/30 bg-coral-tint/40 p-4 text-xs font-semibold text-coral">
                {error}
              </div>
            )}

            {/* 3-Tier Rubric Scoring Form */}
            <form onSubmit={handleSubmitEvaluation} className="rounded-2xl border border-line bg-white p-6 shadow-soft space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink">
                    Standard 3-Tier Scoring Rubric
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Assign scores from 0.0 to 10.0 per criterion. Total weight adds to 100%.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase font-bold text-ink-muted">Provisional Total</p>
                  <p className="font-heading text-2xl font-bold text-purple-700">
                    {provisionalWeighted.toFixed(2)} <span className="text-xs text-ink-muted font-normal">/ 10.0</span>
                  </p>
                </div>
              </div>

              {/* Criteria Sliders */}
              <div className="space-y-6">
                {criteria.map((c) => {
                  const currentScore = scores[c.id]?.score ?? 0
                  return (
                    <div key={c.id} className="rounded-xl border border-line bg-parchment/30 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-heading text-sm font-bold text-ink">
                            {c.name}
                          </p>
                          <p className="text-xs text-ink-muted">
                            Weight: <strong className="text-purple-700">{c.weight}%</strong> of final total
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(c.id, Number(e.target.value))}
                            className="w-16 rounded-xl border border-line bg-white px-2.5 py-1.5 text-center font-bold text-ink text-sm focus:border-purple-600 focus:outline-none"
                          />
                          <span className="text-xs font-semibold text-ink-muted">/ 10</span>
                        </div>
                      </div>

                      {/* Score Slider */}
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={currentScore}
                        onChange={(e) => handleScoreChange(c.id, Number(e.target.value))}
                        className="w-full accent-purple-700 cursor-pointer"
                      />

                      {/* Comments for this criterion */}
                      <input
                        type="text"
                        placeholder={`Specific feedback for ${c.name}...`}
                        value={scores[c.id]?.comments || ''}
                        onChange={(e) => handleCommentsChange(c.id, e.target.value)}
                        className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-purple-600 focus:outline-none"
                      />
                    </div>
                  )
                })}
              </div>

              {/* General Feedback Textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  General Jury Evaluation & Feedback
                </label>
                <textarea
                  rows={3}
                  value={generalComments}
                  onChange={(e) => setGeneralComments(e.target.value)}
                  placeholder="Commendations, constructive recommendations, and overall impression..."
                  className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Anti-tamper guarantee notice */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900 flex items-start gap-2">
                <span>🛡️</span>
                <p>
                  <strong>Server-Side Weighted Scoring:</strong> When you submit, the server computes and verifies the weighted sum <code className="font-mono text-[0.7rem] bg-white px-1 py-0.5 rounded">SUM(score * weight / 100)</code> directly in PostgreSQL to ensure cryptographic integrity.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/judge')}
                  className="rounded-xl border border-line px-5 py-2.5 text-xs font-semibold text-ink-soft hover:bg-parchment"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-purple-700 px-6 py-2.5 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? 'Submitting & Verifying...' : 'Submit Official Evaluation'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
