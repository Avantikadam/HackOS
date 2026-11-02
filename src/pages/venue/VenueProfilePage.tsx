import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { fetchVenueByOwner, saveVenueProfile } from '../../services/venueService'

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

export function VenueProfilePage() {
  const { user } = useAuth()
  const [venueId, setVenueId] = useState<string | undefined>(undefined)
  const [venueName, setVenueName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [capacity, setCapacity] = useState(1000)
  const [repName, setRepName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Facilities checklist
  const [wifi, setWifi] = useState(true)
  const [powerBackup, setPowerBackup] = useState(true)
  const [projectors, setProjectors] = useState(true)
  const [cateringHall, setCateringHall] = useState(true)
  const [accessibility, setAccessibility] = useState(true)
  const [parking, setParking] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    setLoading(true)
    try {
      const v = await fetchVenueByOwner(user.id)
      if (v) {
        setVenueId(v.id)
        setVenueName(v.venue_name)
        setAddress(v.address || '')
        setCity(v.city || '')
        setState(v.state || '')
        setCapacity(v.capacity || 1000)
        setRepName(v.authorized_rep_name || '')
        setContactEmail(v.contact_email || user.email || '')
        setContactPhone(v.contact_phone || '')

        const fac = v.facilities || {}
        setWifi(Boolean(fac.wifi ?? true))
        setPowerBackup(Boolean(fac.power_backup ?? true))
        setProjectors(Boolean(fac.projectors ?? true))
        setCateringHall(Boolean(fac.catering_hall ?? true))
        setAccessibility(Boolean(fac.accessibility ?? true))
        setParking(Boolean(fac.parking ?? true))
      } else {
        setContactEmail(user.email || '')
      }
    } catch (err) {
      console.error('Failed to load venue profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setFeedback(null)
    try {
      const saved = await saveVenueProfile({
        id: venueId,
        owner_user_id: user.id,
        venue_name: venueName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        capacity: Number(capacity) || 0,
        authorized_rep_name: repName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        facilities: {
          wifi,
          power_backup: powerBackup,
          projectors,
          catering_hall: cateringHall,
          accessibility,
          parking
        }
      })
      setVenueId(saved.id)
      setFeedback('Venue profile saved successfully!')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Venue Authority" roleColor="amber">
      <div className="mx-auto max-w-[48rem]">
        <div className="mb-2 flex items-center gap-2 text-[0.82rem] text-ink-muted">
          <Link to="/venue" className="hover:text-ink">Venue Authority</Link>
          <span>/</span>
          <span className="font-medium text-ink">Venue Profile</span>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold text-ink">Venue Profile</h1>
          <p className="mt-1 text-[0.92rem] text-ink-muted">
            Provide comprehensive details about your hall facilities, capacity, and representative.
          </p>
        </div>

        {feedback && (
          <div className="mb-6 rounded-xl border border-sage/25 bg-sage-tint p-4 text-[0.88rem] text-sage-ink">
            {feedback}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-line border-t-cobalt" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Venue Details</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Venue Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nexa Convention Hall · Hall B"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full rounded-xl border border-line px-4 py-2.5 text-[0.92rem]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 42 Innovation Way, BKC"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-line px-4 py-2.5 text-[0.92rem]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[0.82rem] font-semibold text-ink">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-line px-4 py-2.5 text-[0.92rem]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.82rem] font-semibold text-ink">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-xl border border-line px-4 py-2.5 text-[0.92rem]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Seating Capacity (Participants)</label>
                  <input
                    type="number"
                    min="50"
                    max="10000"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-line px-4 py-2.5 text-[0.92rem]"
                  />
                </div>
              </div>
            </div>

            {/* Facilities Checklist */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Available Facilities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ['Dedicated High-Speed Wi-Fi', wifi, setWifi],
                  ['24/7 Power Backup / UPS', powerBackup, setPowerBackup],
                  ['Projectors & AV Line Array', projectors, setProjectors],
                  ['Catering & Dining Space', cateringHall, setCateringHall],
                  ['Step-free Ramp & Accessibility', accessibility, setAccessibility],
                  ['Participant Parking Area', parking, setParking]
                ].map(([label, val, setter]) => (
                  <label key={label as string} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line p-3 text-[0.85rem]">
                    <input
                      type="checkbox"
                      checked={val as boolean}
                      onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                      className="h-4 w-4 rounded text-cobalt"
                    />
                    <span className="font-medium text-ink">{label as string}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Representative Details */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-[1.15rem] font-semibold text-ink">Authorized Representative</h2>
              <p className="mt-1 text-[0.82rem] text-ink-muted">
                This representative will receive the OTP verification challenge to electronically authorize booking agreements.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Representative Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Noor Haddad"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.82rem] font-semibold text-ink">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 12345"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-[0.88rem]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-cobalt px-6 py-2.5 text-[0.9rem] font-semibold text-white shadow-soft hover:bg-cobalt-deep disabled:opacity-50"
              >
                {saving ? 'Saving Profile…' : 'Save Venue Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}

