import { supabase } from '../lib/supabase'
import type {
  EventVerification,
  EventVerificationTermsAcceptance,
  EventVerificationAuditLog,
  PublicHackathonVerification,
  HackathonVerificationStatus
} from '../types/database'

export const CURRENT_TERMS_VERSION = '1.0'

export const ORGANIZER_VERIFICATION_TERMS_TEXT = `HACKOS ORGANIZER VERIFICATION & ACCOUNTABILITY DECLARATION (v1.0)

1. ACCURACY OF SUBMISSION:
The submitting organizer confirms that all information provided in this verification submission, including the hackathon name, format, venue details, and event dates, is true, complete, and accurate.

2. AUTHENTICITY OF VENUE AUTHORIZATION:
The organizer declares that the submitted official venue authorization letter is genuine, authentic, and obtained directly from an authorized representative of the stated venue with express permission to host the identified hackathon.

3. VENUE & REPRESENTATIVE AUTHORIZATION:
The organizer confirms that the venue authority and its named representative have officially acknowledged the hackathon, verified the proposed dates and duration, and agreed to provide the facilities stated in the authorization letter.

4. ORGANIZER OPERATIONAL RESPONSIBILITY:
The organizer accepts full operational responsibility for conducting the hackathon, overseeing attendee management, ensuring participant safety within the scope of organizer responsibilities, and complying with all applicable local regulations and venue policies.

5. COMPLIANCE WITH VENUE RULES:
The organizer agrees to strictly abide by the rules, premises guidelines, safety protocols, and operational constraints established by the venue authority and any associated venue agreements.

6. NO MISREPRESENTATION:
The organizer shall not falsely represent, exaggerate, or misstate venue approval, official endorsements, sponsorship, or institutional affiliations to participants, sponsors, or the public.

7. MANDATORY DISCLOSURE OF MATERIAL CHANGES:
Any material alteration to the hackathon's venue, scheduled dates, duration, format, or foundational arrangements must be immediately disclosed to HACKOS and the venue authority. Such changes invalidate the current verification and require renewed review.

8. SUSPENSION AND REVOCATION:
HACKOS reserves the explicit authority to suspend, revoke, or mark as invalid the verification status of any hackathon if evidence is determined to be false, fraudulent, altered, misleading, or withdrawn by the venue authority.`

/**
 * Fetch the verification record for a specific event
 */
export async function fetchEventVerification(eventId: string): Promise<EventVerification | null> {
  const { data, error } = await supabase
    .from('event_verifications')
    .select('*, event:events(*)')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching event verification:', error)
    return null
  }
  return data as EventVerification | null
}

/**
 * Fetch public verification safe details for an event
 */
export async function fetchPublicVerification(eventId: string): Promise<PublicHackathonVerification | null> {
  const { data, error } = await supabase
    .from('public_hackathon_verifications')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching public verification:', error)
    return null
  }
  return data as PublicHackathonVerification | null
}

/**
 * Fetch terms acceptances history for a verification record
 */
export async function fetchVerificationTermsAcceptances(verificationId: string): Promise<EventVerificationTermsAcceptance[]> {
  const { data, error } = await supabase
    .from('event_verification_terms_acceptances')
    .select('*')
    .eq('verification_id', verificationId)
    .order('accepted_at', { ascending: false })

  if (error) throw error
  return (data || []) as EventVerificationTermsAcceptance[]
}

/**
 * Fetch audit logs for an event's verification history
 */
export async function fetchVerificationAuditLogs(eventId: string): Promise<EventVerificationAuditLog[]> {
  const { data, error } = await supabase
    .from('event_verification_audit_logs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as EventVerificationAuditLog[]
}

/**
 * Upload an official venue authorization letter to private storage
 */
export async function uploadVerificationDocument(
  eventId: string,
  file: File
): Promise<{ path: string; filename: string; size: number; mimeType: string }> {
  // Validate file size (max 20MB)
  const maxBytes = 20 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error('File size exceeds the 20MB limit.')
  }

  // Validate mime type
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file format. Allowed formats: PDF, PNG, JPG, WEBP.')
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const storagePath = `${eventId}/v_${timestamp}_${cleanName}`

  const { error: uploadErr } = await supabase.storage
    .from('verification-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadErr) {
    throw new Error(`Upload failed: ${uploadErr.message}`)
  }

  return {
    path: storagePath,
    filename: file.name,
    size: file.size,
    mimeType: file.type
  }
}

/**
 * Generate a short-lived signed URL to securely preview a private verification document
 */
export async function getSignedVerificationDocUrl(path: string, expiresIn = 3600): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('verification-documents')
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error)
    return null
  }
  return data.signedUrl
}

export interface SubmitVerificationPayload {
  eventId: string
  venueName: string
  venueAddress: string
  representativeName: string
  representativeDesignation: string
  representativeContact?: string
  eventNameConfirmed: string
  startAtConfirmed: string
  endAtConfirmed: string
  durationHoursConfirmed?: number
  documentStoragePath: string
  documentFilename: string
  documentFileSize: number
  documentMimeType: string
  termsVersion?: string
  acceptedTermsText?: string
  confirmedAccurate: boolean
  confirmedAuthentic: boolean
}

/**
 * Submit or replace official verification for a hackathon
 */
export async function submitVerification(payload: SubmitVerificationPayload): Promise<{
  success: boolean
  message: string
  verification_id?: string
}> {
  const { data, error } = await supabase.rpc('submit_hackathon_verification', {
    p_event_id: payload.eventId,
    p_venue_name: payload.venueName,
    p_venue_address: payload.venueAddress,
    p_representative_name: payload.representativeName,
    p_representative_designation: payload.representativeDesignation,
    p_representative_contact: payload.representativeContact || null,
    p_event_name_confirmed: payload.eventNameConfirmed,
    p_start_at_confirmed: payload.startAtConfirmed,
    p_end_at_confirmed: payload.endAtConfirmed,
    p_duration_hours_confirmed: payload.durationHoursConfirmed || 24,
    p_document_storage_path: payload.documentStoragePath,
    p_document_filename: payload.documentFilename,
    p_document_file_size: payload.documentFileSize,
    p_document_mime_type: payload.documentMimeType,
    p_terms_version: payload.termsVersion || CURRENT_TERMS_VERSION,
    p_accepted_terms_text: payload.acceptedTermsText || ORGANIZER_VERIFICATION_TERMS_TEXT,
    p_confirmed_accurate: payload.confirmedAccurate,
    p_confirmed_authentic: payload.confirmedAuthentic
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return {
    success: true,
    message: data?.message || 'Verification submitted successfully.',
    verification_id: data?.verification_id
  }
}

/**
 * Reviewer / Admin: Fetch all verification submissions
 */
export async function fetchAllVerifications(statusFilter?: HackathonVerificationStatus): Promise<EventVerification[]> {
  let query = supabase
    .from('event_verifications')
    .select('*, event:events(*)')
    .order('updated_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as EventVerification[]
}

export interface ReviewVerificationPayload {
  verificationId: string
  action: 'approve' | 'reject' | 'request_info' | 'suspend' | 'revoke'
  reason?: string
  notes?: string
  publicSummary?: string
  letterPublic?: boolean
}

/**
 * Reviewer / Admin: Review a hackathon verification (approve, reject, request info, suspend, revoke)
 */
export async function reviewVerification(payload: ReviewVerificationPayload): Promise<{
  success: boolean
  message: string
}> {
  const { data, error } = await supabase.rpc('review_hackathon_verification', {
    p_verification_id: payload.verificationId,
    p_action: payload.action,
    p_reason: payload.reason || null,
    p_notes: payload.notes || null,
    p_public_summary: payload.publicSummary || null,
    p_letter_public: Boolean(payload.letterPublic)
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return {
    success: true,
    message: data?.message || `Verification action ${payload.action} completed.`
  }
}

