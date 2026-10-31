-- ====================================================================
-- HACKOS SUPABASE INITIAL SCHEMA
-- Migration: 20261031000001_initial_schema.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'ada'),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 2. USER ROLES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'participant', 'venue_authority')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- --------------------------------------------------------------------
-- 3. ORGANIZATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_user_id);

-- --------------------------------------------------------------------
-- 4. ORGANIZATION MEMBERS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL DEFAULT 'member' CHECK (membership_role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- --------------------------------------------------------------------
-- 5. VENUES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  facilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  contact_email TEXT,
  contact_phone TEXT,
  authorized_rep_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venues_owner ON public.venues(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(verification_status);

-- --------------------------------------------------------------------
-- 6. VENUE DOCUMENTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_docs_venue ON public.venue_documents(venue_id);

-- --------------------------------------------------------------------
-- 11. EVENTS (Created before venue_requests so foreign key works cleanly)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  banner_url TEXT,
  category TEXT,
  format TEXT NOT NULL DEFAULT 'offline' CHECK (format IN ('online', 'offline', 'hybrid')),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  duration_hours INTEGER DEFAULT 24,
  registration_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  registration_open_at TIMESTAMPTZ,
  registration_close_at TIMESTAMPTZ,
  maximum_participants INTEGER,
  maximum_teams INTEGER,
  minimum_team_size INTEGER NOT NULL DEFAULT 1,
  maximum_team_size INTEGER NOT NULL DEFAULT 4,
  eligibility TEXT,
  rules TEXT,
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'pending_venue', 'ready', 'published', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_event_dates CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at),
  CONSTRAINT chk_team_sizes CHECK (maximum_team_size >= minimum_team_size AND minimum_team_size >= 1)
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(publication_status);

-- --------------------------------------------------------------------
-- 7. VENUE REQUESTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_start TIMESTAMPTZ NOT NULL,
  requested_end TIMESTAMPTZ NOT NULL,
  expected_participants INTEGER DEFAULT 0,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'quoted', 'accepted', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_requests_venue ON public.venue_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_requests_event ON public.venue_requests(event_id);

-- --------------------------------------------------------------------
-- 8. VENUE QUOTATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_request_id UUID NOT NULL REFERENCES public.venue_requests(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  itemized_costs JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  validity_date DATE,
  quotation_status TEXT NOT NULL DEFAULT 'submitted' CHECK (quotation_status IN ('draft', 'submitted', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotations_request ON public.venue_quotations(venue_request_id);

-- --------------------------------------------------------------------
-- 9. VENUE AGREEMENTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_request_id UUID NOT NULL REFERENCES public.venue_requests(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES public.venue_quotations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  agreement_document_path TEXT,
  agreement_status TEXT NOT NULL DEFAULT 'draft' CHECK (agreement_status IN ('draft', 'awaiting_otp', 'accepted', 'voided')),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreements_request ON public.venue_agreements(venue_request_id);

-- --------------------------------------------------------------------
-- 10. AGREEMENT AUDIT LOGS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agreement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.venue_agreements(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_agreement ON public.agreement_audit_logs(agreement_id);

-- --------------------------------------------------------------------
-- OTP CHALLENGES (for secure, rate-limited OTP verification)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.venue_agreements(id) ON DELETE CASCADE,
  phone_or_email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_agreement ON public.venue_otp_challenges(agreement_id);

-- --------------------------------------------------------------------
-- 12. EVENT ROUNDS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  round_type TEXT NOT NULL DEFAULT 'offline' CHECK (round_type IN ('online', 'offline')),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  submission_requirements TEXT,
  evaluation_criteria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_rounds_event ON public.event_rounds(event_id);

-- --------------------------------------------------------------------
-- 13. EVENT SPONSORS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_path TEXT,
  website TEXT,
  contribution_details TEXT,
  sponsorship_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event ON public.event_sponsors(event_id);

-- --------------------------------------------------------------------
-- 14. EVENT ARRANGEMENTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  meals_details TEXT,
  refreshments_details TEXT,
  accommodation_details TEXT,
  infrastructure_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

-- --------------------------------------------------------------------
-- 15. EVENT ANNOUNCEMENTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_event ON public.event_announcements(event_id);

-- --------------------------------------------------------------------
-- 16. TEAMS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_teams_event ON public.teams(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.teams(team_leader_id);

-- --------------------------------------------------------------------
-- 17. TEAM MEMBERS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  invitation_status TEXT NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);

-- --------------------------------------------------------------------
-- 18. APPLICATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  application_status TEXT NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'waived', 'refunded')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_event ON public.applications(event_id);
CREATE INDEX IF NOT EXISTS idx_applications_team ON public.applications(team_id);

-- --------------------------------------------------------------------
-- 19. JUDGING CRITERIA
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.judging_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_criteria_event ON public.judging_criteria(event_id);

-- --------------------------------------------------------------------
-- 20. JUDGING SCORES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.judging_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.judging_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  comments TEXT,
  entered_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, team_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_event ON public.judging_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_team ON public.judging_scores(team_id);

-- --------------------------------------------------------------------
-- 21. EVENT RESULTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  total_score NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  rank INTEGER NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'draft' CHECK (result_status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_results_event ON public.event_results(event_id);

-- --------------------------------------------------------------------
-- 22. NOTIFICATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- --------------------------------------------------------------------
-- 23. ACTIVITY LOGS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Auto-update updated_at helper function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

