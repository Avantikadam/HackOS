import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { ScannableQrCode } from '../../components/qr/ScannableQrCode'
import {
  getOrCreateParticipantQrPass,
  fetchUserRegisteredEvents,
  type QrPassResponse,
} from '../../services/checkinService'
import type { Event } from '../../types/database'

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

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M7.5 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12.5 7.5a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167ZM2.5 15v-.833a4.167 4.167 0 0 1 8.333 0V15M12.5 15v-.833a3.333 3.333 0 0 0-2.5-3.225" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 2.5V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const PARTICIPANT_NAV = [
  { label: 'Overview', href: '/participant', icon: <FileIcon /> },
  { label: 'My Squad & Codes', href: '/team/my-team', icon: <UsersIcon /> },
  { label: 'My QR Pass', href: '/participant/qr-pass', icon: <QrIcon /> },
]

export function MyQrPassPage() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [qrPass, setQrPass] = useState<QrPassResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [passLoading, setPassLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)

  useEffect(() => {
    if (!user) return
    loadEvents()
  }, [user])

  const loadEvents = async () => {
    if (!user) return
    setLoading(true)
    try {
      const regEvents = await fetchUserRegisteredEvents(user.id)
      setEvents(regEvents)

      const urlEventId = searchParams.get('eventId')
      if (urlEventId && regEvents.some((e) => e.id === urlEventId)) {
        setSelectedEventId(urlEventId)
      } else if (regEvents.length > 0) {
        setSelectedEventId(regEvents[0].id)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedEventId) return
    loadQrPass(selectedEventId)
  }, [selectedEventId])

  const loadQrPass = async (eventId: string) => {
    setPassLoading(true)
    setError(null)
    try {
      const pass = await getOrCreateParticipantQrPass(eventId)
      setQrPass(pass)
    } catch (err: any) {
      setError(err?.message || 'Failed to generate attendance QR pass.')
    } finally {
      setPassLoading(false)
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  const activeEvent = events.find((e) => e.id === selectedEventId)

  return (
    <DashboardLayout navItems={PARTICIPANT_NAV} roleLabel="Participant Pass" roleColor="cobalt">
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cobalt">
            Access Credentials
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            My Check-In QR Pass
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Official gate attendance badge for physical venues. Zero personal data encoded.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white shadow-soft">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-soft">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cobalt-tint text-cobalt">
              <QrIcon />
            </div>
            <h3 className="mt-3 font-heading text-lg font-bold text-ink">No Event Registrations Found</h3>
            <p className="mt-1 text-sm text-ink-muted max-w-sm mx-auto">
              You must be registered in a team or squad for an active hackathon to generate an attendance pass.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/participant/discover"
                className="rounded-xl bg-cobalt px-5 py-2.5 text-xs font-semibold text-white hover:bg-cobalt-hover"
              >
                Browse Hackathons
              </Link>
              <Link
                to="/team/my-team"
                className="rounded-xl border border-line px-5 py-2.5 text-xs font-semibold text-ink hover:bg-parchment"
              >
                Join Team with Code
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Switcher Tabs */}
            {events.length > 1 && (
              <div className="flex items-center gap-2 border-b border-line pb-2 overflow-x-auto">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition ${
                      selectedEventId === ev.id
                        ? 'bg-cobalt text-white shadow-sm'
                        : 'bg-white text-ink-soft border border-line hover:bg-parchment'
                    }`}
                  >
                    {ev.name}
                  </button>
                ))}
              </div>
            )}

            {/* Pass Card Container */}
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-md">
              {/* Event Header Banner */}
              <div className="border-b border-line bg-gradient-to-r from-parchment/60 via-white to-parchment/40 p-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-sage-tint px-3 py-1 text-xs font-bold text-sage-ink border border-sage/30">
                    ADMIT ONE · PARTICIPANT
                  </span>
                  <span className="text-xs font-semibold text-ink-muted">
                    {activeEvent?.format?.toUpperCase() || 'HACKATHON'}
                  </span>
                </div>
                <h2 className="mt-3 font-heading text-xl font-bold text-ink sm:text-2xl">
                  {activeEvent?.name || 'Hackathon Event'}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
                  {activeEvent?.start_at && (
                    <span>
                      📅 {new Date(activeEvent.start_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {activeEvent?.venue?.venue_name && (
                    <span>📍 {activeEvent.venue.venue_name}</span>
                  )}
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="p-8 text-center space-y-5">
                {passLoading ? (
                  <div className="flex h-56 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-cobalt" />
                  </div>
                ) : qrPass ? (
                  <>
                    <div className="flex justify-center">
                      <ScannableQrCode value={qrPass.qr_token} size={240} />
                    </div>

                    <div>
                      <p className="text-xs uppercase font-bold tracking-widest text-ink-muted">
                        Cryptographic Gate Token
                      </p>
                      <div className="mt-1.5 flex items-center justify-center gap-2">
                        <span className="rounded-lg bg-parchment/80 px-3 py-1 font-mono text-sm font-bold text-ink">
                          {qrPass.qr_token}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyToken(qrPass.qr_token)}
                          className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold text-cobalt hover:bg-parchment transition"
                        >
                          {copiedToken ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sage/40 bg-sage-tint/30 p-4 text-left space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-sage-ink">
                        <span>🛡️</span>
                        <span>Zero PII Cryptographic Guarantee</span>
                      </div>
                      <p className="text-[0.76rem] text-ink-muted leading-relaxed">
                        This pass contains zero personally identifiable information (no names, phone numbers, or emails are stored in this barcode). It is an opaque token verified exclusively against the event registry.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-line/80 bg-parchment/40 p-4 text-left flex items-start gap-3 text-xs text-ink-soft">
                      <span className="text-base">📱</span>
                      <div>
                        <p className="font-semibold text-ink">Offline Ready For Venue Arrival</p>
                        <p className="mt-0.5 text-[0.74rem] text-ink-muted">
                          You can screenshot this pass or keep this page open. Scanner volunteers are equipped with offline-sync check-in readers and can scan this without active network access.
                        </p>
                      </div>
                    </div>
                  </>
                ) : error ? (
                  <div className="rounded-xl border border-coral/30 bg-coral-tint/40 p-4 text-xs font-semibold text-coral">
                    {error}
                  </div>
                ) : null}
              </div>

              {/* Pass Footer */}
              <div className="border-t border-line bg-parchment/30 px-6 py-4 flex items-center justify-between text-xs text-ink-muted">
                <span>Attendee: <strong className="text-ink">{profile?.full_name || 'Hacker'}</strong></span>
                <span>HACKOS Gate Pass v2.0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
