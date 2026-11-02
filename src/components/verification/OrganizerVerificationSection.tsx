import { useState, useEffect } from 'react'
import type { Event, EventVerification, EventVerificationAuditLog } from '../../types/database'
import {
  fetchEventVerification,
  fetchVerificationAuditLogs,
  uploadVerificationDocument,
  getSignedVerificationDocUrl,
  submitVerification,
  ORGANIZER_VERIFICATION_TERMS_TEXT,
  CURRENT_TERMS_VERSION
} from '../../services/verificationService'
import {
  matchInstitutionalDomain,
  screenAdministrativeMailbox,
  type DomainMatchResult,
  type MailboxScreenResult,
} from '../../services/domainService'

interface OrganizerVerificationSectionProps {
  event: Event
  onVerificationUpdated?: () => void
}

export function OrganizerVerificationSection({ event, onVerificationUpdated }: OrganizerVerificationSectionProps) {
  const [verification, setVerification] = useState<EventVerification | null>(null)
  const [auditLogs, setAuditLogs] = useState<EventVerificationAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingDocUrl, setFetchingDocUrl] = useState(false)

  // Form states
  const [isEditing, setIsEditing] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [repName, setRepName] = useState('')
  const [repDesignation, setRepDesignation] = useState('')
  const [repContact, setRepContact] = useState('')
  const [domainMatch, setDomainMatch] = useState<DomainMatchResult | null>(null)
  const [mailboxScreen, setMailboxScreen] = useState<MailboxScreenResult | null>(null)

  useEffect(() => {
    if (!repContact || !repContact.includes('@')) {
      setDomainMatch(null)
      setMailboxScreen(null)
      return
    }

    const timer = setTimeout(async () => {
      const [matchRes, screenRes] = await Promise.all([
        matchInstitutionalDomain(repContact),
        screenAdministrativeMailbox(repContact),
      ])
      setDomainMatch(matchRes)
      setMailboxScreen(screenRes)
    }, 300)

    return () => clearTimeout(timer)
  }, [repContact])

  // Upload state
  const [uploadedDoc, setUploadedDoc] = useState<{
    path: string
    filename: string
    size: number
    mimeType: string
  } | null>(null)
  const [uploading, setUploading] = useState(false)

  // Declarations & Acceptance checkboxes
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [accurateConfirmed, setAccurateConfirmed] = useState(false)
  const [authenticConfirmed, setAuthenticConfirmed] = useState(false)
  const [showFullTerms, setShowFullTerms] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadVerificationData()
  }, [event.id])

  const loadVerificationData = async () => {
    setLoading(true)
    try {
      const [verif, logs] = await Promise.all([
        fetchEventVerification(event.id),
        fetchVerificationAuditLogs(event.id)
      ])
      setVerification(verif)
      setAuditLogs(logs)

      if (verif) {
        setVenueName(verif.venue_name || '')
        setVenueAddress(verif.venue_address || '')
        setRepName(verif.representative_name || '')
        setRepDesignation(verif.representative_designation || '')
        setRepContact(verif.representative_contact || '')
        setUploadedDoc({
          path: verif.document_storage_path,
          filename: verif.document_filename,
          size: verif.document_file_size || 0,
          mimeType: verif.document_mime_type || ''
        })
      } else {
        // Prefill venue name if available from event venue_request
        const evVenue = (event as any).venue_request?.venue || (event as any).venue
        if (evVenue) {
          setVenueName(evVenue.venue_name || '')
          setVenueAddress([evVenue.address, evVenue.city, evVenue.state].filter(Boolean).join(', '))
        }
      }
    } catch (err) {
      console.error('Failed to load verification info:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFeedback(null)
    setUploading(true)

    try {
      const res = await uploadVerificationDocument(event.id, selectedFile)
      setUploadedDoc(res)
      setFeedback({ type: 'success', message: `Letter "${res.filename}" uploaded securely. Preview ready.` })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  const handlePreviewDocument = async () => {
    const docPath = uploadedDoc?.path || verification?.document_storage_path
    if (!docPath) return

    setFetchingDocUrl(true)
    try {
      const url = await getSignedVerificationDocUrl(docPath)
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setFeedback({ type: 'error', message: 'Unable to generate signed document preview URL.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to preview document.' })
    } finally {
      setFetchingDocUrl(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!uploadedDoc) {
      setFeedback({ type: 'error', message: 'Please upload an official venue authorization letter.' })
      return
    }

    if (!termsAccepted || !accurateConfirmed || !authenticConfirmed) {
      setFeedback({
        type: 'error',
        message: 'You must check and accept all organizer accountability declarations.'
      })
      return
    }

    if (!venueName.trim() || !venueAddress.trim() || !repName.trim() || !repDesignation.trim()) {
      setFeedback({ type: 'error', message: 'Please complete all required venue and representative fields.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await submitVerification({
        eventId: event.id,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        representativeName: repName.trim(),
        representativeDesignation: repDesignation.trim(),
        representativeContact: repContact.trim() || undefined,
        eventNameConfirmed: event.name,
        startAtConfirmed: event.start_at || new Date().toISOString(),
        endAtConfirmed: event.end_at || new Date().toISOString(),
        durationHoursConfirmed: event.duration_hours || 24,
        documentStoragePath: uploadedDoc.path,
        documentFilename: uploadedDoc.filename,
        documentFileSize: uploadedDoc.size,
        documentMimeType: uploadedDoc.mimeType,
        termsVersion: CURRENT_TERMS_VERSION,
        acceptedTermsText: ORGANIZER_VERIFICATION_TERMS_TEXT,
        confirmedAccurate: accurateConfirmed,
        confirmedAuthentic: authenticConfirmed
      })

      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Official verification submitted successfully! It is now queued for reviewer inspection.'
        })
        setIsEditing(false)
        await loadVerificationData()
        onVerificationUpdated?.()
      } else {
        setFeedback({ type: 'error', message: res.message })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Submission failed.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const status = verification?.status || 'not_submitted'
  const isPending = status === 'pending_review'
  const isVerified = status === 'verified'
  const isAdditionalInfo = status === 'additional_info_required'
  const isRejected = status === 'rejected'
  const isSuspended = status === 'suspended'
  const isRevoked = status === 'revoked'

  const canEditOrResubmit = !verification || isAdditionalInfo || isRejected || isEditing

  const getStatusBadge = () => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-tint px-3 py-1 text-[0.78rem] font-bold text-sage-ink">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-sage">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            OFFICIALLY VERIFIED
          </span>
        )
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-tint px-3 py-1 text-[0.78rem] font-bold text-[#8a5a10]">
            <span className="h-2 w-2 animate-ping rounded-full bg-amber" />
            PENDING REVIEW
          </span>
        )
      case 'additional_info_required':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-tint px-3 py-1 text-[0.78rem] font-bold text-coral-ink">
            ACTION REQUIRED: ADDITIONAL INFO NEEDED
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-tint px-3 py-1 text-[0.78rem] font-bold text-coral-ink">
            VERIFICATION REJECTED
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-tint px-3 py-1 text-[0.78rem] font-bold text-coral-ink">
            VERIFICATION SUSPENDED
          </span>
        )
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-tint px-3 py-1 text-[0.78rem] font-bold text-coral-ink">
            VERIFICATION REVOKED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-parchment/60 px-3 py-1 text-[0.78rem] font-semibold text-ink-muted">
            NOT SUBMITTED
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-line bg-white shadow-soft">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-cobalt" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Header Card */}
      <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
              Official Hackathon Trust & Compliance
            </p>
            <h2 className="mt-1 font-display text-[1.4rem] font-semibold text-ink">
              Official Hackathon Verification
            </h2>
            <p className="mt-1 max-w-[44rem] text-[0.88rem] text-ink-muted">
              Submit genuine venue authorization documentation and accept organizer accountability terms to establish that this hackathon is officially sanctioned by the venue.
            </p>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Status explanation alerts */}
        {isAdditionalInfo && verification?.clarification_request && (
          <div className="mt-5 rounded-xl border border-coral/30 bg-coral-tint/40 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-coral-ink font-bold">⚠️</span>
              <div>
                <p className="font-semibold text-coral-ink text-[0.88rem]">Reviewer Clarification Request:</p>
                <p className="mt-1 text-[0.85rem] text-ink">{verification.clarification_request}</p>
                <p className="mt-2 text-[0.78rem] text-ink-muted">
                  Please update the required details, attach new or corrected evidence if requested, and re-submit below.
                </p>
              </div>
            </div>
          </div>
        )}

        {isRejected && verification?.rejection_reason && (
          <div className="mt-5 rounded-xl border border-coral/30 bg-coral-tint/40 p-4">
            <p className="font-semibold text-coral-ink text-[0.88rem]">Rejection Reason:</p>
            <p className="mt-1 text-[0.85rem] text-ink">{verification.rejection_reason}</p>
          </div>
        )}

        {isSuspended && verification?.rejection_reason && (
          <div className="mt-5 rounded-xl border border-coral/30 bg-coral-tint/40 p-4">
            <p className="font-semibold text-coral-ink text-[0.88rem]">Verification Suspended:</p>
            <p className="mt-1 text-[0.85rem] text-ink">{verification.rejection_reason}</p>
          </div>
        )}

        {isRevoked && verification?.rejection_reason && (
          <div className="mt-5 rounded-xl border border-coral/30 bg-coral-tint/40 p-4">
            <p className="font-semibold text-coral-ink text-[0.88rem]">Verification Revoked:</p>
            <p className="mt-1 text-[0.85rem] text-ink">{verification.rejection_reason}</p>
          </div>
        )}

        {isVerified && verification && (
          <div className="mt-5 rounded-xl border border-sage/30 bg-sage-tint/30 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-sage text-lg">🛡️</span>
              <div>
                <p className="font-semibold text-sage-ink text-[0.88rem]">Official Verification Granted</p>
                <p className="mt-1 text-[0.85rem] text-ink">
                  {verification?.public_summary || 'Official venue authorization and organizer accountability terms verified by HACKOS verification officers.'}
                </p>
                <p className="mt-2 text-[0.76rem] text-ink-muted">
                  Verified on: <strong>{verification?.verified_at ? new Date(verification.verified_at).toLocaleDateString() : 'Active'}</strong> · Terms Version: <strong>v{verification?.terms_version}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {isPending && (
          <div className="mt-5 rounded-xl border border-amber/30 bg-amber-tint/30 p-4">
            <p className="font-semibold text-[#8a5a10] text-[0.88rem]">Under Review by Verification Officers</p>
            <p className="mt-1 text-[0.84rem] text-ink-soft">
              Your venue authorization letter and accountability declaration are currently being audited by HACKOS reviewers. You will receive an automated notification once reviewed.
            </p>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-[0.88rem] ${
            feedback.type === 'success'
              ? 'border-sage/25 bg-sage-tint text-sage-ink'
              : 'border-coral/25 bg-coral-tint text-coral-ink'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Submitted Verification Summary (When submitted & not editing) */}
      {verification && !canEditOrResubmit && (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[1.1rem] font-semibold text-ink">
              Submitted Authorization Details
            </h3>
            {(isPending || isVerified) && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full border border-line px-3.5 py-1 text-[0.78rem] font-semibold text-ink-soft hover:bg-parchment"
              >
                Update / Replace Evidence
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-[0.86rem]">
            <div className="rounded-xl bg-parchment/50 p-4">
              <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Authorized Venue</p>
              <p className="mt-1 font-semibold text-ink">{verification.venue_name}</p>
              <p className="mt-0.5 text-ink-soft">{verification.venue_address}</p>
            </div>

            <div className="rounded-xl bg-parchment/50 p-4">
              <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Venue Signatory / Representative</p>
              <p className="mt-1 font-semibold text-ink">{verification.representative_name}</p>
              <p className="mt-0.5 text-ink-soft">{verification.representative_designation}</p>
              {verification.representative_contact && (
                <p className="mt-1 text-[0.78rem] text-ink-muted">Contact: {verification.representative_contact}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.74rem] font-bold uppercase text-ink-muted">Uploaded Authorization Document</p>
              <p className="mt-1 font-semibold text-ink">{verification.document_filename} (v{verification.document_version})</p>
              <p className="text-[0.76rem] text-ink-muted">
                {verification.document_file_size ? `${(verification.document_file_size / 1024).toFixed(1)} KB · ` : ''}
                Submitted on {new Date(verification.submitted_at).toLocaleDateString()}
              </p>
            </div>

            <button
              type="button"
              onClick={handlePreviewDocument}
              disabled={fetchingDocUrl}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-cobalt px-4 text-[0.82rem] font-semibold text-white hover:bg-cobalt-deep disabled:opacity-50"
            >
              {fetchingDocUrl ? 'Loading…' : 'Inspect Document ↗'}
            </button>
          </div>
        </div>
      )}

      {/* Submission / Re-submission Form */}
      {canEditOrResubmit && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-6 shadow-soft space-y-6">
          <div className="border-b border-line/80 pb-3">
            <h3 className="font-display text-[1.15rem] font-semibold text-ink">
              {verification ? 'Update / Re-submit Verification' : 'Official Venue Authorization Submission'}
            </h3>
            <p className="mt-0.5 text-[0.84rem] text-ink-muted">
              Complete all details and upload the signed letter issued by the venue.
            </p>
          </div>

          {/* 1. Venue & Signatory Information */}
          <div className="space-y-4">
            <h4 className="text-[0.82rem] font-bold uppercase tracking-[0.14em] text-cobalt">
              1. Venue & Authorized Representative
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[0.82rem] font-semibold text-ink">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology Innovation Centre"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-[0.88rem] focus:border-cobalt focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.82rem] font-semibold text-ink">Official Venue Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Full campus/building address, City, State"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-[0.88rem] focus:border-cobalt focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.82rem] font-semibold text-ink">Signatory Representative Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name of authorized person who signed"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-[0.88rem] focus:border-cobalt focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.82rem] font-semibold text-ink">Representative Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dean of Academic Affairs, Facility Manager"
                  value={repDesignation}
                  onChange={(e) => setRepDesignation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-[0.88rem] focus:border-cobalt focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[0.82rem] font-semibold text-ink">
                  Representative Official Contact (Email or Phone)
                </label>
                <input
                  type="text"
                  placeholder="e.g. dean.facilities@institute.edu or +91-9876543210"
                  value={repContact}
                  onChange={(e) => setRepContact(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-[0.88rem] focus:border-cobalt focus:outline-none"
                />
                <p className="mt-1 text-[0.74rem] text-ink-muted">
                  Private verification field. Never published or displayed to participants.
                </p>

                {domainMatch?.is_approved && (
                  <div className="mt-2.5 rounded-xl border border-sage/40 bg-sage-tint/40 p-3 text-xs text-sage-ink flex items-start gap-2.5">
                    <span className="font-bold text-sm">✓</span>
                    <div>
                      <p className="font-semibold">Recognized National Institution: {domainMatch.institution_name}</p>
                      <p className="mt-0.5 text-[0.72rem] text-ink-muted">
                        Official Domain: <span className="font-mono font-medium">@{domainMatch.matched_domain}</span> · Category: {domainMatch.institution_category}
                      </p>
                    </div>
                  </div>
                )}

                {mailboxScreen?.is_student_signal && (
                  <div className="mt-2.5 rounded-xl border border-amber/40 bg-amber-tint/50 p-3 text-xs text-[#8a5a10] flex items-start gap-2.5">
                    <span className="font-bold text-sm">⚠️</span>
                    <div>
                      <p className="font-semibold">Student / Scholar Pattern Flagged ("{mailboxScreen.local_part}")</p>
                      <p className="mt-0.5 text-[0.72rem]">
                        Official verification requires an administrative mailbox (e.g. estate@, dean@, registrar@). Submissions from student addresses will require manual phone & document verification.
                      </p>
                    </div>
                  </div>
                )}

                {mailboxScreen?.is_admin_signal && !mailboxScreen?.is_student_signal && (
                  <div className="mt-2.5 rounded-xl border border-cobalt/30 bg-cobalt-tint/30 p-2.5 text-xs text-cobalt flex items-center gap-2">
                    <span className="font-bold">✓</span>
                    <span>Administrative mailbox pattern verified ("{mailboxScreen.local_part}@").</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Confirmed Event Parameters */}
          <div className="space-y-3 rounded-xl bg-parchment/40 p-4 text-[0.85rem]">
            <h4 className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
              2. Confirmed Hackathon Parameters (From Event Record)
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <p className="text-ink-muted text-[0.76rem]">Event Title</p>
                <p className="font-semibold text-ink">{event.name}</p>
              </div>
              <div>
                <p className="text-ink-muted text-[0.76rem]">Confirmed Dates</p>
                <p className="font-semibold text-ink">
                  {event.start_at ? new Date(event.start_at).toLocaleDateString() : 'TBA'} to {event.end_at ? new Date(event.end_at).toLocaleDateString() : 'TBA'}
                </p>
              </div>
              <div>
                <p className="text-ink-muted text-[0.76rem]">Duration & Format</p>
                <p className="font-semibold text-ink">
                  {event.duration_hours || 24} Hours · {event.format.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Official Letter Upload */}
          <div className="space-y-3">
            <h4 className="text-[0.82rem] font-bold uppercase tracking-[0.14em] text-cobalt">
              3. Official Venue Authorization Letter Document
            </h4>
            <p className="text-[0.82rem] text-ink-muted">
              Upload the signed authorization letter issued on the venue&apos;s official letterhead (PDF, PNG, JPG, WEBP, up to 20MB).
            </p>

            <div className="flex flex-col gap-3 rounded-xl border border-line p-4 bg-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="text-[0.84rem] file:mr-4 file:rounded-full file:border-0 file:bg-cobalt file:px-4 file:py-1.5 file:text-[0.8rem] file:font-semibold file:text-white hover:file:bg-cobalt-deep"
                />
                {uploadedDoc && (
                  <p className="mt-2 text-[0.78rem] text-sage-ink font-semibold">
                    ✓ Attached: {uploadedDoc.filename} ({(uploadedDoc.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {uploadedDoc && (
                <button
                  type="button"
                  onClick={handlePreviewDocument}
                  disabled={fetchingDocUrl}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line bg-parchment px-4 text-[0.82rem] font-semibold text-ink hover:bg-linen"
                >
                  {fetchingDocUrl ? 'Loading…' : 'Preview Document ↗'}
                </button>
              )}
            </div>
          </div>

          {/* 4. Terms and Accountability Declaration */}
          <div className="space-y-3 rounded-xl border border-line/80 bg-parchment/30 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.82rem] font-bold uppercase tracking-[0.14em] text-ink">
                4. Organizer Accountability Declaration (v{CURRENT_TERMS_VERSION})
              </h4>
              <button
                type="button"
                onClick={() => setShowFullTerms(!showFullTerms)}
                className="text-[0.78rem] font-semibold text-cobalt hover:underline"
              >
                {showFullTerms ? 'Hide Full Terms' : 'Read Full Terms'}
              </button>
            </div>

            {showFullTerms && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-line bg-white p-3 font-mono text-[0.75rem] text-ink-soft whitespace-pre-line leading-relaxed">
                {ORGANIZER_VERIFICATION_TERMS_TEXT}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <label className="flex items-start gap-2.5 text-[0.84rem] text-ink cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={accurateConfirmed}
                  onChange={(e) => setAccurateConfirmed(e.target.checked)}
                  className="mt-1 rounded border-line text-cobalt focus:ring-cobalt"
                />
                <span>
                  I confirm that all submitted event and venue information is accurate, complete, and truthful.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-[0.84rem] text-ink cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={authenticConfirmed}
                  onChange={(e) => setAuthenticConfirmed(e.target.checked)}
                  className="mt-1 rounded border-line text-cobalt focus:ring-cobalt"
                />
                <span>
                  I declare that the submitted authorization letter is authentic, genuine, and issued by an authorized representative of the stated venue with explicit permission to host the event.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-[0.84rem] text-ink cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 rounded border-line text-cobalt focus:ring-cobalt"
                />
                <span>
                  I accept operational responsibility for conducting the hackathon and agree to the <strong>HACKOS Verification & Accountability Terms (v1.0)</strong>.
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {verification && isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-line px-5 py-2 text-[0.84rem] font-semibold text-ink-muted hover:bg-parchment"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cobalt px-6 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit for Official Verification'}
            </button>
          </div>
        </form>
      )}

      {/* Verification Audit Trail Section */}
      {auditLogs.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <h3 className="font-display text-[1.1rem] font-semibold text-ink">
            Verification Audit Trail ({auditLogs.length})
          </h3>
          <p className="mt-0.5 text-[0.8rem] text-ink-muted">
            Append-only chronological record of all verification submissions, reviews, and status changes.
          </p>

          <div className="mt-4 divide-y divide-line/70">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 text-[0.82rem]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink uppercase tracking-wide">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[0.76rem] text-ink-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                {log.reason && (
                  <p className="mt-1 text-ink-soft">
                    <strong>Note/Reason:</strong> {log.reason}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3 text-[0.76rem] text-ink-muted">
                  {log.previous_status && log.new_status && (
                    <span>
                      Status: <strong>{log.previous_status}</strong> → <strong>{log.new_status}</strong>
                    </span>
                  )}
                  {log.document_version && (
                    <span>Doc Version: <strong>v{log.document_version}</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
