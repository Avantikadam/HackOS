import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import {
  fetchEventDetails,
  updateEvent,
  deleteEvent,
  publishEvent,
  fetchRounds,
  saveRound,
  deleteRound,
  fetchAnnouncements,
  createAnnouncement
} from '../../services/eventService'
import {
  fetchVerifiedVenues,
  createVenueRequest,
  fetchQuotationByRequest,
  updateQuotationStatus,
  fetchAgreementByRequest
} from '../../services/venueService'
import {
  fetchEventApplications,
  updateApplicationStatus,
  updatePaymentStatus
} from '../../services/participantService'
import {
  fetchCriteria,
  saveCriterion,
  deleteCriterion,
  fetchScores,
  submitScore,
  calculateAndPublishResults,
  fetchPublishedResults
} from '../../services/judgingService'
import { generateAuthorizationPdf } from '../../utils/pdfGenerator'
import { OrganizerVerificationSection } from '../../components/verification/OrganizerVerificationSection'
import type {
  Event,
  EventRound,
  EventAnnouncement,
  Venue,
  VenueRequest,
  VenueQuotation,
  VenueAgreement,
  Application,
  JudgingCriterion,
  JudgingScore,
  EventResult
} from '../../types/database'

function QrIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12h2v2h-2zM15 15h2v2h-2z" fill="currentColor"/></svg>
}

const NAV_ITEMS = [
  { label: 'Overview', href: '/organizer', icon: <HomeIcon /> },
  { label: 'Create Event', href: '/organizer/events/new', icon: <PlusIcon /> },
  { label: 'Venue Requests', href: '/organizer/venues', icon: <BuildingIcon /> },
  { label: 'Gate Scanner', href: '/scanner', icon: <QrIcon /> },
]

function HomeIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2.5 8 10 2l7.5 6V17a1 1 0 0 1-1 1H13v-5H7v5H3.5a1 1 0 0 1-1-1V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function PlusIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}
function BuildingIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 17V9h6v8M7 6h2M11 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

type TabType = 'overview' | 'verification' | 'venue' | 'schedule' | 'teams' | 'judging'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Edit Event state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDuration, setEditDuration] = useState(24)
  const [editFee, setEditFee] = useState(0)
  const [editMinTeam, setEditMinTeam] = useState(2)
  const [editMaxTeam, setEditMaxTeam] = useState(4)
  const [editMaxParticipants, setEditMaxParticipants] = useState(250)
  const [savingEdit, setSavingEdit] = useState(false)

  // Sub-data states
  const [rounds, setRounds] = useState<EventRound[]>([])
  const [newRoundName, setNewRoundName] = useState('')
  const [newRoundDesc, setNewRoundDesc] = useState('')

  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([])
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnBody, setNewAnnBody] = useState('')
  const [submittingAnn, setSubmittingAnn] = useState(false)

  const [verifiedVenues, setVerifiedVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState('')
  const [venueRequest, setVenueRequest] = useState<VenueRequest | null>(null)
  const [quotation, setQuotation] = useState<VenueQuotation | null>(null)
  const [agreement, setAgreement] = useState<VenueAgreement | null>(null)

  const [applications, setApplications] = useState<Application[]>([])

  const [criteria, setCriteria] = useState<JudgingCriterion[]>([])
  const [newCritName, setNewCritName] = useState('')
  const [newCritWeight, setNewCritWeight] = useState(25)
  const [scores, setScores] = useState<JudgingScore[]>([])
  const [results, setResults] = useState<EventResult[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!eventId) return
    loadAll()
  }, [eventId])

  const loadAll = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const ev = await fetchEventDetails(eventId)
      setEvent(ev)

      if (ev) {
        setEditName(ev.name)
        setEditDesc(ev.description || '')
        setEditDuration(ev.duration_hours || 24)
        setEditFee(ev.registration_fee || 0)
        setEditMinTeam(ev.minimum_team_size || 2)
        setEditMaxTeam(ev.maximum_team_size || 4)
        setEditMaxParticipants(ev.maximum_participants || 250)

        const [r, ann, appList, critList, scoreList, resList, venues] = await Promise.all([
          fetchRounds(eventId),
          fetchAnnouncements(eventId),
          fetchEventApplications(eventId),
          fetchCriteria(eventId),
          fetchScores(eventId),
          fetchPublishedResults(eventId),
          fetchVerifiedVenues()
        ])

        setRounds(r)
        setAnnouncements(ann)
        setApplications(appList)
        setCriteria(critList)
        setScores(scoreList)
        setResults(resList)
        setVerifiedVenues(venues)

        if (ev.venue_request) {
          setVenueRequest(ev.venue_request)
          const q = await fetchQuotationByRequest(ev.venue_request.id)
          setQuotation(q)
          const agr = await fetchAgreementByRequest(ev.venue_request.id)
          setAgreement(agr)
        }
      }
    } catch (err) {
      console.error('Failed to load event data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Event Publication (Enforces Rule 1)
  const handlePublish = async () => {
    if (!eventId) return
    setFeedback(null)
    const res = await publishEvent(eventId)
    if (res.success) {
      setFeedback({ type: 'success', message: res.message })
      if (res.event) setEvent(res.event)
    } else {
      setFeedback({ type: 'error', message: res.message })
    }
  }

  const handleDeleteEvent = async () => {
    if (!eventId) return
    await deleteEvent(eventId)
    navigate('/organizer')
  }

  // Edit Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId) return
    setSavingEdit(true)
    setFeedback(null)
    try {
      const updated = await updateEvent(eventId, {
        name: editName.trim(),
        description: editDesc.trim(),
        duration_hours: Number(editDuration),
        registration_fee: Number(editFee),
        minimum_team_size: Number(editMinTeam),
        maximum_team_size: Number(editMaxTeam),
        maximum_participants: Number(editMaxParticipants)
      })
      setEvent(updated)
      setIsEditing(false)
      setFeedback({ type: 'success', message: 'Event details updated successfully.' })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update event.' })
    } finally {
      setSavingEdit(false)
    }
  }

  // Toggle Registration Open/Close
  const handleToggleRegistration = async () => {
    if (!eventId || !event) return
    setFeedback(null)
    try {
      const isCurrentlyClosed = Boolean(
        event.registration_close_at && new Date(event.registration_close_at) <= new Date()
      )
      const newClose = isCurrentlyClosed ? null : new Date().toISOString()
      const updated = await updateEvent(eventId, { registration_close_at: newClose as any })
      setEvent(updated)
      setFeedback({
        type: 'success',
        message: isCurrentlyClosed
          ? 'Registration is now re-opened for new participants.'
          : 'Registration has been officially closed.'
      })
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to update registration status.' })
    }
  }

  // Rounds
  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId || !newRoundName.trim()) return
    await saveRound({
      event_id: eventId,
      name: newRoundName.trim(),
      description: newRoundDesc.trim(),
      sequence_number: rounds.length + 1,
      round_type: 'offline'
    })
    setNewRoundName('')
    setNewRoundDesc('')
    const r = await fetchRounds(eventId)
    setRounds(r)
  }

  const handleDeleteRound = async (id: string) => {
    if (!eventId) return
    await deleteRound(id)
    const r = await fetchRounds(eventId)
    setRounds(r)
  }

  // Announcements
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId || !user || !newAnnTitle.trim() || !newAnnBody.trim()) return
    setSubmittingAnn(true)
    try {
      await createAnnouncement({
        event_id: eventId,
        title: newAnnTitle.trim(),
        body: newAnnBody.trim(),
        created_by: user.id
      })
      setNewAnnTitle('')
      setNewAnnBody('')
      const ann = await fetchAnnouncements(eventId)
      setAnnouncements(ann)
      setFeedback({ type: 'success', message: 'Announcement broadcasted to participants.' })
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to post announcement.' })
    } finally {
      setSubmittingAnn(false)
    }
  }

  // Venue Request
  const handleSubmitVenueRequest = async () => {
    if (!eventId || !user || !selectedVenueId || !event) return
    setFeedback(null)
    try {
      const start = event.start_at || new Date().toISOString()
      const end = event.end_at || new Date(Date.now() + 48 * 3600000).toISOString()
      const vr = await createVenueRequest({
        event_id: eventId,
        venue_id: selectedVenueId,
        organizer_id: user.id,
        requested_start: start,
        requested_end: end,
        expected_participants: event.maximum_participants || 250,
        notes: `Venue booking request for ${event.name}`
      })
      setVenueRequest(vr)
      setFeedback({ type: 'success', message: 'Venue request submitted to venue authority successfully!' })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to submit request.' })
    }
  }

  const handleQuotationDecision = async (status: 'accepted' | 'rejected') => {
    if (!quotation || !venueRequest) return
    await updateQuotationStatus(quotation.id, venueRequest.id, status)
    const q = await fetchQuotationByRequest(venueRequest.id)
    setQuotation(q)
    const agr = await fetchAgreementByRequest(venueRequest.id)
    setAgreement(agr)
    setFeedback({
      type: 'success',
      message: status === 'accepted' ? 'Quotation accepted! Venue agreement is now awaiting OTP authorization from the venue authority.' : 'Quotation rejected.'
    })
  }

  // Judging Criteria & Results
  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId || !newCritName.trim()) return
    await saveCriterion({
      event_id: eventId,
      name: newCritName.trim(),
      weight: Number(newCritWeight) || 20,
      sequence_number: criteria.length + 1
    })
    setNewCritName('')
    setNewCritWeight(20)
    const c = await fetchCriteria(eventId)
    setCriteria(c)
  }

  const handleDeleteCriterion = async (id: string) => {
    if (!eventId) return
    await deleteCriterion(id)
    const c = await fetchCriteria(eventId)
    setCriteria(c)
  }

  const handleScoreChange = async (teamId: string, criterionId: string, val: number) => {
    if (!eventId || !user) return
    await submitScore({
      event_id: eventId,
      team_id: teamId,
      criterion_id: criterionId,
      score: val,
      entered_by: user.id
    })
    const sc = await fetchScores(eventId)
    setScores(sc)
  }

  const handlePublishResults = async () => {
    if (!eventId) return
    setFeedback(null)
    const res = await calculateAndPublishResults(eventId)
    if (res.success) {
      setFeedback({ type: 'success', message: res.message })
      if (res.results) setResults(res.results)
    } else {
      setFeedback({ type: 'error', message: res.message })
    }
  }

  if (loading) {
    return (
      <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
        </div>
      </DashboardLayout>
    )
  }

  if (!event) {
    return (
      <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
          <p className="text-ink-muted">Event not found.</p>
          <Link to="/organizer" className="mt-4 inline-block font-semibold text-cobalt">Back to Organizer Overview</Link>
        </div>
      </DashboardLayout>
    )
  }

  const totalCriteriaWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0)
  const isRegClosed = Boolean(event.registration_close_at && new Date(event.registration_close_at) <= new Date())

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Organizer" roleColor="coral">
      <div className="max-w-[64rem]">
        {/* Breadcrumb & Title */}
        <div className="mb-2 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/organizer" className="hover:text-ink">Organizer</Link>
          <span>/</span>
          <span className="font-medium text-ink">{event.name}</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-parchment px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink-soft">
                {event.format.toUpperCase()}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${
                event.publication_status === 'published'
                  ? 'bg-sage-tint text-sage font-bold'
                  : 'border border-line bg-white text-cobalt'
              }`}>
                {event.publication_status.replace('_', ' ').toUpperCase()}
              </span>
              {event.verification_status === 'verified' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-tint px-2.5 py-0.5 text-[0.72rem] font-bold text-sage-ink">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-sage">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  VERIFIED HACKATHON
                </span>
              )}
              {isRegClosed && (
                <span className="rounded-full bg-coral-tint px-2.5 py-0.5 text-[0.72rem] font-bold text-coral-ink">
                  REGISTRATION CLOSED
                </span>
              )}
            </div>
            <h1 className="mt-1 font-display text-[1.85rem] font-semibold text-ink">{event.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRegistration}
              className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-[0.84rem] font-semibold text-ink-soft hover:bg-parchment"
            >
              {isRegClosed ? 'Re-open Registration' : 'Close Registration'}
            </button>

            {event.publication_status !== 'published' && (
              <button
                type="button"
                onClick={handlePublish}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-sage px-6 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-sage-ink"
              >
                Publish Hackathon
              </button>
            )}

            {event.publication_status === 'draft' && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-coral/40 bg-white px-4 text-[0.84rem] font-semibold text-coral hover:bg-coral-tint"
              >
                Delete Draft
              </button>
            )}
          </div>
        </div>

        {confirmingDelete && (
          <div className="mb-6 rounded-2xl border border-coral/30 bg-coral-tint/30 p-4 text-[0.88rem] text-coral-ink">
            <p className="font-semibold">Delete this draft event?</p>
            <p className="mt-1 text-[0.82rem]">This irreversible action removes the draft event and its dependent configuration records.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-full border border-line bg-white px-4 py-2 text-[0.82rem] font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false)
                  void handleDeleteEvent()
                }}
                className="rounded-full bg-coral px-5 py-2 text-[0.84rem] font-semibold text-white hover:bg-coral-ink"
              >
                Delete Event
              </button>
            </div>
          </div>
        )}

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

        {/* Streamlined Tabs Bar */}
        <div className="mb-6 flex overflow-x-auto border-b border-line/80">
          {(
            [
              ['overview', 'Overview & Readiness'],
              ['verification', `Hackathon Verification${event.verification_status === 'verified' ? ' (✓ Verified)' : ''}`],
              ['venue', 'Venue Approval'],
              ['schedule', `Schedule & Announcements (${rounds.length})`],
              ['teams', `Teams & Payments (${applications.length})`],
              ['judging', 'Judging & Leaderboard']
            ] as const
          ).map(([tId, label]) => (
            <button
              key={tId}
              type="button"
              onClick={() => setActiveTab(tId)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-[0.88rem] font-medium transition-colors ${
                activeTab === tId
                  ? 'border-cobalt font-semibold text-cobalt'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Publication Readiness */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Publication Prerequisites (Rule 1)</h2>
              <p className="mt-1 text-[0.85rem] text-ink-muted">
                Offline and hybrid hackathons cannot be published without verified venue approval and an OTP-accepted agreement.
              </p>

              <ul className="mt-4 divide-y divide-line/70">
                <li className="flex items-center justify-between py-3">
                  <span className="text-[0.88rem] text-ink">Basic event details & dates configured</span>
                  <span className="font-semibold text-sage">✔ Complete</span>
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="text-[0.88rem] text-ink">
                    Venue approval (Format: {event.format})
                  </span>
                  {event.format === 'online' ? (
                    <span className="font-semibold text-sage">✔ Not required (Online)</span>
                  ) : agreement?.agreement_status === 'accepted' ? (
                    <span className="font-semibold text-sage">✔ Verified & OTP Accepted</span>
                  ) : (
                    <span className="font-semibold text-coral">✖ Awaiting Venue Authorization</span>
                  )}
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="text-[0.88rem] text-ink">Schedule rounds configured</span>
                  <span className={rounds.length > 0 ? 'font-semibold text-sage' : 'font-semibold text-amber'}>
                    {rounds.length > 0 ? `✔ ${rounds.length} rounds added` : 'Optional prior to launch'}
                  </span>
                </li>
                <li className="flex items-center justify-between py-3">
                  <div>
                    <span className="text-[0.88rem] text-ink font-medium">Official Venue Authorization & Verification</span>
                    <p className="text-[0.76rem] text-ink-muted">Signed letterhead authorization & accountability declaration</p>
                  </div>
                  <div>
                    {event.verification_status === 'verified' ? (
                      <span className="font-semibold text-sage">✔ Officially Verified</span>
                    ) : event.verification_status === 'pending_review' ? (
                      <span className="font-semibold text-[#8a5a10]">⏳ Under Review</span>
                    ) : event.verification_status === 'additional_info_required' ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('verification')}
                        className="font-semibold text-coral hover:underline text-[0.82rem]"
                      >
                        Action Needed →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('verification')}
                        className="font-semibold text-cobalt hover:underline text-[0.82rem]"
                      >
                        Submit Verification →
                      </button>
                    )}
                  </div>
                </li>
              </ul>

              {event.publication_status === 'published' ? (
                <div className="mt-6 rounded-xl border border-sage/30 bg-sage-tint/50 p-4 text-[0.88rem] text-sage">
                  <strong>🎉 Live in Discovery:</strong> This hackathon is publicly published. Participants can now discover it and apply.
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-between border-t border-line/70 pt-4">
                  <p className="text-[0.82rem] text-ink-muted">
                    {event.format === 'online' || agreement?.agreement_status === 'accepted'
                      ? 'All prerequisites met! You can publish now.'
                      : 'Please complete the venue request and wait for OTP acceptance before publishing.'}
                  </p>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="inline-flex h-10 items-center rounded-full bg-cobalt px-5 text-[0.86rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                  >
                    Publish Hackathon
                  </button>
                </div>
              )}
            </div>

            {/* Official Hackathon Verification */}
            <OrganizerVerificationSection event={event} onVerificationUpdated={loadAll} />

            {/* Event Specs & Quick Edit Card */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <h2 className="font-display text-[1.1rem] font-semibold text-ink">Event Configuration</h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="rounded-full border border-line px-3.5 py-1 text-[0.82rem] font-semibold text-cobalt hover:bg-parchment"
                >
                  {isEditing ? 'Cancel Editing' : 'Edit Details'}
                </button>
              </div>

              {!isEditing ? (
                <div className="mt-4 space-y-4">
                  <p className="text-[0.9rem] text-ink-soft">{event.description || 'No description provided.'}</p>
                  <dl className="grid grid-cols-2 gap-4 text-[0.85rem] sm:grid-cols-4">
                    <div>
                      <dt className="text-ink-muted">Team Size</dt>
                      <dd className="font-semibold text-ink">{event.minimum_team_size}–{event.maximum_team_size} members</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Max Capacity</dt>
                      <dd className="font-semibold text-ink">{event.maximum_participants || 250} participants</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Registration Fee</dt>
                      <dd className="font-semibold text-ink">{event.registration_fee > 0 ? `₹${event.registration_fee}` : 'Free'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Duration</dt>
                      <dd className="font-semibold text-ink">{event.duration_hours || 24} hours</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <form onSubmit={handleSaveEvent} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-[0.82rem] font-semibold text-ink mb-1">Event Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.82rem] font-semibold text-ink mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[0.8rem] font-semibold text-ink mb-1">Duration (hrs)</label>
                      <input
                        type="number"
                        value={editDuration}
                        onChange={(e) => setEditDuration(Number(e.target.value))}
                        className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.8rem] font-semibold text-ink mb-1">Fee (₹)</label>
                      <input
                        type="number"
                        value={editFee}
                        onChange={(e) => setEditFee(Number(e.target.value))}
                        className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.8rem] font-semibold text-ink mb-1">Min Team Size</label>
                      <input
                        type="number"
                        min="1"
                        value={editMinTeam}
                        onChange={(e) => setEditMinTeam(Number(e.target.value))}
                        className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.8rem] font-semibold text-ink mb-1">Max Team Size</label>
                      <input
                        type="number"
                        min="1"
                        value={editMaxTeam}
                        onChange={(e) => setEditMaxTeam(Number(e.target.value))}
                        className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-full border border-line bg-white px-4 py-2 text-[0.84rem] font-semibold text-ink-muted hover:bg-parchment"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="rounded-full bg-cobalt px-5 py-2 text-[0.84rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
                    >
                      {savingEdit ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab: Hackathon Verification & Accountability */}
        {activeTab === 'verification' && (
          <OrganizerVerificationSection event={event} onVerificationUpdated={loadAll} />
        )}

        {/* Tab 2: Venue Approval Workflow */}
        {activeTab === 'venue' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Venue Coordination & Quotations</h2>

              {!venueRequest ? (
                <div className="mt-4 space-y-4">
                  <p className="text-[0.88rem] text-ink-muted">
                    Select a verified venue to submit a booking request for this event:
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="flex-1 rounded-xl border border-line px-3 py-2.5 text-[0.9rem] text-ink"
                    >
                      <option value="">-- Choose from Verified Venues --</option>
                      {verifiedVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.venue_name} ({v.city}, {v.state}) · Capacity {v.capacity}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedVenueId}
                      onClick={handleSubmitVenueRequest}
                      className="rounded-full bg-cobalt px-5 py-2.5 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
                    >
                      Submit Booking Request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  {/* Status header */}
                  <div className="flex items-center justify-between rounded-xl bg-parchment/60 p-4">
                    <div>
                      <p className="text-[0.76rem] font-bold uppercase tracking-wider text-ink-muted">Booking Request Status</p>
                      <p className="mt-0.5 text-[1rem] font-semibold text-ink">
                        {venueRequest.request_status.toUpperCase()}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[0.8rem] font-medium text-ink shadow-sm">
                      {venueRequest.venue?.venue_name || 'Selected Venue'}
                    </span>
                  </div>

                  {/* Quotation card */}
                  {quotation && (
                    <div className="rounded-xl border border-line p-5">
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <h3 className="font-semibold text-ink">Itemized Quotation (v{quotation.version})</h3>
                        <span className="text-[0.8rem] font-semibold uppercase text-cobalt">
                          {quotation.quotation_status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {quotation.itemized_costs.map((item, i) => (
                          <div key={i} className="flex justify-between text-[0.88rem]">
                            <span className="text-ink-soft">{item.item}</span>
                            <span className="font-semibold text-ink">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-between border-t border-line pt-3 text-[1rem] font-bold text-ink">
                        <span>Total Quotation:</span>
                        <span className="font-display text-[1.2rem] text-cobalt">
                          ₹{Number(quotation.total_amount).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {quotation.quotation_status === 'submitted' && (
                        <div className="mt-5 flex gap-3 border-t border-line pt-4">
                          <button
                            type="button"
                            onClick={() => handleQuotationDecision('accepted')}
                            className="rounded-full bg-sage px-5 py-2 text-[0.86rem] font-semibold text-white hover:bg-sage-ink"
                          >
                            Accept Quotation
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuotationDecision('rejected')}
                            className="rounded-full border border-line bg-white px-5 py-2 text-[0.86rem] font-semibold text-coral hover:bg-coral-tint"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agreement Card */}
                  {agreement && (
                    <div className="rounded-xl border border-sage/30 bg-sage-tint/20 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-ink">Venue Authorization Agreement</h3>
                          <p className="text-[0.82rem] text-ink-muted">
                            Status: <strong className="text-sage">{agreement.agreement_status.toUpperCase()}</strong>
                          </p>
                        </div>
                        {agreement.agreement_status === 'accepted' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (quotation && venueRequest?.venue) {
                                generateAuthorizationPdf({
                                  agreement,
                                  quotation,
                                  venue: venueRequest.venue,
                                  event
                                })
                              }
                            }}
                            className="rounded-full bg-cobalt px-4 py-2 text-[0.82rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                          >
                            Download Authorization PDF
                          </button>
                        )}
                      </div>

                      {agreement.agreement_status === 'accepted' && (
                        <p className="mt-3 text-[0.82rem] text-sage">
                          ✔ Verified by venue representative with cryptographic OTP on {new Date(agreement.otp_verified_at || '').toLocaleDateString()}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Schedule & Announcements */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Rounds Section */}
            <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Event Rounds & Timeline</h2>
              <p className="mt-1 text-[0.84rem] text-ink-muted">Define the sequential stages and deadlines of the hackathon.</p>

              <form onSubmit={handleAddRound} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  placeholder="Round Name (e.g. Mentor Checkpoint)"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  className="rounded-xl border border-line px-3 py-2 text-[0.88rem] sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Short Instructions / Milestones"
                  value={newRoundDesc}
                  onChange={(e) => setNewRoundDesc(e.target.value)}
                  className="rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                />
                <button
                  type="submit"
                  className="rounded-full bg-cobalt px-4 py-2 text-[0.85rem] font-semibold text-white hover:bg-cobalt-deep"
                >
                  Add Round
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {rounds.length === 0 ? (
                  <p className="py-4 text-center text-[0.85rem] text-ink-muted">No rounds configured yet.</p>
                ) : (
                  rounds.map((r, idx) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-line p-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-parchment text-[0.78rem] font-bold text-ink">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-[0.9rem] font-semibold text-ink">{r.name}</p>
                          <p className="text-[0.78rem] text-ink-muted">{r.description || 'No description'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRound(r.id)}
                        className="text-[0.78rem] text-coral hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Announcements Section */}
            <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Broadcast Announcements</h2>
              <p className="mt-1 text-[0.84rem] text-ink-muted">
                Post official updates visible to all registered participants in their dashboard.
              </p>

              <form onSubmit={handleAddAnnouncement} className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Announcement Title (e.g. Wi-Fi SSID details or Hacking begins)"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                />
                <textarea
                  rows={2}
                  placeholder="Message body / instructions..."
                  value={newAnnBody}
                  onChange={(e) => setNewAnnBody(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingAnn || !newAnnTitle.trim() || !newAnnBody.trim()}
                    className="rounded-full bg-cobalt px-5 py-2 text-[0.85rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
                  >
                    {submittingAnn ? 'Broadcasting…' : 'Publish Announcement'}
                  </button>
                </div>
              </form>

              <div className="mt-6 space-y-3">
                {announcements.length === 0 ? (
                  <p className="py-4 text-center text-[0.85rem] text-ink-muted">No announcements posted yet.</p>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="rounded-xl border border-line bg-parchment/30 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-ink">{ann.title}</h4>
                        <span className="text-[0.75rem] text-ink-muted">
                          {new Date(ann.published_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-[0.85rem] text-ink-soft">{ann.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Registrations & Teams */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Team Applications & Payments</h2>
              <p className="mt-1 text-[0.84rem] text-ink-muted">Review team submissions and manage manual payment verification.</p>

              <div className="mt-6 space-y-4">
                {applications.length === 0 ? (
                  <p className="py-6 text-center text-[0.85rem] text-ink-muted">No applications received yet.</p>
                ) : (
                  applications.map((app) => (
                    <div key={app.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink text-[1rem]">{app.team?.team_name || 'Team'}</span>
                            <span className="rounded-full bg-parchment px-2 py-0.5 text-[0.72rem] text-ink-muted">
                              {app.team?.members?.length ? `${app.team.members.length + 1} total builders` : '1 builder'}
                            </span>
                          </div>
                          <p className="text-[0.78rem] text-ink-muted mt-0.5">Applied: {new Date(app.submitted_at).toLocaleDateString()}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={app.application_status}
                            onChange={async (e) => {
                              await updateApplicationStatus(app.id, e.target.value as any)
                              const apps = await fetchEventApplications(eventId!)
                              setApplications(apps)
                            }}
                            className="rounded-lg border border-line px-2.5 py-1 text-[0.8rem] text-ink font-medium"
                          >
                            <option value="pending">App: Pending</option>
                            <option value="accepted">App: Accepted</option>
                            <option value="rejected">App: Rejected</option>
                          </select>

                          <select
                            value={app.payment_status}
                            onChange={async (e) => {
                              await updatePaymentStatus(app.id, e.target.value as any)
                              const apps = await fetchEventApplications(eventId!)
                              setApplications(apps)
                            }}
                            className="rounded-lg border border-line px-2.5 py-1 text-[0.8rem] text-ink font-medium"
                          >
                            <option value="pending">Pay: Pending</option>
                            <option value="paid">Pay: Paid</option>
                            <option value="waived">Pay: Waived</option>
                          </select>
                        </div>
                      </div>

                      {/* Team Roster details */}
                      {app.team?.members && app.team.members.length > 0 && (
                        <div className="mt-3 rounded-xl bg-parchment/40 p-3 text-[0.82rem]">
                          <p className="font-bold text-ink-muted mb-2 uppercase text-[0.68rem] tracking-wider">
                            Team Roster ({app.team.members.length} invited co-builders)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {app.team.members.map((m) => (
                              <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 border border-line/60 shadow-2xs">
                                <span className="font-medium text-ink">{m.name}</span>
                                <span className="text-ink-muted text-[0.75rem]">{m.email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Judging & Results */}
        {activeTab === 'judging' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line/90 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-[1.15rem] font-semibold text-ink">Judging Rubric</h2>
                  <p className="text-[0.84rem] text-ink-muted">
                    Total weight must equal 100%. Current: <strong className={Math.abs(totalCriteriaWeight - 100) < 0.1 ? 'text-sage' : 'text-coral'}>{totalCriteriaWeight}%</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePublishResults}
                  className="rounded-full bg-cobalt px-5 py-2 text-[0.85rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                >
                  Publish Final Results
                </button>
              </div>

              <form onSubmit={handleAddCriterion} className="mt-4 flex gap-3">
                <input
                  type="text"
                  placeholder="Criterion Name (e.g. Technical Depth)"
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  className="flex-1 rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                />
                <input
                  type="number"
                  placeholder="Weight %"
                  min="1"
                  max="100"
                  value={newCritWeight}
                  onChange={(e) => setNewCritWeight(Number(e.target.value))}
                  className="w-24 rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                />
                <button type="submit" className="rounded-full bg-cobalt px-4 py-2 text-[0.85rem] font-semibold text-white">
                  Add Criterion
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {criteria.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                    <span className="font-semibold text-ink">{c.name} ({c.weight}%)</span>
                    <button type="button" onClick={() => handleDeleteCriterion(c.id)} className="text-[0.78rem] text-coral hover:underline">
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Scoring Table */}
              {applications.length > 0 && criteria.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold text-ink">Score Registered Teams (0–10 scale)</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-[0.85rem]">
                      <thead>
                        <tr className="border-b border-line text-ink-muted">
                          <th className="py-2">Team</th>
                          {criteria.map(c => (
                            <th key={c.id} className="py-2 text-center">{c.name} ({c.weight}%)</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {applications.map((app) => (
                          <tr key={app.id}>
                            <td className="py-3 font-semibold text-ink">{app.team?.team_name}</td>
                            {criteria.map(c => {
                              const s = scores.find(sc => sc.team_id === app.team_id && sc.criterion_id === c.id)
                              return (
                                <td key={c.id} className="py-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    defaultValue={s?.score || 0}
                                    onBlur={(e) => handleScoreChange(app.team_id, c.id, Number(e.target.value))}
                                    className="w-16 rounded-lg border border-line px-2 py-1 text-center font-bold text-ink"
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Published Results */}
              {results.length > 0 && (
                <div className="mt-8 rounded-xl bg-sage-tint/30 p-5">
                  <h3 className="font-semibold text-sage-ink">Published Results & Leaderboard</h3>
                  <div className="mt-3 space-y-2">
                    {results.map((res) => (
                      <div key={res.id} className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                        <span className="font-bold text-ink">Rank #{res.rank} — {res.team?.team_name}</span>
                        <span className="font-display font-bold text-cobalt">{res.total_score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
