import { useState, useEffect } from 'react'
import type { PublicHackathonVerification } from '../../types/database'
import { fetchPublicVerification, getSignedVerificationDocUrl } from '../../services/verificationService'

export interface PublicVerificationBadgeProps {
  eventId: string
  verificationStatus?: string | null
  venueName?: string | null
  venueLocation?: string | null
  verifiedAt?: string | null
  compact?: boolean
  showUnverified?: boolean
}

export function PublicVerificationBadge({
  eventId,
  verificationStatus,
  venueName,
  venueLocation,
  verifiedAt,
  compact = false,
  showUnverified = false
}: PublicVerificationBadgeProps) {
  const [details, setDetails] = useState<PublicHackathonVerification | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [publicDocUrl, setPublicDocUrl] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  const isVerified = verificationStatus === 'verified'
  const isPending = verificationStatus === 'pending_review'
  const isNeedsInfo = verificationStatus === 'additional_info_required'
  const isRejected = verificationStatus === 'rejected' || verificationStatus === 'revoked' || verificationStatus === 'suspended'

  useEffect(() => {
    if (isVerified && eventId) {
      fetchPublicVerification(eventId).then((data) => {
        if (data) setDetails(data)
      })
    }
  }, [eventId, isVerified])

  const handleOpenVerifiedModal = async () => {
    setShowModal(true)
    if (details?.letter_public && details?.public_document_path && !publicDocUrl) {
      setLoadingDoc(true)
      try {
        const url = await getSignedVerificationDocUrl(details.public_document_path)
        setPublicDocUrl(url)
      } catch (err) {
        console.error('Error fetching public doc url:', err)
      } finally {
        setLoadingDoc(false)
      }
    }
  }

  // If not verified and showUnverified is false, return null
  if (!isVerified && !showUnverified) {
    return null
  }

  // 1. VERIFIED STATE
  if (isVerified) {
    if (compact) {
      return (
        <>
          <button
            type="button"
            onClick={handleOpenVerifiedModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-sage-tint/90 border border-sage/40 px-2.5 py-0.5 text-[0.7rem] font-bold text-sage-ink hover:bg-sage-tint transition-all shadow-2xs hover:scale-[1.02]"
            title="Click to view official venue authorization certificate"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-sage">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            OFFICIALLY VERIFIED
          </button>

          {showModal && (
            <VerificationSummaryModal
              details={details || {
                event_id: eventId,
                verification_status: 'verified',
                venue_name: venueName || 'Authorized Official Venue',
                venue_address: venueLocation || 'Physical Venue Premises Verified',
                verified_at: verifiedAt || null,
                public_summary: 'This hackathon has completed the official HACKOS anti-fraud venue authorization procedure. Verification officers audited the official authorization letter, dates, and organizer accountability terms.',
                letter_public: false,
                public_document_path: null
              }}
              onClose={() => setShowModal(false)}
              publicDocUrl={publicDocUrl}
              loadingDoc={loadingDoc}
            />
          )}
        </>
      )
    }

    return (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-sage/40 bg-sage-tint/40 p-3.5 text-[0.84rem] shadow-soft">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-white shadow-xs">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sage-ink text-[0.86rem]">Officially Verified Hackathon</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-bold text-sage-ink border border-sage/30 shadow-2xs">
                  ✓ Authorized Venue
                </span>
              </div>
              <p className="text-[0.78rem] text-ink-soft">
                Official venue authorization letter, dates, and organizer accountability terms reviewed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenVerifiedModal}
            className="self-start sm:self-center shrink-0 rounded-full border border-sage/40 bg-white px-3.5 py-1 text-[0.78rem] font-bold text-sage-ink hover:bg-sage-tint transition-all shadow-2xs hover:scale-[1.02]"
          >
            View Certificate ↗
          </button>
        </div>

        {showModal && (
          <VerificationSummaryModal
            details={details || {
              event_id: eventId,
              verification_status: 'verified',
              venue_name: venueName || 'Authorized Official Venue',
              venue_address: venueLocation || 'Physical Venue Premises Verified',
              verified_at: verifiedAt || null,
              public_summary: 'This hackathon has completed the official HACKOS anti-fraud venue authorization procedure. Verification officers audited the official authorization letter, dates, and organizer accountability terms.',
              letter_public: false,
              public_document_path: null
            }}
            onClose={() => setShowModal(false)}
            publicDocUrl={publicDocUrl}
            loadingDoc={loadingDoc}
          />
        )}
      </>
    )
  }

  // 2. UNVERIFIED / PENDING STATES (when showUnverified is true)
  const statusLabel = isPending
    ? 'Verification Pending Review'
    : isNeedsInfo
    ? 'Verification Needs Info'
    : isRejected
    ? 'Verification Flagged'
    : 'Unverified / Self-Reported'

  const statusBg = isPending || isNeedsInfo
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : isRejected
    ? 'bg-coral-tint border-coral/30 text-coral-ink'
    : 'bg-linen border-line text-ink-muted'

  const iconColor = isPending || isNeedsInfo
    ? 'text-amber-600'
    : isRejected
    ? 'text-coral'
    : 'text-ink-muted'

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold transition-all hover:opacity-90 ${statusBg}`}
          title="Click to learn about official HACKOS verification status"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${iconColor} ${isPending ? 'animate-pulse bg-amber-500' : 'bg-current'}`} />
          {statusLabel.toUpperCase()}
        </button>

        {showInfoModal && (
          <UnverifiedInfoModal
            status={verificationStatus || 'not_submitted'}
            onClose={() => setShowInfoModal(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-3.5 text-[0.84rem] ${statusBg}`}>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/80 text-ink shadow-xs">
            {isPending ? (
              <span className="text-[1rem]">⏳</span>
            ) : isRejected ? (
              <span className="text-[1rem] text-coral">✕</span>
            ) : (
              <span className="text-[0.9rem] text-ink-muted">ℹ</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[0.86rem]">{statusLabel}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[0.68rem] font-semibold text-ink-muted border border-line/40">
                Official Procedure
              </span>
            </div>
            <p className="text-[0.78rem] text-ink-soft">
              {isPending
                ? 'Official venue authorization letter submitted; currently under audit by HACKOS verification officers.'
                : isNeedsInfo
                ? 'Clarifications requested by HACKOS officers from the organizer regarding venue booking.'
                : isRejected
                ? 'Verification was flagged, rejected, or revoked by HACKOS verification officers.'
                : 'This hackathon has not submitted official venue authorization proof yet. Attendees should exercise due diligence.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="self-start sm:self-center shrink-0 rounded-full border border-line bg-white px-3.5 py-1 text-[0.78rem] font-semibold text-ink hover:bg-parchment transition-all shadow-2xs"
        >
          Verification Policy ℹ
        </button>
      </div>

      {showInfoModal && (
        <UnverifiedInfoModal
          status={verificationStatus || 'not_submitted'}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </>
  )
}

/**
 * Dedicated Venue Verification Badge
 * Shows whether the physical venue is officially authorized or if the event is online
 */
export function VenueVerificationBadge({
  format,
  venue,
  venueName,
  venueCity,
  isVenueVerified,
  compact = false
}: {
  format?: string | null
  venue?: {
    venue_name?: string | null
    city?: string | null
    state?: string | null
    verification_status?: string | null
  } | null
  venueName?: string | null
  venueCity?: string | null
  isVenueVerified?: boolean
  compact?: boolean
}) {
  const isOnline = format?.toLowerCase() === 'online'
  const vName = venue?.venue_name || venueName
  const vCity = venue?.city || venueCity
  const verified = isVenueVerified || venue?.verification_status === 'verified'

  if (isOnline) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-cobalt-tint/80 border border-cobalt/30 px-2 py-0.5 text-[0.7rem] font-medium text-cobalt-deep" title="Virtual online event - No physical venue required">
          <span>🌐</span> Online Event
        </span>
      )
    }
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-cobalt/25 bg-cobalt-tint/50 px-2.5 py-1 text-[0.78rem] text-cobalt-deep">
        <span>🌐</span>
        <span>Virtual Venue (Online Hackathon)</span>
      </div>
    )
  }

  if (verified && vName) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sage-tint border border-sage/40 px-2 py-0.5 text-[0.7rem] font-bold text-sage-ink" title={`Verified Venue: ${vName}${vCity ? `, ${vCity}` : ''}`}>
          <span>🏛️</span> Verified: {vName.length > 20 ? `${vName.slice(0, 18)}…` : vName}
        </span>
      )
    }
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-sage/40 bg-sage-tint/60 px-2.5 py-1 text-[0.78rem] font-medium text-sage-ink">
        <span className="text-sage">🏛️</span>
        <span>
          <strong>Authorized Venue:</strong> {vName}{vCity ? `, ${vCity}` : ''}
        </span>
        <span className="rounded-full bg-sage px-1.5 py-0.2 text-[0.65rem] font-bold text-white">✓ VERIFIED</span>
      </div>
    )
  }

  if (vName) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[0.7rem] font-medium text-amber-900" title={`Venue pending authorization: ${vName}`}>
          <span>⏳</span> Venue: {vName.length > 18 ? `${vName.slice(0, 16)}…` : vName}
        </span>
      )
    }
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.78rem] text-amber-900">
        <span>📍</span>
        <span>Venue: <strong>{vName}</strong> (Pending Formal Authorization)</span>
      </div>
    )
  }

  // No venue provided
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-parchment border border-line px-2 py-0.5 text-[0.7rem] text-ink-muted">
        <span>📍</span> Venue TBD
      </span>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-parchment/60 px-2.5 py-1 text-[0.78rem] text-ink-muted">
      <span>📍</span>
      <span>Physical Venue TBD / Not Provided</span>
    </div>
  )
}

/**
 * Modal showing complete official verification certificate
 */
export function VerificationSummaryModal({
  details,
  onClose,
  publicDocUrl,
  loadingDoc
}: {
  details: PublicHackathonVerification | null
  onClose: () => void
  publicDocUrl: string | null
  loadingDoc: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {loadingDoc ? <p className="text-[0.8rem] font-semibold text-ink-muted">Loading official document…</p> : null}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted hover:text-ink text-lg font-bold p-1 rounded-lg hover:bg-parchment"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sage-tint text-sage shadow-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-sage-ink">
              Official HACKOS Verification Certificate
            </span>
            <h3 className="font-display text-[1.25rem] font-semibold text-ink">
              Verified Hackathon & Venue Authorization
            </h3>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-[0.85rem]">
          <div className="rounded-xl bg-sage-tint/30 border border-sage/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.72rem] font-bold uppercase text-sage-ink">Authorized Venue</p>
              <span className="rounded-full bg-sage px-2 py-0.5 text-[0.68rem] font-bold text-white">
                ✓ VENUE VERIFIED
              </span>
            </div>
            <p className="mt-1 font-display text-[1.05rem] font-semibold text-ink">{details?.venue_name || 'Authorized Official Venue'}</p>
            {details?.venue_address && (
              <p className="text-[0.8rem] text-ink-soft mt-0.5">{details.venue_address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-[0.82rem]">
            <div className="rounded-xl border border-line bg-parchment/40 p-3">
              <p className="text-[0.72rem] text-ink-muted">Verification Status</p>
              <p className="font-bold text-sage flex items-center gap-1 mt-0.5">
                <span>✓</span> Officially Verified
              </p>
            </div>
            <div className="rounded-xl border border-line bg-parchment/40 p-3">
              <p className="text-[0.72rem] text-ink-muted">Verified Date</p>
              <p className="font-semibold text-ink mt-0.5">
                {details?.verified_at ? new Date(details.verified_at).toLocaleDateString() : 'Active Review Passed'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line/80 bg-white p-4 shadow-2xs">
            <h4 className="font-semibold text-ink text-[0.86rem]">Official Procedure & Accountability Check</h4>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-soft">
              {details?.public_summary ||
                'This hackathon has completed the official HACKOS anti-fraud venue authorization procedure. Verification officers audited an authentic authorization letter from the venue and an organizer accountability declaration.'}
            </p>
            <ul className="mt-3 space-y-1.5 text-[0.78rem] text-ink-muted">
              <li className="flex items-center gap-1.5"><span className="text-sage font-bold">✓</span> Official venue authorization letter reviewed</li>
              <li className="flex items-center gap-1.5"><span className="text-sage font-bold">✓</span> Venue identity, physical capacity, and dates confirmed</li>
              <li className="flex items-center gap-1.5"><span className="text-sage font-bold">✓</span> Organizer accepted operational accountability declaration (v1.0)</li>
              <li className="flex items-center gap-1.5"><span className="text-sage font-bold">✓</span> Anti-fraud benchmarks verified by HACKOS Trust Officers</li>
            </ul>
          </div>

          {details?.letter_public && (
            <div className="rounded-xl border border-sage/30 bg-sage-tint/30 p-3.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sage-ink text-[0.82rem]">Official Authorization Document</p>
                <p className="text-[0.74rem] text-ink-muted">Publicly certified venue letter</p>
              </div>
              {loadingDoc ? (
                <span className="text-[0.78rem] text-ink-muted">Loading preview…</span>
              ) : publicDocUrl ? (
                <a
                  href={publicDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-sage px-3.5 py-1 text-[0.78rem] font-semibold text-white hover:bg-sage-ink shadow-2xs"
                >
                  Inspect Letter ↗
                </a>
              ) : (
                <span className="text-[0.78rem] text-ink-muted">Document archive sealed</span>
              )}
            </div>
          )}

          {!details?.letter_public && (
            <div className="rounded-xl bg-parchment/60 border border-line/60 p-3 text-[0.75rem] text-ink-muted">
              🔒 <em>Original authorization documents, administrative email domains, and signer credentials are archived securely by HACKOS verification officers for participant protection.</em>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-cobalt px-5 py-2 text-[0.84rem] font-semibold text-white hover:bg-cobalt-deep shadow-soft"
          >
            Close Certificate
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal explaining the HACKOS Anti-Fraud Verification Procedure for pending/unverified events
 */
function UnverifiedInfoModal({
  status,
  onClose
}: {
  status: string
  onClose: () => void
}) {
  const isPending = status === 'pending_review'
  const isNeedsInfo = status === 'additional_info_required'
  const isRejected = status === 'rejected' || status === 'revoked'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted hover:text-ink text-lg font-bold p-1 rounded-lg hover:bg-parchment"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800 shadow-xs">
            {isPending ? '⏳' : isRejected ? '✕' : '🛡️'}
          </div>
          <div>
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
              HACKOS Anti-Fraud & Trust Standard
            </span>
            <h3 className="font-display text-[1.25rem] font-semibold text-ink">
              Official Hackathon & Venue Verification
            </h3>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-[0.85rem]">
          <div className="rounded-xl bg-parchment/60 border border-line/80 p-4">
            <p className="text-[0.72rem] font-bold uppercase text-ink-muted">Current Verification Status</p>
            <p className="mt-1 font-display text-[1.1rem] font-semibold text-ink">
              {isPending
                ? '⏳ Verification Review in Progress'
                : isNeedsInfo
                ? '⚠️ Clarification Requested from Organizer'
                : isRejected
                ? '✕ Verification Flagged or Revoked'
                : '⚠️ Self-Reported / Unverified Hackathon'}
            </p>
            <p className="mt-1 text-[0.82rem] text-ink-soft">
              {isPending
                ? 'The organizer has submitted venue authorization documents. HACKOS verification officers are actively auditing the letter, dates, and venue representative.'
                : isNeedsInfo
                ? 'Verification officers requested additional supporting evidence from the organizers to validate venue booking.'
                : isRejected
                ? 'This event did not meet HACKOS anti-fraud standards or venue authorization was withdrawn.'
                : 'The organizer has not submitted official venue authorization documentation for verification yet.'}
            </p>
          </div>

          <div className="rounded-xl border border-line/80 bg-white p-4">
            <h4 className="font-semibold text-ink text-[0.88rem]">What is the Official HACKOS Procedure?</h4>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-soft">
              To prevent phantom events, fraudulent fee collection, and unauthorized venue usage, HACKOS enforces a multi-step official procedure:
            </p>
            <ol className="mt-3 space-y-2 text-[0.8rem] text-ink-soft list-decimal pl-4">
              <li>
                <strong>Official Authorization Letter:</strong> The organizer must provide a signed letter on official venue letterhead from an authorized administrative representative.
              </li>
              <li>
                <strong>Identity & Domain Screening:</strong> The representative’s institutional email domain is screened against official educational and municipal registries.
              </li>
              <li>
                <strong>Organizer Accountability Declaration (v1.0):</strong> Organizers sign a binding legal statement accepting sole operational responsibility and agreeing not to misrepresent sponsorships or facilities.
              </li>
              <li>
                <strong>Trust Officer Audit:</strong> Independent HACKOS verification officers manually review and approve the event before granting the Official Verification Certificate.
              </li>
            </ol>
          </div>

          <div className="rounded-xl bg-cobalt-tint/40 border border-cobalt/25 p-3.5 text-[0.8rem] text-cobalt-deep">
            💡 <strong>Participant Safety Tip:</strong> For offline events that are unverified, participants are advised to verify details independently before booking travel or paying non-refundable fees.
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-cobalt px-5 py-2 text-[0.84rem] font-semibold text-white hover:bg-cobalt-deep shadow-soft"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
