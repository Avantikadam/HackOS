import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchUserTeams, type ExtendedTeam } from '../../services/teamCodeService'
import {
  fetchTeamSubmission,
  submitProject,
  uploadPresentationPdf,
  getSignedPresentationUrl,
} from '../../services/submissionService'
import type { ProjectSubmission } from '../../types/database'

function CodeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="m13.333 14.167 4.167-4.167-4.167-4.167M6.667 5.833 2.5 10l4.167 4.167M11.667 3.333 8.333 16.667" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M7.5 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12.5 7.5a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167ZM2.5 15v-.833a4.167 4.167 0 0 1 8.333 0V15M12.5 15v-.833a3.333 3.333 0 0 0-2.5-3.225" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12h2v2h-2zM15 15h2v2h-2z" fill="currentColor" />
    </svg>
  )
}

const TEAM_NAV_ITEMS = [
  { label: 'My Team & Code', href: '/team/my-team', icon: <UsersIcon /> },
  { label: 'Project Submission', href: '/team/submissions', icon: <CodeIcon /> },
  { label: 'My QR Pass', href: '/participant/qr-pass', icon: <QrIcon /> },
]

export function ProjectSubmissionPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [teams, setTeams] = useState<ExtendedTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<ExtendedTeam | null>(null)
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [presentationPath, setPresentationPath] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadUserTeams()
  }, [user])

  const loadUserTeams = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchUserTeams(user.id)
      setTeams(data)

      const urlTeamId = searchParams.get('teamId')
      if (urlTeamId && data.some((t) => t.id === urlTeamId)) {
        const match = data.find((t) => t.id === urlTeamId)!
        setSelectedTeam(match)
      } else if (data.length > 0) {
        setSelectedTeam(data[0])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedTeam) return
    loadSubmission(selectedTeam.id)
  }, [selectedTeam])

  const loadSubmission = async (teamId: string) => {
    setError(null)
    setSuccessMsg(null)
    const existing = await fetchTeamSubmission(teamId)
    setSubmission(existing)
    if (existing) {
      setTitle(existing.title)
      setDescription(existing.description)
      setGithubUrl(existing.github_url)
      setDemoUrl(existing.demo_url || '')
      setPresentationPath(existing.presentation_storage_path || null)

      if (existing.presentation_storage_path) {
        getSignedPresentationUrl(existing.presentation_storage_path).then((url) => {
          setPdfSignedUrl(url)
        })
      }
    } else {
      setTitle('')
      setDescription('')
      setGithubUrl('')
      setDemoUrl('')
      setPresentationPath(null)
      setPdfSignedUrl(null)
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTeam) return
    setUploadingPdf(true)
    setError(null)

    try {
      const path = await uploadPresentationPdf(selectedTeam.event_id, selectedTeam.id, file)
      setPresentationPath(path)
      const signed = await getSignedPresentationUrl(path)
      setPdfSignedUrl(signed)
      setSuccessMsg('Presentation slides uploaded securely (25MB private storage).')
    } catch (err: any) {
      setError(err?.message || 'Failed to upload presentation slides.')
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) return
    setError(null)
    setSuccessMsg(null)
    setSubmitting(true)

    try {
      const res = await submitProject({
        eventId: selectedTeam.event_id,
        teamId: selectedTeam.id,
        title,
        description,
        githubUrl,
        demoUrl,
        presentationPath: presentationPath || undefined,
      })

      setSubmission(res)
      setSuccessMsg(`Project "${res.title}" successfully recorded for judging!`)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit project.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout navItems={TEAM_NAV_ITEMS} roleLabel="Team Leader & Squad" roleColor="sage">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
            Project Showcase & Submissions
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Project Submission Portal
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Deliver your code repository, live demo, and presentation deck for judging evaluation.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white shadow-soft">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-soft">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cobalt-tint text-cobalt font-mono text-xl font-bold">
              #
            </div>
            <h3 className="mt-3 font-heading text-lg font-bold text-ink">No Active Squad</h3>
            <p className="mt-1 text-sm text-ink-muted">
              You must belong to a team before submitting a hackathon project.
            </p>
            <Link
              to="/team/my-team"
              className="mt-4 inline-flex rounded-xl bg-cobalt px-5 py-2.5 text-xs font-semibold text-white hover:bg-cobalt-hover"
            >
              Go to Squad Headquarters
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Team Switcher if multiple */}
            {teams.length > 1 && (
              <div className="flex items-center gap-2 border-b border-line pb-2 overflow-x-auto">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeam(t)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition ${
                      selectedTeam?.id === t.id
                        ? 'bg-cobalt text-white shadow-sm'
                        : 'bg-white text-ink-soft border border-line hover:bg-parchment'
                    }`}
                  >
                    {t.team_name}
                  </button>
                ))}
              </div>
            )}

            {/* Submission Status Banner */}
            {submission && (
              <div className="rounded-2xl border border-sage/40 bg-sage-tint/40 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-sage-ink">
                      ✓ Submission Active (v{submission.version})
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[0.7rem] font-bold uppercase text-ink border border-sage/30">
                      {submission.submission_status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {submission.title}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Last updated on {new Date(submission.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={submission.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-parchment transition"
                  >
                    View Repo ↗
                  </a>
                  {pdfSignedUrl && (
                    <a
                      href={pdfSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-ink px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ink-soft transition"
                    >
                      Inspect Slides PDF ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl border border-sage/40 bg-sage-tint/60 p-4 text-xs font-semibold text-sage-ink">
                {successMsg}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-coral/30 bg-coral-tint/40 p-4 text-xs font-semibold text-coral">
                {error}
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-6 shadow-soft space-y-5">
              <div className="border-b border-line pb-3">
                <h3 className="font-heading text-lg font-bold text-ink">
                  {submission ? 'Update Project Submission' : 'Initial Project Submission'}
                </h3>
                <p className="text-xs text-ink-muted">
                  Team: <strong>{selectedTeam?.team_name}</strong> · Event: <strong>{selectedTeam?.event?.name || 'Hackathon'}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. NeuroSync: Distributed Edge AI Framework"
                  className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink focus:border-cobalt focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Executive Description & Solution Summary *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the problem, your architecture, technologies used, and real-world impact..."
                  className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink focus:border-cobalt focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    GitHub Code Repository URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/myteam/project"
                    className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 font-mono text-xs text-ink focus:border-cobalt focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Live Demo / Video Pitch Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://myproject-demo.app or Loom/YouTube"
                    className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 font-mono text-xs text-ink focus:border-cobalt focus:outline-none"
                  />
                </div>
              </div>

              {/* Presentation Slides PDF Upload */}
              <div className="rounded-xl border border-line bg-parchment/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading text-sm font-bold text-ink">
                      Presentation Deck (PDF, max 25MB)
                    </h4>
                    <p className="text-xs text-ink-muted">
                      Uploaded directly to private, access-guarded storage for judge review.
                    </p>
                  </div>
                  {presentationPath && (
                    <span className="rounded-full bg-sage-tint px-2.5 py-0.5 text-xs font-bold text-sage-ink border border-sage/30">
                      ✓ Slides Attached
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                    className="text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-cobalt file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-cobalt-hover"
                  />
                  {uploadingPdf && (
                    <span className="text-xs font-semibold text-cobalt animate-pulse">
                      Uploading PDF deck...
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || uploadingPdf || !title.trim() || !githubUrl.trim()}
                  className="rounded-xl bg-cobalt px-6 py-2.5 text-sm font-semibold text-white hover:bg-cobalt-hover disabled:opacity-50 transition"
                >
                  {submitting ? 'Recording Submission...' : 'Submit Final Project for Judging'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
