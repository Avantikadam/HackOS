import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import type { EventVerification, HackathonVerificationStatus } from '../../types/database'
import {
  fetchAllVerifications,
  getSignedVerificationDocUrl,
  reviewVerification,
  fetchVerificationTermsAcceptances
} from '../../services/verificationService'

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M10 2s5 2 7 3v5c0 5-7 8-7 8s-7-3-7-8V5c2-1 7-3 7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m7.5 10 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BuildingLibraryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M2.5 8.333 10 3.333l7.5 5M3.333 8.333V15m4.167-6.667V15m5-6.667V15m4.167-6.667V15M1.667 15h16.666M2.5 17.5h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const NAV_ITEMS = [
  { label: 'Verification Queue', href: '/admin/verifications', icon: <ShieldCheckIcon /> },
  { label: 'Institutional Domains', href: '/admin/domains', icon: <BuildingLibraryIcon /> }
]

export function VerificationReviewPage() {
  const [verifications, setVerifications] = useState<EventVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | HackathonVerificationStatus>('pending_review')
  const [selectedVerif, setSelectedVerif] = useState<EventVerification | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [termsAcceptances, setTermsAcceptances] = useState<any[]>([])

  // Review modal state
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_info' | 'suspend' | 'revoke' | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [publicSummary, setPublicSummary] = useState('')
  const [letterPublic, setLetterPublic] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadVerifications()
  }, [filter])

  const loadVerifications = async () => {
    setLoading(true)
    try {
      const data = await fetchAllVerifications(filter === 'all' ? undefined : filter)
      setVerifications(data)
      if (selectedVerif) {
        const updated = data.find((v) => v.id === selectedVerif.id) || null
        setSelectedVerif(updated)
      }
    } catch (err) {
      console.error('Failed to load verifications queue:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectVerif = async (v: EventVerification) => {
    setSelectedVerif(v)
    setFeedback(null)
    setReason('')
    setNotes('')
    setPublicSummary(v.public_summary || 'Official venue authorization and organizer accountability terms verified by HACKOS verification officers.')
    setLetterPublic(Boolean(v.letter_public))

    // Pre-fetch terms acceptances
    try {
      const acc = await fetchVerificationTermsAcceptances(v.id)
      setTermsAcceptances(acc)
    } catch (err) {
      console.error('Error fetching terms acceptances:', err)
    }
  }

  const handleInspectDocument = async (storagePath: string) => {
    setLoadingDoc(true)
    try {
      const url = await getSignedVerificationDocUrl(storagePath)
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setFeedback({ type: 'error', message: 'Failed to generate signed document URL.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error opening document.' })
    } finally {
      setLoadingDoc(false)
    }
  }

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerif || !reviewAction) return
    setFeedback(null)

    if (['reject', 'request_info', 'suspend', 'revoke'].includes(reviewAction) && !reason.trim()) {
      setFeedback({ type: 'error', message: 'A mandatory explanation/reason is required for this action.' })
      return
    }

    setProcessing(true)
    try {
      const res = await reviewVerification({
        verificationId: selectedVerif.id,
        action: reviewAction,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        publicSummary: publicSummary.trim() || undefined,
        letterPublic
      })

      if (res.success) {
        setFeedback({ type: 'success', message: res.message })
        setReviewAction(null)
        setReason('')
        setNotes('')
        await loadVerifications()
      } else {
        setFeedback({ type: 'error', message: res.message })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Review action failed.'
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Verification Officer" roleColor="cobalt">
      <div className="max-w-[72rem]">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt">
            HACKOS Trust & Verification Command
          </p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink">
            Official Hackathon Verification Review
          </h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Inspect uploaded venue authorization letters, review organizer accountability terms, and issue official verification decisions.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-6 rounded-xl border p-4 text-[0.88rem] ${
              feedback.type === 'success'
                ? 'border-sage/25 bg-sage-tint text-sage-ink'
                : 'border-coral/25 bg-coral-tint text-coral-ink'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-3">
          {[
            ['pending_review', 'Pending Review'],
            ['additional_info_required', 'Info Requested'],
            ['verified', 'Verified'],
            ['rejected', 'Rejected'],
            ['all', 'All Applications']
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key as any)}
              className={`rounded-full px-4 py-1.5 text-[0.82rem] font-semibold transition-colors ${
                filter === key
                  ? 'bg-cobalt text-white shadow-sm'
                  : 'bg-white border border-line text-ink-soft hover:bg-parchment'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Master-Detail Split Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Applications List */}
          <div className="lg:col-span-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-line bg-white p-8 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-cobalt" />
              </div>
            ) : verifications.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-8 text-center text-ink-muted">
                No verification submissions in this queue.
              </div>
            ) : (
              verifications.map((v) => {
                const isSelected = selectedVerif?.id === v.id
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVerif(v)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-cobalt bg-cobalt-tint/30 shadow-card'
                        : 'border-line/80 bg-white hover:border-line hover:shadow-soft'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-[0.92rem]">
                        {v.event_name_confirmed}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${
                        v.status === 'verified'
                          ? 'bg-sage-tint text-sage-ink'
                          : v.status === 'pending_review'
                          ? 'bg-amber-tint text-[#8a5a10]'
                          : 'bg-coral-tint text-coral-ink'
                      }`}>
                        {v.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    <p className="mt-1 text-[0.82rem] text-ink-soft line-clamp-1">
                      Venue: <strong>{v.venue_name}</strong>
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[0.76rem] text-ink-muted">
                      <span>Signatory: {v.representative_name}</span>
                      <span>v{v.document_version} · {new Date(v.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Details & Review Panel */}
          <div className="lg:col-span-7">
            {selectedVerif ? (
              <div className="rounded-2xl border border-line bg-white p-6 shadow-soft space-y-6">
                <div className="flex items-start justify-between border-b border-line/80 pb-4">
                  <div>
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-cobalt">
                      Submission Details
                    </span>
                    <h2 className="mt-1 font-display text-[1.4rem] font-semibold text-ink">
                      {selectedVerif.event_name_confirmed}
                    </h2>
                    <p className="text-[0.84rem] text-ink-muted">
                      Status: <strong className="uppercase">{selectedVerif.status.replace(/_/g, ' ')}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInspectDocument(selectedVerif.document_storage_path)}
                    disabled={loadingDoc}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-cobalt px-4 text-[0.82rem] font-semibold text-white hover:bg-cobalt-deep disabled:opacity-50"
                  >
                    {loadingDoc ? 'Opening…' : 'Inspect Letter Document ↗'}
                  </button>
                </div>

                {/* Venue & Signatory Specs */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-[0.85rem]">
                  <div className="rounded-xl bg-parchment/50 p-4">
                    <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Claimed Venue</p>
                    <p className="mt-1 font-semibold text-ink">{selectedVerif.venue_name}</p>
                    <p className="text-ink-soft mt-0.5">{selectedVerif.venue_address}</p>
                  </div>

                  <div className="rounded-xl bg-parchment/50 p-4">
                    <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Venue Signatory</p>
                    <p className="mt-1 font-semibold text-ink">{selectedVerif.representative_name}</p>
                    <p className="text-ink-soft mt-0.5">{selectedVerif.representative_designation}</p>
                    {selectedVerif.representative_contact && (
                      <p className="mt-1 text-[0.78rem] text-ink-muted">
                        Contact: {selectedVerif.representative_contact}
                      </p>
                    )}
                  </div>
                </div>

                {/* Event Schedule Confirmed */}
                <div className="rounded-xl border border-line p-4 text-[0.82rem]">
                  <h4 className="font-semibold text-ink text-[0.85rem]">Event Schedule & Dates Verified</h4>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-ink-soft">
                    <div>
                      <span className="text-ink-muted text-[0.74rem]">Start Date:</span>
                      <p className="font-semibold text-ink">{new Date(selectedVerif.start_at_confirmed).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[0.74rem]">End Date:</span>
                      <p className="font-semibold text-ink">{new Date(selectedVerif.end_at_confirmed).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[0.74rem]">Duration:</span>
                      <p className="font-semibold text-ink">{selectedVerif.duration_hours_confirmed || 24} hours</p>
                    </div>
                  </div>
                </div>

                {/* Terms Acceptance Log */}
                <div className="rounded-xl border border-line/80 bg-parchment/30 p-4 text-[0.82rem]">
                  <h4 className="font-semibold text-ink text-[0.85rem]">Organizer Terms Acceptance Record</h4>
                  <p className="mt-1 text-ink-soft">
                    Terms Version: <strong>v{selectedVerif.terms_version}</strong> · Accepted on:{' '}
                    <strong>{new Date(selectedVerif.terms_accepted_at).toLocaleString()}</strong>
                    {termsAcceptances.length > 0 && ` (${termsAcceptances.length} acceptance record${termsAcceptances.length > 1 ? 's' : ''})`}
                  </p>
                  <p className="mt-1 text-[0.78rem] text-sage-ink font-semibold">
                    ✓ Organizer explicitly confirmed authenticity of document and accepted operational liability under HACKOS guidelines.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-line/80 pt-4">
                  <h4 className="text-[0.82rem] font-bold uppercase tracking-[0.14em] text-cobalt mb-3">
                    Verification Decision
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('approve')}
                      className="rounded-full bg-sage px-5 py-2 text-[0.84rem] font-semibold text-white shadow-soft hover:bg-sage-ink"
                    >
                      ✓ Approve Verification
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewAction('request_info')}
                      className="rounded-full border border-line bg-white px-4 py-2 text-[0.84rem] font-semibold text-ink-soft hover:bg-parchment"
                    >
                      Request Clarification
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewAction('reject')}
                      className="rounded-full border border-coral/30 bg-coral-tint px-4 py-2 text-[0.84rem] font-semibold text-coral-ink hover:bg-coral/20"
                    >
                      Reject Submission
                    </button>

                    {selectedVerif.status === 'verified' && (
                      <button
                        type="button"
                        onClick={() => setReviewAction('suspend')}
                        className="rounded-full border border-line bg-white px-4 py-2 text-[0.84rem] font-semibold text-coral-ink hover:bg-coral-tint"
                      >
                        Suspend / Revoke
                      </button>
                    )}
                  </div>
                </div>

                {/* Review Action Dialog / Form */}
                {reviewAction && (
                  <form onSubmit={handleExecuteReview} className="rounded-xl border border-line/90 bg-parchment/40 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <h5 className="font-semibold text-ink uppercase text-[0.84rem]">
                        Confirm Action: {reviewAction.replace(/_/g, ' ')}
                      </h5>
                      <button
                        type="button"
                        onClick={() => setReviewAction(null)}
                        className="text-ink-muted hover:text-ink text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    {reviewAction === 'approve' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[0.82rem] font-semibold text-ink">
                            Public Verification Summary (Participant Facing)
                          </label>
                          <textarea
                            rows={2}
                            value={publicSummary}
                            onChange={(e) => setPublicSummary(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-line p-2.5 text-[0.84rem] bg-white"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-[0.82rem] text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            checked={letterPublic}
                            onChange={(e) => setLetterPublic(e.target.checked)}
                            className="rounded border-line text-cobalt"
                          />
                          <span>Allow participants to view the authorization letter document publicly</span>
                        </label>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[0.82rem] font-semibold text-ink">
                          Mandatory Reason / Correction Request *
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder={
                            reviewAction === 'request_info'
                              ? 'Explain what details or letter corrections the organizer must provide…'
                              : 'State the specific reason for rejecting or revoking this verification…'
                          }
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-[0.84rem] bg-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[0.82rem] font-semibold text-ink">
                        Internal Reviewer Notes (Private)
                      </label>
                      <input
                        type="text"
                        placeholder="Optional internal notes for review audit"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line px-3 py-1.5 text-[0.84rem] bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setReviewAction(null)}
                        className="rounded-full border border-line px-4 py-1.5 text-[0.82rem] text-ink-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className="rounded-full bg-cobalt px-5 py-1.5 text-[0.82rem] font-semibold text-white hover:bg-cobalt-deep disabled:opacity-50"
                      >
                        {processing ? 'Processing…' : `Confirm ${reviewAction.toUpperCase()}`}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white p-8 text-center text-ink-muted">
                Select an application from the queue to inspect details and issue a verification decision.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
