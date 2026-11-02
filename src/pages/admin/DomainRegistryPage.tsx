import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import type { InstitutionalDomain } from '../../types/database'
import {
  fetchInstitutionalDomains,
  createInstitutionalDomain,
  updateInstitutionalDomainStatus,
} from '../../services/domainService'

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

const ADMIN_NAV_ITEMS = [
  { label: 'Verification Queue', href: '/admin/verifications', icon: <ShieldCheckIcon /> },
  { label: 'Institutional Domains', href: '/admin/domains', icon: <BuildingLibraryIcon /> },
]

export function DomainRegistryPage() {
  const [domains, setDomains] = useState<InstitutionalDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form state
  const [institutionName, setInstitutionName] = useState('')
  const [approvedDomain, setApprovedDomain] = useState('')
  const [officialWebsite, setOfficialWebsite] = useState('')
  const [category, setCategory] = useState<'University' | 'Autonomous Institute' | 'Research Lab' | 'Government' | 'Private Institution'>('University')
  const [officialContactSource, setOfficialContactSource] = useState('')

  useEffect(() => {
    loadDomains()
  }, [])

  const loadDomains = async () => {
    setLoading(true)
    try {
      const data = await fetchInstitutionalDomains()
      setDomains(data)
    } catch (err) {
      console.error('Failed to load domains:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (!institutionName.trim() || !approvedDomain.trim()) {
        throw new Error('Institution name and approved domain are required.')
      }

      await createInstitutionalDomain({
        institution_name: institutionName,
        approved_domain: approvedDomain,
        official_website: officialWebsite,
        institution_category: category,
        official_contact_source: officialContactSource,
      })

      setSuccessMsg(`Domain "${approvedDomain}" registered successfully!`)
      setShowAddModal(false)
      setInstitutionName('')
      setApprovedDomain('')
      setOfficialWebsite('')
      setOfficialContactSource('')
      await loadDomains()
    } catch (err: any) {
      setError(err?.message || 'Failed to register domain.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (domain: InstitutionalDomain) => {
    const nextStatus = domain.verification_status === 'verified' ? 'suspended' : 'verified'
    try {
      await updateInstitutionalDomainStatus(domain.id, nextStatus)
      await loadDomains()
    } catch (err: any) {
      alert(err?.message || 'Failed to update domain status')
    }
  }

  const filteredDomains = domains.filter((d) => {
    const matchesSearch =
      d.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      d.approved_domain.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || d.institution_category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} roleLabel="Super Admin / Trust Officer" roleColor="sage">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Institutional Domain Registry
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Authoritative allowlist of recognized universities and research institutes for anti-fraud venue screening.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cobalt-hover active:scale-[0.98]"
          >
            + Add Recognized Institution
          </button>
        </div>

        {successMsg && (
          <div className="rounded-xl border border-sage/40 bg-sage-tint/40 p-4 text-sm font-medium text-sage-ink">
            {successMsg}
          </div>
        )}

        {/* Filters and search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institution name or domain (e.g. iitg.ac.in)..."
              className="w-full rounded-xl border border-line bg-white px-4 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-cobalt focus:outline-none focus:ring-1 focus:ring-cobalt"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {['all', 'University', 'Autonomous Institute', 'Research Lab', 'Government', 'Private Institution'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-ink text-white'
                    : 'bg-white text-ink-muted hover:bg-parchment hover:text-ink border border-line'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Domain List Table */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-ink-muted">
              Loading recognized institutional registry...
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-ink">No institutions match your search</p>
              <p className="mt-1 text-xs text-ink-muted">Try adjusting your keyword filter or add a new institution.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-parchment/40 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-5 py-3.5">Institution</th>
                    <th className="px-5 py-3.5">Approved Domain</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Contact Source</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredDomains.map((d) => (
                    <tr key={d.id} className="hover:bg-parchment/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{d.institution_name}</div>
                        {d.official_website && (
                          <a
                            href={d.official_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-cobalt hover:underline"
                          >
                            {d.official_website} ↗
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-cobalt">
                        <span className="rounded-md bg-cobalt-tint/60 px-2.5 py-1 text-xs">
                          @{d.approved_domain}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-soft">
                        <span className="rounded-full border border-line bg-parchment/60 px-2.5 py-0.5 font-medium">
                          {d.institution_category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-muted">
                        {d.official_contact_source ? (
                          <a
                            href={d.official_contact_source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate max-w-[180px] inline-block text-cobalt hover:underline"
                          >
                            Verified directory ↗
                          </a>
                        ) : (
                          'National Registry'
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            d.verification_status === 'verified'
                              ? 'bg-sage-tint text-sage-ink border border-sage/30'
                              : 'bg-coral-tint text-coral border border-coral/30'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {d.verification_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(d)}
                          className={`text-xs font-medium hover:underline ${
                            d.verification_status === 'verified' ? 'text-coral' : 'text-sage'
                          }`}
                        >
                          {d.verification_status === 'verified' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="font-heading text-lg font-bold text-ink">
                Register Institutional Domain
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink-muted hover:text-ink text-lg"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-coral/30 bg-coral-tint/40 p-3 text-xs font-semibold text-coral">
                {error}
              </div>
            )}

            <form onSubmit={handleAddDomain} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Indian Institute of Technology Madras"
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Approved Domain (FQDN) *
                </label>
                <input
                  type="text"
                  required
                  value={approvedDomain}
                  onChange={(e) => setApprovedDomain(e.target.value)}
                  placeholder="e.g. iitm.ac.in"
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-sm font-mono text-ink focus:border-cobalt focus:outline-none"
                />
                <p className="mt-1 text-[0.7rem] text-ink-muted">
                  Exact domain only. Do not prefix with @ or https://.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:outline-none"
                >
                  <option value="University">University</option>
                  <option value="Autonomous Institute">Autonomous Institute</option>
                  <option value="Research Lab">Research Lab</option>
                  <option value="Government">Government</option>
                  <option value="Private Institution">Private Institution</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Official Website
                </label>
                <input
                  type="url"
                  value={officialWebsite}
                  onChange={(e) => setOfficialWebsite(e.target.value)}
                  placeholder="https://www.iitm.ac.in"
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Official Contact Directory Source
                </label>
                <input
                  type="url"
                  value={officialContactSource}
                  onChange={(e) => setOfficialContactSource(e.target.value)}
                  placeholder="https://www.iitm.ac.in/directory"
                  className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink focus:border-cobalt focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-parchment"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-cobalt px-5 py-2 text-sm font-semibold text-white hover:bg-cobalt-hover disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Register Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
