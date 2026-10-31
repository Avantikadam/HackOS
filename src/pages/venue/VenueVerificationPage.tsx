import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import {
  fetchVenueByOwner,
  uploadVenueDocument,
  fetchVenueDocuments,
  submitVenueVerification
} from '../../services/venueService'
import type { Venue, VenueDocument } from '../../types/database'

const NAV_ITEMS = [
  { label: 'Overview', href: '/venue', icon: <HomeIcon /> },
  { label: 'Venue Profile', href: '/venue/profile', icon: <BuildingIcon /> },
  { label: 'Verification', href: '/venue/verification', icon: <ShieldIcon /> },
  { label: 'Incoming Requests', href: '/venue/requests', icon: <InboxIcon /> },
]

function HomeIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2.5 8 10 2l7.5 6V17a1 1 0 0 1-1 1H13v-5H7v5H3.5a1 1 0 0 1-1-1V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function BuildingIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 17V9h6v8M7 6h2M11 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function ShieldIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 2.5 3.5 5v5c0 3.6 2.8 7 6.5 8 3.7-1 6.5-4.4 6.5-8V5L10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function InboxIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="2.5" y="4" width="15" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 12h4l2 2.5h3l2-2.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export function VenueVerificationPage() {
  const { user } = useAuth()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [documents, setDocuments] = useState<VenueDocument[]>([])
  const [docType, setDocType] = useState('Fire Safety Certificate')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [repName, setRepName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      const v = await fetchVenueByOwner(user.id)
      setVenue(v)
      if (v) {
        setRepName(v.authorized_rep_name || '')
        const docs = await fetchVenueDocuments(v.id)
        setDocuments(docs)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venue || !user || !file) return
    setUploading(true)
    setFeedback(null)
    try {
      await uploadVenueDocument(venue.id, user.id, docType, file)
      setFile(null)
      setFeedback('Document uploaded successfully to private storage!')
      const docs = await fetchVenueDocuments(venue.id)
      setDocuments(docs)
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitVerification = async () => {
    if (!venue || !repName.trim()) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await submitVenueVerification(venue.id, repName.trim())
      setFeedback('Verification request submitted for platform administrative review.')
      await loadData()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to submit verification.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Venue Authority" roleColor="amber">
      <div className="mx-auto max-w-[48rem]">
        <div className="mb-2 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/venue" className="hover:text-ink">Venue Authority</Link>
          <span>/</span>
          <span className="font-medium text-ink">Verification</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold text-ink">Venue Verification</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Submit facility safety records, ownership documentation, and representative declarations.
          </p>
        </div>

        {feedback && (
          <div className="mb-6 rounded-xl border border-sage/25 bg-sage-tint p-4 text-[0.88rem] text-sage-ink">
            {feedback}
          </div>
        )}

        {!venue ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
            <p className="text-ink-muted">Please configure your venue profile first before submitting verification documents.</p>
            <Link to="/venue/profile" className="mt-4 inline-block font-semibold text-cobalt">Go to Venue Profile</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status card */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-[1.15rem] font-semibold text-ink">Current Verification Status</h2>
                  <p className="text-[0.82rem] text-ink-muted">Platform review status for {venue.venue_name}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[0.78rem] font-bold ${
                    venue.verification_status === 'verified'
                      ? 'bg-sage-tint text-sage'
                      : 'bg-amber-tint text-[#8a5a10]'
                  }`}
                >
                  {venue.verification_status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Document upload card */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Upload Verification Documents</h2>
              <p className="mt-1 text-[0.82rem] text-ink-muted">
                Supported files: PDF, PNG, JPG (Fire safety clearance, occupancy permit, institutional affiliation letter).
              </p>

              <form onSubmit={handleUpload} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Document Type</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                    >
                      <option value="Fire Safety Certificate">Fire Safety Certificate</option>
                      <option value="Occupancy Clearance">Occupancy Clearance</option>
                      <option value="Institutional Lease / Authorization">Institutional Lease / Authorization</option>
                      <option value="Electrical & Power Inspection">Electrical & Power Inspection</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Select File</label>
                    <input
                      type="file"
                      required
                      accept=".pdf,image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full text-[0.85rem] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-parchment file:px-4 file:py-1.5 file:font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="rounded-full bg-cobalt px-5 py-2 text-[0.85rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
                  >
                    {uploading ? 'Uploading to Private Storage…' : 'Upload Document'}
                  </button>
                </div>
              </form>

              {/* Uploaded Documents List */}
              <div className="mt-6 border-t border-line/70 pt-4">
                <h3 className="font-semibold text-ink text-[0.9rem]">Submitted Documents ({documents.length})</h3>
                <div className="mt-3 space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-[0.8rem] text-ink-muted">No documents uploaded yet.</p>
                  ) : (
                    documents.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-xl bg-parchment/60 p-3 text-[0.85rem]">
                        <div>
                          <p className="font-semibold text-ink">{d.document_type}</p>
                          <p className="text-[0.72rem] text-ink-muted">Uploaded {new Date(d.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[0.72rem] font-semibold text-sage">
                          {d.verification_status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Submit declaration */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Representative Declaration</h2>
              <div className="mt-3">
                <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Authorized Representative Name</label>
                <input
                  type="text"
                  placeholder="e.g. Noor Haddad"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={submitting || !repName.trim()}
                  onClick={handleSubmitVerification}
                  className="rounded-full bg-sage px-6 py-2.5 text-[0.88rem] font-semibold text-white hover:bg-sage-ink disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit for Platform Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

