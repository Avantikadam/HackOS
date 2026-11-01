import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { supabase } from '../../lib/supabase'
import {
  createQuotation,
  fetchQuotationByRequest,
  fetchAgreementByRequest,
  fetchAgreementDocumentUrl,
  sendOtpChallenge,
  uploadSignedAgreement,
  verifyOtpAndAcceptAgreement
} from '../../services/venueService'
import { generateAuthorizationPdf, generateAuthorizationPdfBlob } from '../../utils/pdfGenerator'
import type { VenueRequest, VenueQuotation, VenueAgreement } from '../../types/database'

const NAV_ITEMS = [
  { label: 'Overview', href: '/venue', icon: <HomeIcon /> },
  { label: 'Venue Profile', href: '/venue/profile', icon: <BuildingIcon /> },
  { label: 'Verification', href: '/venue/verification', icon: <ShieldIcon /> },
  { label: 'Incoming Requests', href: '/venue/requests', icon: <InboxIcon /> },
]

function HomeIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2.5 8 10 2l7.5 6V17a1 1 0 0 1-1 1H13v-5H7v5H3.5a1 1 0 0 1-1-1V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
}
function BuildingIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><path d="M7 17V9h6v8M7 6h2M11 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
function ShieldIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 2.5 3.5 5v5c0 3.6 2.8 7 6.5 8 3.7-1 6.5-4.4 6.5-8V5L10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
}
function InboxIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="2.5" y="4" width="15" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M2.5 12h4l2 2.5h3l2-2.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function QuotationBuilderPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const { user, profile } = useAuth()

  const [request, setRequest] = useState<VenueRequest | null>(null)
  const [quotation, setQuotation] = useState<VenueQuotation | null>(null)
  const [agreement, setAgreement] = useState<VenueAgreement | null>(null)
  const [loading, setLoading] = useState(true)

  // Quotation line items
  const [lineItems, setLineItems] = useState<Array<{ item: string; amount: number; qty?: string }>>([
    { item: 'Hall Rental (3 Days)', amount: 150000, qty: '3 days' },
    { item: 'High-speed dedicated Wi-Fi & line', amount: 35000, qty: '1 Gbps' },
    { item: '24/7 Power generator backup', amount: 30000, qty: 'Full period' },
    { item: 'Housekeeping, security & access control', amount: 20000, qty: 'Standard' }
  ])
  const [notes, setNotes] = useState('Deposit of 20% due on quotation acceptance.')
  const [submittingQuote, setSubmittingQuote] = useState(false)

  // OTP Verification state
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpDestination, setOtpDestination] = useState<string | null>(null)
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!requestId) return
    loadData()
  }, [requestId])

  const loadData = async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const { data: req } = await supabase
        .from('venue_requests')
        .select('*, event:events(*), venue:venues(*)')
        .eq('id', requestId)
        .single()

      setRequest(req as VenueRequest)

      const q = await fetchQuotationByRequest(requestId)
      setQuotation(q)

      const agr = await fetchAgreementByRequest(requestId)
      setAgreement(agr)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setLineItems([...lineItems, { item: '', amount: 0, qty: '1' }])
  }

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: val }
    setLineItems(updated)
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const handleSendQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestId) return
    setSubmittingQuote(true)
    setFeedback(null)
    try {
      const q = await createQuotation({
        venue_request_id: requestId,
        itemized_costs: lineItems,
        notes
      })
      setQuotation(q)
      setFeedback({ type: 'success', message: 'Quotation submitted to the organizer successfully!' })
      await loadData()
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to submit quotation.' })
    } finally {
      setSubmittingQuote(false)
    }
  }

  // OTP Challenge
  const handleRequestOtp = async () => {
    if (!agreement) return
    setFeedback(null)
    try {
      const res = await sendOtpChallenge(agreement.id)
      setOtpSent(true)
      setOtpDestination(res.destination)
      setDevOtpCode(res.dev_code || null)
      setFeedback({ type: 'success', message: res.message })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send OTP.' })
    }
  }

  const handleVerifyOtp = async () => {
    if (!agreement || !otpCode.trim()) return
    setVerifyingOtp(true)
    setFeedback(null)
    try {
      const res = await verifyOtpAndAcceptAgreement(agreement.id, otpCode)

      if (res.success) {
        const signedAgreement = await fetchAgreementByRequest(agreement.venue_request_id)
        let pdfWarning = ''

        if (signedAgreement && quotation && request?.venue && request?.event) {
          try {
            const blob = generateAuthorizationPdfBlob({
              agreement: signedAgreement,
              quotation,
              venue: request.venue,
              event: request.event,
              repName: profile?.full_name || request.venue.authorized_rep_name || 'Representative',
              repEmail: profile?.email || request.venue.contact_email || undefined
            })
            await uploadSignedAgreement(signedAgreement.id, blob)
          } catch (pdfErr) {
            pdfWarning = ` The signed PDF could not be stored: ${pdfErr instanceof Error ? pdfErr.message : 'unknown error'}.`
          }
        }

        setFeedback({ type: 'success', message: `${res.message}${pdfWarning}` })
        setOtpSent(false)
        setDevOtpCode(null)
        await loadData()
      } else {
        setFeedback({ type: 'error', message: res.message })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Verification failed.' })
    } finally {
      setVerifyingOtp(false)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Venue Authority" roleColor="amber">
      <div className="mx-auto max-w-[52rem]">
        <div className="mb-2 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/venue" className="hover:text-ink">Venue</Link>
          <span>/</span>
          <Link to="/venue/requests" className="hover:text-ink">Requests</Link>
          <span>/</span>
          <span className="font-medium text-ink">Quotation & Authorization</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold text-ink">Quotation & Agreement</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Request from <strong>{request?.event?.name}</strong> · Venue: <strong>{request?.venue?.venue_name}</strong>
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-6 rounded-xl border p-4 text-[0.88rem] ${feedback.type === 'success'
                ? 'border-sage/25 bg-sage-tint text-sage-ink'
                : 'border-coral/25 bg-coral-tint text-coral-ink'
              }`}
          >
            {feedback.message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : !request ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-ink-muted">Request not found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Request Summary */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Requested Booking Parameters</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-[0.85rem] sm:grid-cols-4">
                <div>
                  <dt className="text-ink-muted">Start Date</dt>
                  <dd className="font-semibold text-ink">{new Date(request.requested_start).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">End Date</dt>
                  <dd className="font-semibold text-ink">{new Date(request.requested_end).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Expected Attendance</dt>
                  <dd className="font-semibold text-ink">{request.expected_participants} participants</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Request Status</dt>
                  <dd className="font-semibold uppercase text-cobalt">{request.request_status}</dd>
                </div>
              </dl>
            </div>

            {/* Quotation Builder or Review */}
            {!quotation || quotation.quotation_status === 'draft' ? (
              <form onSubmit={handleSendQuotation} className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="font-display text-[1.15rem] font-semibold text-ink">Itemized Quotation Builder</h2>
                    <p className="text-[0.82rem] text-ink-muted">Specify rental costs, equipment, and services in INR.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="rounded-full border border-line bg-parchment/60 px-3.5 py-1.5 text-[0.82rem] font-semibold text-ink hover:bg-parchment"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 rounded-xl border sm:border-0 border-line/60 p-3 sm:p-0 bg-parchment/20 sm:bg-transparent">
                      <input
                        type="text"
                        placeholder="Item description (e.g. Hall Rental)"
                        value={item.item}
                        onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                        className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem]"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Qty / Notes"
                          value={item.qty || ''}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className="w-full sm:w-28 rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem]"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[0.85rem] font-semibold text-ink">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={item.amount}
                            onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value))}
                            className="w-28 sm:w-32 rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] font-bold text-ink"
                          />
                        </div>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-coral hover:text-coral-ink px-2 py-1 text-base font-bold"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between border-t border-line pt-4 text-[1rem] font-bold text-ink">
                  <span>Estimated Total (INR):</span>
                  <span className="font-display text-[1.3rem] text-cobalt">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Quotation Terms & Validity Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="rounded-full bg-cobalt px-6 py-2.5 text-[0.9rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
                  >
                    {submittingQuote ? 'Submitting Quotation…' : 'Submit Quotation to Organizer'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="font-display text-[1.15rem] font-semibold text-ink">Quotation Issued</h2>
                    <p className="text-[0.82rem] text-ink-muted">
                      Status: <strong className="uppercase text-cobalt">{quotation.quotation_status}</strong>
                    </p>
                  </div>
                  <span className="font-display text-[1.3rem] font-bold text-cobalt">
                    ₹{Number(quotation.total_amount).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="mt-4 divide-y divide-line/60">
                  {quotation.itemized_costs.map((c, i) => (
                    <div key={i} className="flex justify-between py-2 text-[0.88rem]">
                      <span className="text-ink-soft">{c.item}</span>
                      <span className="font-semibold text-ink">₹{Number(c.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OTP Authorization & Agreement Section */}
            {quotation && quotation.quotation_status === 'accepted' && agreement && (
              <div className="rounded-2xl border border-sage/40 bg-white p-6 shadow-soft">
                <div className="border-b border-line pb-4">
                  <h2 className="font-display text-[1.25rem] font-semibold text-ink">
                    Official Venue Authorization (Agreement v{agreement.version})
                  </h2>
                  <p className="mt-1 text-[0.84rem] text-ink-muted">
                    The organizer has accepted your quotation. Complete representative OTP verification to finalize the agreement.
                  </p>
                </div>

                {agreement.agreement_status === 'accepted' ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-xl border border-sage/30 bg-sage-tint/40 p-5 text-sage-ink">
                      <p className="font-bold">✔ Venue Authorization Officially Approved</p>
                      <p className="mt-1 text-[0.84rem]">
                        Verified by representative on {new Date(agreement.otp_verified_at || '').toLocaleString()}. The organizer is now authorized to publish this offline event.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          if (!request.venue || !request.event) return
                          const storedUrl = await fetchAgreementDocumentUrl(agreement.id)
                          if (storedUrl) {
                            window.open(storedUrl, '_blank')
                            return
                          }
                          generateAuthorizationPdf({
                            agreement,
                            quotation,
                            venue: request.venue,
                            event: request.event,
                            repName: profile?.full_name || request.venue.authorized_rep_name || 'Representative'
                          })
                        })()
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-cobalt px-6 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep"
                    >
                      Download Signed Authorization Agreement (PDF)
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <p className="text-[0.88rem] text-ink-soft">
                      A one-time verification code will be issued to the registered venue representative
                      {otpDestination ? <> (<strong>{otpDestination}</strong>)</> : <> (<strong>{user?.email}</strong>)</>} to
                      record representative acceptance.
                    </p>

                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="rounded-full bg-sage px-6 py-2.5 text-[0.88rem] font-semibold text-white shadow-soft hover:bg-sage-ink"
                      >
                        Request Verification OTP Challenge
                      </button>
                    ) : (
                      <div className="space-y-4 rounded-xl bg-parchment/60 p-5">
                        {devOtpCode && (
                          <div className="rounded-lg border border-amber/40 bg-amber-tint/50 p-3 text-[0.8rem] text-[#8a5a10]">
                            <strong>Development mode:</strong> email delivery is not configured, so your
                            verification code is <span className="font-mono text-[0.95rem] font-bold tracking-widest">{devOtpCode}</span>.
                            It expires in 10 minutes.
                          </div>
                        )}
                        <label className="block text-[0.82rem] font-semibold text-ink">Enter 6-digit Verification OTP</label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 123456"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-48 rounded-xl border border-line bg-white px-4 py-2 text-center font-mono text-[1.1rem] tracking-widest text-ink focus:border-cobalt focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={verifyingOtp || otpCode.length < 6}
                            onClick={handleVerifyOtp}
                            className="rounded-full bg-sage px-6 py-2 text-[0.88rem] font-semibold text-white hover:bg-sage-ink disabled:opacity-50"
                          >
                            {verifyingOtp ? 'Verifying…' : 'Verify & Sign Agreement'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

