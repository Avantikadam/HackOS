import { supabase } from '../lib/supabase'
import type { InstitutionalDomain } from '../types/database'

export interface DomainMatchResult {
  is_approved: boolean
  matched_domain: string | null
  institution_name: string | null
  official_website: string | null
  institution_category: string | null
}

export interface MailboxScreenResult {
  is_admin_signal: boolean
  is_student_signal: boolean
  local_part: string
}

export async function fetchInstitutionalDomains(): Promise<InstitutionalDomain[]> {
  const { data, error } = await supabase
    .from('institutional_domains')
    .select('*')
    .order('institution_name', { ascending: true })

  if (error) {
    console.error('Error fetching institutional domains:', error)
    return []
  }
  return data as InstitutionalDomain[]
}

export async function createInstitutionalDomain(payload: {
  institution_name: string
  approved_domain: string
  official_website?: string
  institution_category: 'University' | 'Autonomous Institute' | 'Research Lab' | 'Government' | 'Private Institution'
  official_contact_source?: string
}): Promise<InstitutionalDomain> {
  const { data, error } = await supabase
    .from('institutional_domains')
    .insert({
      institution_name: payload.institution_name.trim(),
      approved_domain: payload.approved_domain.trim().toLowerCase(),
      official_website: payload.official_website?.trim() || null,
      institution_category: payload.institution_category,
      official_contact_source: payload.official_contact_source?.trim() || null,
      verification_status: 'verified',
    })
    .select()
    .single()

  if (error) throw error
  return data as InstitutionalDomain
}

export async function updateInstitutionalDomainStatus(
  id: string,
  verification_status: 'verified' | 'pending' | 'suspended'
): Promise<void> {
  const { error } = await supabase
    .from('institutional_domains')
    .update({ verification_status, last_reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function matchInstitutionalDomain(email: string): Promise<DomainMatchResult> {
  if (!email || !email.includes('@')) {
    return {
      is_approved: false,
      matched_domain: null,
      institution_name: null,
      official_website: null,
      institution_category: null,
    }
  }

  const { data, error } = await supabase.rpc('match_institutional_domain', { p_email: email })
  if (error) {
    console.error('Error matching institutional domain:', error)
    return {
      is_approved: false,
      matched_domain: null,
      institution_name: null,
      official_website: null,
      institution_category: null,
    }
  }

  const res = Array.isArray(data) ? data[0] : data
  return (
    res || {
      is_approved: false,
      matched_domain: null,
      institution_name: null,
      official_website: null,
      institution_category: null,
    }
  )
}

export async function screenAdministrativeMailbox(email: string): Promise<MailboxScreenResult> {
  if (!email || !email.includes('@')) {
    return { is_admin_signal: false, is_student_signal: false, local_part: '' }
  }

  const { data, error } = await supabase.rpc('screen_administrative_mailbox', { p_email: email })
  if (error) {
    console.error('Error screening administrative mailbox:', error)
    return { is_admin_signal: false, is_student_signal: false, local_part: '' }
  }

  return data as MailboxScreenResult
}

