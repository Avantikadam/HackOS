export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'organizer'
  | 'venue_admin'
  | 'venue_authority'
  | 'team_leader'
  | 'participant'
  | 'judge'
  | 'volunteer_scanner'
export type RoleStatus = 'pending' | 'active' | 'rejected' | 'suspended'
export type VenueVerificationStatus = 'pending' | 'verified' | 'rejected'
export type VenueRequestStatus = 'pending' | 'quoted' | 'accepted' | 'rejected' | 'cancelled'
export type QuotationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected'
export type AgreementStatus = 'draft' | 'awaiting_otp' | 'accepted' | 'voided'
export type EventPublicationStatus = 'draft' | 'pending_venue' | 'ready' | 'published' | 'closed' | 'cancelled'
export type EventFormat = 'online' | 'offline' | 'hybrid'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type PaymentStatus = 'pending' | 'paid' | 'waived' | 'refunded'
export type InvitationStatus = 'pending' | 'accepted' | 'declined'
export type ResultStatus = 'draft' | 'published'
export type HackathonVerificationStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'additional_info_required'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'revoked'
  | 'expired'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
  status: RoleStatus
  created_at: string
}

export interface Organization {
  id: string
  name: string
  owner_user_id: string
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  created_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  membership_role: 'owner' | 'admin' | 'member'
  status: 'active' | 'pending' | 'inactive'
  created_at: string
}

export interface Venue {
  id: string
  owner_user_id: string
  venue_name: string
  address: string | null
  city: string | null
  state: string | null
  capacity: number
  facilities: Record<string, boolean | string | number>
  verification_status: VenueVerificationStatus
  contact_email: string | null
  contact_phone: string | null
  authorized_rep_name: string | null
  created_at: string
}

export interface VenueDocument {
  id: string
  venue_id: string
  document_type: string
  storage_path: string
  verification_status: VenueVerificationStatus
  uploaded_by: string
  created_at: string
}

export interface VenueRequest {
  id: string
  event_id: string
  venue_id: string
  organizer_id: string
  requested_start: string
  requested_end: string
  expected_participants: number
  requirements: Record<string, unknown>
  request_status: VenueRequestStatus
  notes: string | null
  created_at: string
  venue?: Venue
  event?: Event
  organizer?: Profile
}

export interface VenueQuotation {
  id: string
  venue_request_id: string
  version: number
  itemized_costs: Array<{ item: string; amount: number; qty?: string; notes?: string }>
  total_amount: number
  notes: string | null
  validity_date: string | null
  quotation_status: QuotationStatus
  created_at: string
}

export interface VenueAgreement {
  id: string
  venue_request_id: string
  quotation_id: string
  version: number
  terms: Record<string, unknown>
  agreement_document_path: string | null
  agreement_status: AgreementStatus
  accepted_by: string | null
  accepted_at: string | null
  otp_verified_at: string | null
  created_at: string
}

export interface AgreementAuditLog {
  id: string
  agreement_id: string
  actor_user_id: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface VenueOtpChallenge {
  id: string
  agreement_id: string
  phone_or_email: string
  otp_hash: string
  otp_salt: string | null
  expires_at: string
  verified_at: string | null
  consumed_at: string | null
  attempts: number
  created_at: string
}

export interface Event {
  id: string
  organizer_id: string
  organization_id: string | null
  name: string
  description: string | null
  detailed_description: string | null
  banner_url: string | null
  category: string | null
  format: EventFormat
  start_at: string | null
  end_at: string | null
  duration_hours: number | null
  registration_fee: number
  registration_open_at: string | null
  registration_close_at: string | null
  maximum_participants: number | null
  maximum_teams: number | null
  minimum_team_size: number
  maximum_team_size: number
  eligibility: string | null
  rules: string | null
  publication_status: EventPublicationStatus
  verification_status?: HackathonVerificationStatus
  verified_at?: string | null
  created_at: string
  updated_at: string
  venue_request?: VenueRequest
  venue?: Venue
}

export interface EventRound {
  id: string
  event_id: string
  name: string
  description: string | null
  round_type: 'online' | 'offline'
  start_at: string | null
  end_at: string | null
  sequence_number: number
  submission_requirements: string | null
  evaluation_criteria: string | null
  created_at: string
}

export interface EventSponsor {
  id: string
  event_id: string
  name: string
  logo_path: string | null
  website: string | null
  contribution_details: string | null
  sponsorship_category: string | null
  created_at: string
}

export interface EventArrangement {
  id: string
  event_id: string
  meals_details: string | null
  refreshments_details: string | null
  accommodation_details: string | null
  infrastructure_details: string | null
  created_at: string
}

export interface EventAnnouncement {
  id: string
  event_id: string
  title: string
  body: string
  created_by: string
  published_at: string
}

export interface Team {
  id: string
  event_id: string
  team_name: string
  team_leader_id: string
  team_code?: string | null
  max_team_size?: number
  created_at: string
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string | null
  name: string
  email: string
  invitation_status: InvitationStatus
  created_at: string
}

export interface Application {
  id: string
  event_id: string
  team_id: string
  application_status: ApplicationStatus
  payment_status: PaymentStatus
  submitted_at: string
  team?: Team
  event?: Event
}

export interface JudgingCriterion {
  id: string
  event_id: string
  name: string
  description: string | null
  weight: number
  sequence_number: number
  created_at: string
}

export interface JudgingScore {
  id: string
  event_id: string
  team_id: string
  criterion_id: string
  score: number
  comments: string | null
  entered_by: string
  updated_at: string
}

export interface EventResult {
  id: string
  event_id: string
  team_id: string
  total_score: number
  rank: number
  result_status: ResultStatus
  published_at: string | null
  created_at: string
  team?: Team
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  notification_type: string
  read_at: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  actor_user_id: string
  entity_type: string
  entity_id: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface EventVerification {
  id: string
  event_id: string
  organizer_id: string
  status: HackathonVerificationStatus
  venue_name: string
  venue_address: string
  representative_name: string
  representative_designation: string
  representative_contact: string | null
  event_name_confirmed: string
  start_at_confirmed: string
  end_at_confirmed: string
  duration_hours_confirmed: number | null
  document_storage_path: string
  document_filename: string
  document_file_size: number | null
  document_mime_type: string | null
  document_version: number
  letter_public: boolean
  terms_version: string
  terms_accepted_at: string
  submitted_at: string
  submitted_by: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  reviewer_notes: string | null
  rejection_reason: string | null
  clarification_request: string | null
  verified_at: string | null
  public_summary: string | null
  institutional_domain_id?: string | null
  institutional_confirmation_status?: 'unconfirmed' | 'requested' | 'confirmed' | 'rejected'
  institutional_confirmed_at?: string | null
  institutional_confirmed_by?: string | null
  created_at: string
  updated_at: string
  event?: Event
}

export interface EventVerificationTermsAcceptance {
  id: string
  verification_id: string
  event_id: string
  organizer_id: string
  terms_version: string
  accepted_terms_text: string
  confirmed_accurate: boolean
  confirmed_authentic: boolean
  ip_address: string | null
  metadata: Record<string, unknown>
  accepted_at: string
}

export interface EventVerificationAuditLog {
  id: string
  event_id: string
  verification_id: string | null
  actor_user_id: string | null
  action: string
  document_version: number
  previous_status: string | null
  new_status: string | null
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface PublicHackathonVerification {
  event_id: string
  verification_status: HackathonVerificationStatus
  venue_name: string
  venue_address: string
  verified_at: string | null
  public_summary: string | null
  letter_public: boolean
  public_document_path: string | null
  institution_name?: string | null
  institutional_domain?: string | null
  institutional_confirmation_status?: string | null
}

export interface InstitutionalDomain {
  id: string
  institution_name: string
  approved_domain: string
  official_website: string | null
  institution_category: 'University' | 'Autonomous Institute' | 'Research Lab' | 'Government' | 'Private Institution'
  official_contact_source: string | null
  verification_status: 'verified' | 'pending' | 'suspended'
  added_by: string | null
  last_reviewed_at: string
  created_at: string
}

export interface ParticipantQrPass {
  id: string
  event_id: string
  user_id: string
  application_id?: string | null
  qr_token: string
  is_active: boolean
  created_at: string
  event?: Event
}

export interface EventAttendanceRecord {
  id: string
  event_id: string
  qr_pass_id: string
  participant_id: string
  scanned_by: string | null
  client_scan_id: string
  scanned_at: string
  synced_at: string
  sync_device_info: Record<string, unknown>
  participant_profile?: Profile
  event?: Event
}

export interface ProjectSubmission {
  id: string
  event_id: string
  team_id: string
  submitted_by: string
  title: string
  description: string
  github_url: string
  demo_url?: string | null
  presentation_storage_path?: string | null
  version: number
  submission_status: 'submitted' | 'under_review' | 'evaluated' | 'flagged'
  submitted_at: string
  updated_at: string
  team?: Team
  event?: Event
}

export interface JudgeAssignment {
  id: string
  event_id: string
  judge_id: string
  assigned_by?: string | null
  assigned_at: string
  event?: Event
  judge_profile?: Profile
}

export interface RubricScoreItem {
  criterion_id: string
  score: number
  comments?: string
}

export interface EvaluationSubmissionPayload {
  event_id: string
  team_id: string
  scores: RubricScoreItem[]
  general_comments?: string
}


