import { supabase } from '../lib/supabase'
import type {
  Profile,
  Venue,
  VenueRequest,
  VenueQuotation,
  VenueAgreement,
  VenueDocument
} from '../types/database'

// --------------------------------------------------------------------
// Venue Profile & Verification
// --------------------------------------------------------------------
export async function fetchVenueByOwner(userId: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Venue | null
}

export async function fetchVenuesByOwner(userId: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as Venue[]
}

export async function saveVenueProfile(venueData: {
  id?: string
  owner_user_id: string
  venue_name: string
  address?: string
  city?: string
  state?: string
  capacity?: number
  facilities?: Record<string, boolean | string | number>
  contact_email?: string
  contact_phone?: string
  authorized_rep_name?: string
}): Promise<Venue> {
  const { data, error } = await supabase
    .from('venues')
    .upsert(
      {
        ...venueData,
        capacity: venueData.capacity ?? 0,
        facilities: venueData.facilities ?? {}
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as Venue
}

export async function fetchVerifiedVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('verification_status', 'verified')
    .order('venue_name', { ascending: true })

  if (error) throw error
  return (data || []) as Venue[]
}

export async function submitVenueVerification(venueId: string, repName: string): Promise<void> {
  const { error } = await supabase.rpc('submit_venue_verification', {
    p_venue_id: venueId,
    p_rep_name: repName
  })

  if (error) throw error
}

export async function uploadVenueDocument(
  venueId: string,
  uploadedBy: string,
  docType: string,
  file: File
): Promise<VenueDocument> {
  const fileExt = file.name.split('.').pop()
  const storagePath = `${uploadedBy}/${venueId}/${docType}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('venue-documents')
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data, error: dbError } = await supabase
    .from('venue_documents')
    .insert({
      venue_id: venueId,
      document_type: docType,
      storage_path: storagePath,
      uploaded_by: uploadedBy,
      verification_status: 'pending'
    })
    .select()
    .single()

  if (dbError) throw dbError
  return data as VenueDocument
}

export async function fetchVenueDocuments(venueId: string): Promise<VenueDocument[]> {
  const { data, error } = await supabase
    .from('venue_documents')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as VenueDocument[]
}

// --------------------------------------------------------------------
// Venue Requests
// --------------------------------------------------------------------
export async function createVenueRequest(req: {
  event_id: string
  venue_id: string
  organizer_id: string
  requested_start: string
  requested_end: string
  expected_participants: number
  requirements?: Record<string, unknown>
  notes?: string
}): Promise<VenueRequest> {
  const { data, error } = await supabase
    .from('venue_requests')
    .insert({
      ...req,
      requirements: req.requirements ?? {},
      request_status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data as VenueRequest
}

export async function fetchIncomingRequests(venueId?: string): Promise<VenueRequest[]> {
  const venueIds = venueId ? [venueId] : (await fetchVenuesByOwner((await getCurrentUserId()) || '')).map(v => v.id)

  if (venueIds.length === 0) return []

  const { data, error } = await supabase
    .from('venue_requests')
    .select('*, event:events(*), venue:venues(*)')
    .in('venue_id', venueIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  const requests = (data || []) as VenueRequest[]
  const organizerIds = [...new Set(requests.map((request) => request.organizer_id))]

  if (organizerIds.length === 0) return requests

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', organizerIds)

  if (profilesError) throw profilesError

  const profilesById = new Map<string, Profile>(
    ((profiles || []) as Profile[]).map((profile) => [profile.id, profile])
  )

  return requests.map((request) => ({
    ...request,
    organizer: profilesById.get(request.organizer_id)
  }))
}

export async function fetchOrganizerRequests(organizerId: string): Promise<VenueRequest[]> {
  const { data, error } = await supabase
    .from('venue_requests')
    .select('*, venue:venues(*), event:events(*), venue_quotations(*), venue_agreements(*)')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as VenueRequest[]
}

export async function updateRequestStatus(
  requestId: string,
  status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'cancelled'
): Promise<void> {
  const { error } = await supabase
    .from('venue_requests')
    .update({ request_status: status })
    .eq('id', requestId)

  if (error) throw error
}

// --------------------------------------------------------------------
// Quotations
// --------------------------------------------------------------------
export async function createQuotation(q: {
  venue_request_id: string
  itemized_costs: Array<{ item: string; amount: number; qty?: string; notes?: string }>
  notes?: string
  validity_date?: string
}): Promise<VenueQuotation> {
  const total = q.itemized_costs.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const { data, error } = await supabase
    .from('venue_quotations')
    .insert({
      venue_request_id: q.venue_request_id,
      itemized_costs: q.itemized_costs,
      total_amount: total,
      notes: q.notes ?? null,
      validity_date: q.validity_date ?? null,
      quotation_status: 'submitted',
      version: 1
    })
    .select()
    .single()

  if (error) throw error

  await updateRequestStatus(q.venue_request_id, 'quoted')

  return data as VenueQuotation
}

export async function fetchQuotationByRequest(requestId: string): Promise<VenueQuotation | null> {
  const { data, error } = await supabase
    .from('venue_quotations')
    .select('*')
    .eq('venue_request_id', requestId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as VenueQuotation | null
}

export async function updateQuotationStatus(
  quotationId: string,
  requestId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('venue_quotations')
    .update({ quotation_status: status })
    .eq('id', quotationId)

  if (error) throw error

  if (status === 'accepted') {
    const { data: existingAgreement } = await supabase
      .from('venue_agreements')
      .select('id')
      .eq('venue_request_id', requestId)
      .maybeSingle()

    if (!existingAgreement) {
      await supabase.from('venue_agreements').insert({
        venue_request_id: requestId,
        quotation_id: quotationId,
        terms: {
          deposit: '20% payable upon acceptance',
          cancellation_policy: 'Full refund 14 days prior to event load-in',
          jurisdiction: 'Standard institutional operations agreement'
        },
        agreement_status: 'awaiting_otp',
        version: 1
      })
    }
  }
}

// --------------------------------------------------------------------
// Agreements & Secure OTP Verification
// --------------------------------------------------------------------
export async function fetchAgreementByRequest(requestId: string): Promise<VenueAgreement | null> {
  const { data, error } = await supabase
    .from('venue_agreements')
    .select('*, quotation:venue_quotations(*)')
    .eq('venue_request_id', requestId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as VenueAgreement | null
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

export async function sendOtpChallenge(
  agreementId: string,
  destination = 'authorized-rep@hackos.app'
): Promise<{ success: boolean; devCode?: string; message: string }> {
  const { data, error } = await supabase.functions.invoke('agreement-otp', {
    body: { action: 'send', agreementId }
  })

  if (error) throw new Error(error.message)

  const response = (data ?? {}) as { error?: string; success?: boolean; devCode?: string; message?: string }

  if (response.error) throw new Error(response.error)

  return {
    success: Boolean(response.success),
    devCode: response.devCode,
    message: response.message || `Verification code sent to ${destination}.`
  }
}

export async function verifyOtpAndAcceptAgreement(
  agreementId: string,
  code: string
): Promise<{ success: boolean; message: string; documentPath?: string }> {
  const { data, error } = await supabase.functions.invoke('agreement-otp', {
    body: { action: 'verify', agreementId, code }
  })

  if (error) {
    return { success: false, message: error.message }
  }

  const response = (data ?? {}) as { error?: string; success?: boolean; message?: string; documentPath?: string }

  if (response.error) {
    return { success: false, message: response.error }
  }

  if (!response.success) {
    return { success: false, message: response.message || 'Agreement acceptance failed.' }
  }

  return { success: true, message: response.message || 'Agreement OTP verified and accepted successfully.', documentPath: response.documentPath }
}
