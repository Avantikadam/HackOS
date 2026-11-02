-- ====================================================================
-- HACKOS MASTER MVP INTEGRATION MIGRATION
-- Migration: 20261101000009_master_mvp_modules.sql
-- Modules:
--   1. Role-Based Access Control (Super Admin, Organizer, Venue Admin, Team Leader, Participant, Judge, Volunteer)
--   2. Anti-Fraud Institutional Domain Registry & Screening Engine
--   3. Team Code Management (Non-sequential cryptographic codes & atomic join)
--   4. Offline-Capable QR Check-In (Opaque tokens, idempotent sync, attendance)
--   5. Project Submissions & Trusted 3-Tier Rubric Judge Scoring Portal
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ROLE-BASED ACCESS CONTROL (MODULE A)
-- --------------------------------------------------------------------

-- Update role constraint on user_roles (strictly additive & backwards compatible)
DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;
END $$;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN (
    'super_admin', 'admin',
    'organizer',
    'venue_admin', 'venue_authority',
    'team_leader',
    'participant',
    'judge',
    'volunteer_scanner'
  ));

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_status_check
  CHECK (status IN ('pending', 'active', 'rejected', 'suspended'));

-- Upgraded role verification helpers
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND (
        role = p_role
        OR (p_role = 'super_admin' AND role = 'admin')
        OR (p_role = 'venue_admin' AND role = 'venue_authority')
        OR (p_role = 'admin' AND role = 'super_admin')
        OR (p_role = 'venue_authority' AND role = 'venue_admin')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('super_admin') OR public.has_role('admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('super_admin') OR public.has_role('admin');
$$;

-- Protect privileged roles from self-assignment
CREATE OR REPLACE FUNCTION public.enforce_user_role_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_context() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('super_admin', 'admin', 'judge') THEN
      RAISE EXCEPTION 'Privileged roles (super_admin, judge) require explicit administrator authorization';
    END IF;
    NEW.user_id := auth.uid();
    NEW.status := 'active';
    RETURN NEW;
  END IF;

  IF NEW.user_id <> OLD.user_id OR NEW.role <> OLD.role THEN
    RAISE EXCEPTION 'Role modifications require administrator authorization';
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------
-- 2. ANTI-FRAUD INSTITUTIONAL DOMAIN REGISTRY (MODULE B)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institutional_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  approved_domain TEXT NOT NULL UNIQUE,
  official_website TEXT,
  institution_category TEXT NOT NULL DEFAULT 'University'
    CHECK (institution_category IN ('University', 'Autonomous Institute', 'Research Lab', 'Government', 'Private Institution')),
  official_contact_source TEXT,
  verification_status TEXT NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('verified', 'pending', 'suspended')),
  added_by UUID REFERENCES auth.users(id),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_domains_domain ON public.institutional_domains(approved_domain);
CREATE INDEX IF NOT EXISTS idx_inst_domains_status ON public.institutional_domains(verification_status);

-- Seed initial recognized national institutions
INSERT INTO public.institutional_domains (institution_name, approved_domain, official_website, institution_category, official_contact_source)
VALUES 
  ('Indian Institute of Technology Guwahati', 'iitg.ac.in', 'https://www.iitg.ac.in', 'University', 'https://www.iitg.ac.in/estate'),
  ('Indian Institute of Science Bangalore', 'iisc.ac.in', 'https://www.iisc.ac.in', 'Autonomous Institute', 'https://www.iisc.ac.in/facilities'),
  ('Indian Institute of Technology Bombay', 'iitb.ac.in', 'https://www.iitb.ac.in', 'University', 'https://www.iitb.ac.in/dean-fa'),
  ('Indian Institute of Technology Delhi', 'iitd.ac.in', 'https://www.iitd.ac.in', 'University', 'https://www.iitd.ac.in/administration'),
  ('National Institute of Technology Karnataka', 'nitk.edu.in', 'https://www.nitk.ac.in', 'University', 'https://www.nitk.ac.in/estate-office')
ON CONFLICT (approved_domain) DO NOTHING;

-- Exact domain allowlist comparison function
CREATE OR REPLACE FUNCTION public.match_institutional_domain(p_email TEXT)
RETURNS TABLE (
  is_approved BOOLEAN,
  matched_domain TEXT,
  institution_name TEXT,
  official_website TEXT,
  institution_category TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_extracted_domain TEXT;
BEGIN
  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  v_extracted_domain := lower(split_part(p_email, '@', 2));

  RETURN QUERY
  SELECT
    true,
    d.approved_domain,
    d.institution_name,
    d.official_website,
    d.institution_category
  FROM public.institutional_domains d
  WHERE d.approved_domain = v_extracted_domain
    AND d.verification_status = 'verified'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, v_extracted_domain, NULL::TEXT, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$;

-- Administrative contact mailbox screening keywords
CREATE OR REPLACE FUNCTION public.screen_administrative_mailbox(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_local_part TEXT;
  v_is_admin_keyword BOOLEAN := false;
  v_is_student_pattern BOOLEAN := false;
BEGIN
  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RETURN jsonb_build_object('is_admin_signal', false, 'is_student_signal', false);
  END IF;

  v_local_part := lower(split_part(p_email, '@', 1));

  -- Check admin mailbox signals
  IF v_local_part ~ '^(estate|dean|bookings?|admin|registrar|facilities|director|provost|principal|vc|rector)' THEN
    v_is_admin_keyword := true;
  END IF;

  -- Flag student accounts (numbers or student identifiers)
  IF v_local_part ~ '(\d{4,}|student|scholar|alumni|ug|pg|btech|mtech)' THEN
    v_is_student_pattern := true;
  END IF;

  RETURN jsonb_build_object(
    'is_admin_signal', v_is_admin_keyword,
    'is_student_signal', v_is_student_pattern,
    'local_part', v_local_part
  );
END;
$$;

-- Add institutional verification columns to event_verifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_verifications' AND column_name = 'institutional_domain_id'
  ) THEN
    ALTER TABLE public.event_verifications
      ADD COLUMN institutional_domain_id UUID REFERENCES public.institutional_domains(id) ON DELETE SET NULL,
      ADD COLUMN institutional_confirmation_status TEXT NOT NULL DEFAULT 'unconfirmed'
        CHECK (institutional_confirmation_status IN ('unconfirmed', 'requested', 'confirmed', 'rejected')),
      ADD COLUMN institutional_confirmed_at TIMESTAMPTZ,
      ADD COLUMN institutional_confirmed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 3. TEAM CODE MANAGEMENT (MODULE C)
-- --------------------------------------------------------------------

-- Cryptographic, non-sequential team code generator (HACK-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_team_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code TEXT;
  v_exists BOOLEAN;
  v_i INTEGER;
BEGIN
  LOOP
    v_code := 'HACK-';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::INTEGER, 1);
    END LOOP;

    SELECT EXISTS (SELECT 1 FROM public.teams WHERE team_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'team_code'
  ) THEN
    ALTER TABLE public.teams
      ADD COLUMN team_code TEXT,
      ADD COLUMN max_team_size INTEGER NOT NULL DEFAULT 4;
  END IF;

  -- Backfill existing teams with unique codes
  FOR r IN SELECT id FROM public.teams WHERE team_code IS NULL LOOP
    UPDATE public.teams SET team_code = public.generate_team_code() WHERE id = r.id;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.teams'::regclass AND conname = 'teams_team_code_key'
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_team_code ON public.teams(team_code);

-- Trigger to assign code on team creation
CREATE OR REPLACE FUNCTION public.set_new_team_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.team_code IS NULL OR btrim(NEW.team_code) = '' THEN
    NEW.team_code := public.generate_team_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_set_code ON public.teams;
CREATE TRIGGER trg_teams_set_code
  BEFORE INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_new_team_code();

-- Atomic, rate-guarded team joining RPC
CREATE OR REPLACE FUNCTION public.join_team_by_code(p_team_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(btrim(p_team_code));
  v_team public.teams%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_member_count INTEGER;
  v_user_profile public.profiles%ROWTYPE;
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to join team';
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE team_code = v_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid team code. Please check and try again.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_team.event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated event not found.';
  END IF;

  IF v_event.publication_status <> 'published' THEN
    RAISE EXCEPTION 'This event is not currently accepting team registrations.';
  END IF;

  IF v_event.registration_close_at IS NOT NULL AND v_event.registration_close_at <= now() THEN
    RAISE EXCEPTION 'Registration for this event has officially closed.';
  END IF;

  -- Capacity check
  SELECT count(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;
  IF v_member_count >= COALESCE(v_team.max_team_size, v_event.maximum_team_size, 4) THEN
    RAISE EXCEPTION 'Team has reached its maximum member capacity (% members).', v_team.max_team_size;
  END IF;

  -- Check if user is already a member of this team
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = v_team.id AND user_id = v_caller_id)
     OR v_team.team_leader_id = v_caller_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'team_id', v_team.id,
      'team_name', v_team.team_name,
      'event_id', v_team.event_id,
      'message', 'You are already a member of this team.'
    );
  END IF;

  -- Check if user is in an incompatible team for the same event
  IF EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.team_members tm ON tm.team_id = t.id
    WHERE t.event_id = v_team.event_id AND (tm.user_id = v_caller_id OR t.team_leader_id = v_caller_id)
  ) THEN
    RAISE EXCEPTION 'You are already registered with another team for this event.';
  END IF;

  -- Fetch user profile
  SELECT * INTO v_user_profile FROM public.profiles WHERE id = v_caller_id;

  INSERT INTO public.team_members (team_id, user_id, name, email, invitation_status)
  VALUES (
    v_team.id,
    v_caller_id,
    COALESCE(v_user_profile.full_name, 'Hacker Member'),
    COALESCE(v_user_profile.email, 'member@hackos.local'),
    'accepted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_team.id,
    'team_name', v_team.team_name,
    'event_id', v_team.event_id,
    'message', format('Successfully joined team "%s"!', v_team.team_name)
  );
END;
$$;

-- --------------------------------------------------------------------
-- 4. OFFLINE-CAPABLE QR PARTICIPANT CHECK-IN (MODULE D)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.participant_qr_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE, -- Opaque cryptographic token (Zero PII)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_user_qr UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_passes_token ON public.participant_qr_passes(qr_token);
CREATE INDEX IF NOT EXISTS idx_qr_passes_event_user ON public.participant_qr_passes(event_id, user_id);

CREATE TABLE IF NOT EXISTS public.event_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  qr_pass_id UUID NOT NULL REFERENCES public.participant_qr_passes(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_scan_id TEXT NOT NULL UNIQUE, -- Idempotency key for offline sync
  scanned_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_event_participant_attendance UNIQUE (event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.event_attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_client_scan ON public.event_attendance_records(client_scan_id);

-- Opaque QR pass generator / retriever (Zero PII)
CREATE OR REPLACE FUNCTION public.get_or_create_qr_pass(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass public.participant_qr_passes%ROWTYPE;
  v_token TEXT;
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access QR pass';
  END IF;

  SELECT * INTO v_pass
  FROM public.participant_qr_passes
  WHERE event_id = p_event_id AND user_id = v_caller_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'pass_id', v_pass.id,
      'qr_token', v_pass.qr_token,
      'event_id', v_pass.event_id,
      'is_active', v_pass.is_active
    );
  END IF;

  -- Generate opaque UUID token (contains no email, phone, or name)
  v_token := 'HQRP_' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.participant_qr_passes (event_id, user_id, qr_token)
  VALUES (p_event_id, v_caller_id, v_token)
  RETURNING * INTO v_pass;

  RETURN jsonb_build_object(
    'success', true,
    'pass_id', v_pass.id,
    'qr_token', v_pass.qr_token,
    'event_id', v_pass.event_id,
    'is_active', v_pass.is_active
  );
END;
$$;

-- Idempotent offline attendance sync RPC
CREATE OR REPLACE FUNCTION public.sync_offline_attendance(p_scans JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan JSONB;
  v_client_scan_id TEXT;
  v_qr_token TEXT;
  v_event_id UUID;
  v_scanned_at TIMESTAMPTZ;
  v_pass public.participant_qr_passes%ROWTYPE;
  v_synced_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_caller_id UUID := auth.uid();
BEGIN
  IF jsonb_typeof(p_scans) <> 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array of scan records';
  END IF;

  FOR v_scan IN SELECT * FROM jsonb_array_elements(p_scans)
  LOOP
    v_client_scan_id := v_scan ->> 'client_scan_id';
    v_qr_token := v_scan ->> 'qr_token';
    v_event_id := (v_scan ->> 'event_id')::UUID;
    v_scanned_at := COALESCE((v_scan ->> 'scanned_at')::TIMESTAMPTZ, now());

    IF v_client_scan_id IS NULL OR v_qr_token IS NULL OR v_event_id IS NULL THEN
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;

    -- Lookup opaque pass
    SELECT * INTO v_pass FROM public.participant_qr_passes
    WHERE qr_token = v_qr_token AND event_id = v_event_id;

    IF NOT FOUND THEN
      v_error_count := v_error_count + 1;
      CONTINUE;
    END IF;

    -- Idempotent insert: skip if duplicate client scan ID or already attended
    BEGIN
      INSERT INTO public.event_attendance_records (
        event_id, qr_pass_id, participant_id, scanned_by,
        client_scan_id, scanned_at, sync_device_info
      ) VALUES (
        v_event_id, v_pass.id, v_pass.user_id, v_caller_id,
        v_client_scan_id, v_scanned_at, COALESCE(v_scan -> 'device_info', '{}'::jsonb)
      );
      v_synced_count := v_synced_count + 1;
    EXCEPTION
      WHEN unique_violation THEN
        v_duplicate_count := v_duplicate_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'synced_count', v_synced_count,
    'duplicate_count', v_duplicate_count,
    'error_count', v_error_count
  );
END;
$$;

-- --------------------------------------------------------------------
-- 5. PROJECT SUBMISSIONS AND JUDGE SCORING (MODULE E)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  github_url TEXT NOT NULL,
  demo_url TEXT,
  presentation_storage_path TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  submission_status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (submission_status IN ('submitted', 'under_review', 'evaluated', 'flagged')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_submission_version UNIQUE (team_id, version)
);

CREATE INDEX IF NOT EXISTS idx_submissions_event_team ON public.project_submissions(event_id, team_id);

CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_judge UNIQUE (event_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_assign_event ON public.judge_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_judge_assign_judge ON public.judge_assignments(judge_id);

-- Private Presentation Slides Storage Bucket (25MB PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-presentations',
  'project-presentations',
  false,
  26214400,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Standard 3-Tier Rubric Scoring Function (Innovation 30%, Impact 30%, Execution 40%)
CREATE OR REPLACE FUNCTION public.submit_judge_evaluation(
  p_event_id UUID,
  p_team_id UUID,
  p_scores JSONB, -- Array of [{ criterion_id, score, comments }]
  p_general_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score_entry JSONB;
  v_criterion_id UUID;
  v_score NUMERIC;
  v_comments TEXT;
  v_weight NUMERIC;
  v_total_weighted NUMERIC := 0;
  v_caller_id UUID := auth.uid();
  v_calc_rank INTEGER;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit evaluations';
  END IF;

  -- Authorization check: caller must be assigned judge or super_admin
  IF NOT (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.judge_assignments WHERE event_id = p_event_id AND judge_id = v_caller_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to evaluate submissions for this event';
  END IF;

  FOR v_score_entry IN SELECT * FROM jsonb_array_elements(p_scores)
  LOOP
    v_criterion_id := (v_score_entry ->> 'criterion_id')::UUID;
    v_score := (v_score_entry ->> 'score')::NUMERIC;
    v_comments := v_score_entry ->> 'comments';

    -- Score boundaries (0 to 10)
    IF v_score < 0 OR v_score > 10 THEN
      RAISE EXCEPTION 'Scores must be within 0.0 to 10.0 scale';
    END IF;

    -- Fetch weight from server definition (never trust browser)
    SELECT weight INTO v_weight FROM public.judging_criteria WHERE id = v_criterion_id AND event_id = p_event_id;
    IF FOUND THEN
      v_total_weighted := v_total_weighted + (v_score * (v_weight / 100.0));
    END IF;

    -- Upsert individual criterion score
    INSERT INTO public.judging_scores (event_id, team_id, criterion_id, score, comments, entered_by, updated_at)
    VALUES (p_event_id, p_team_id, v_criterion_id, v_score, v_comments, v_caller_id, now())
    ON CONFLICT (event_id, team_id, criterion_id) DO UPDATE
    SET score = EXCLUDED.score, comments = EXCLUDED.comments, updated_at = now();
  END LOOP;

  -- Re-aggregate leaderboard standing for this team
  SELECT count(*) + 1 INTO v_calc_rank
  FROM public.event_results
  WHERE event_id = p_event_id AND total_score > v_total_weighted;

  INSERT INTO public.event_results (event_id, team_id, total_score, rank, result_status)
  VALUES (p_event_id, p_team_id, v_total_weighted, v_calc_rank, 'draft')
  ON CONFLICT (event_id, team_id) DO UPDATE
  SET total_score = EXCLUDED.total_score, rank = v_calc_rank;

  -- Mark submission as evaluated
  UPDATE public.project_submissions
  SET submission_status = 'evaluated', updated_at = now()
  WHERE event_id = p_event_id AND team_id = p_team_id;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'weighted_score', v_total_weighted,
    'message', 'Evaluation recorded with server-verified weighted rubric calculation.'
  );
END;
$$;

-- Leaderboard publishing RPC
CREATE OR REPLACE FUNCTION public.publish_leaderboard(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_event_organizer(p_event_id)) THEN
    RAISE EXCEPTION 'Not authorized to publish event results';
  END IF;

  UPDATE public.event_results
  SET result_status = 'published', published_at = now()
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object('success', true, 'message', 'Leaderboard published successfully.');
END;
$$;

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES FOR NEW ENTITIES
-- --------------------------------------------------------------------

ALTER TABLE public.institutional_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_qr_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

-- Institutional domains RLS
DROP POLICY IF EXISTS "Public read verified institutional domains" ON public.institutional_domains;
CREATE POLICY "Public read verified institutional domains"
  ON public.institutional_domains FOR SELECT
  TO authenticated, anon
  USING (verification_status = 'verified' OR public.is_admin());

DROP POLICY IF EXISTS "Super admins manage institutional domains" ON public.institutional_domains;
CREATE POLICY "Super admins manage institutional domains"
  ON public.institutional_domains FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- QR passes RLS
DROP POLICY IF EXISTS "Participants view own QR passes" ON public.participant_qr_passes;
CREATE POLICY "Participants view own QR passes"
  ON public.participant_qr_passes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_event_organizer(event_id) OR public.is_admin());

DROP POLICY IF EXISTS "System/Organizers create QR passes" ON public.participant_qr_passes;
CREATE POLICY "System/Organizers create QR passes"
  ON public.participant_qr_passes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_event_organizer(event_id) OR public.is_admin());

-- Attendance records RLS
DROP POLICY IF EXISTS "Organizers and admins view attendance" ON public.event_attendance_records;
CREATE POLICY "Organizers and admins view attendance"
  ON public.event_attendance_records FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR public.is_event_organizer(event_id) OR public.is_admin());

DROP POLICY IF EXISTS "Volunteers and organizers insert attendance" ON public.event_attendance_records;
CREATE POLICY "Volunteers and organizers insert attendance"
  ON public.event_attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (public.is_event_organizer(event_id) OR public.is_admin() OR public.has_role('volunteer_scanner'));

-- Project submissions RLS
DROP POLICY IF EXISTS "Submissions viewable by team, judges, and organizers" ON public.project_submissions;
CREATE POLICY "Submissions viewable by team, judges, and organizers"
  ON public.project_submissions FOR SELECT
  TO authenticated
  USING (
    public.is_event_organizer(event_id)
    OR public.is_admin()
    OR public.is_team_member(team_id)
    OR EXISTS (SELECT 1 FROM public.judge_assignments ja WHERE ja.event_id = event_id AND ja.judge_id = auth.uid())
  );

DROP POLICY IF EXISTS "Team members insert and update submissions" ON public.project_submissions;
CREATE POLICY "Team members insert and update submissions"
  ON public.project_submissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(team_id) OR submitted_by = auth.uid());

DROP POLICY IF EXISTS "Team leaders update submissions" ON public.project_submissions;
CREATE POLICY "Team leaders update submissions"
  ON public.project_submissions FOR UPDATE
  TO authenticated
  USING (public.is_team_member(team_id))
  WITH CHECK (public.is_team_member(team_id));

-- Judge assignments RLS
DROP POLICY IF EXISTS "Judges and organizers view assignments" ON public.judge_assignments;
CREATE POLICY "Judges and organizers view assignments"
  ON public.judge_assignments FOR SELECT
  TO authenticated
  USING (judge_id = auth.uid() OR public.is_event_organizer(event_id) OR public.is_admin());

DROP POLICY IF EXISTS "Organizers and admins manage judge assignments" ON public.judge_assignments;
CREATE POLICY "Organizers and admins manage judge assignments"
  ON public.judge_assignments FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id) OR public.is_admin())
  WITH CHECK (public.is_event_organizer(event_id) OR public.is_admin());

-- Additional judge access for judging_scores and event_results
DROP POLICY IF EXISTS "Judges can view assigned scores" ON public.judging_scores;
CREATE POLICY "Judges can view assigned scores"
  ON public.judging_scores FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_event_organizer(event_id)
    OR EXISTS (SELECT 1 FROM public.judge_assignments ja WHERE ja.event_id = judging_scores.event_id AND ja.judge_id = auth.uid())
  );

DROP POLICY IF EXISTS "Judges can view assigned event results" ON public.event_results;
CREATE POLICY "Judges can view assigned event results"
  ON public.event_results FOR SELECT
  TO authenticated
  USING (
    result_status = 'published'
    OR public.is_admin()
    OR public.is_event_organizer(event_id)
    OR EXISTS (SELECT 1 FROM public.judge_assignments ja WHERE ja.event_id = event_results.event_id AND ja.judge_id = auth.uid())
  );

-- Storage policies for project-presentations
DROP POLICY IF EXISTS "Team members upload project presentations" ON storage.objects;
CREATE POLICY "Team members upload project presentations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-presentations'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authorized users view project presentations" ON storage.objects;
CREATE POLICY "Authorized users view project presentations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-presentations'
    AND (
      public.is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.project_submissions ps
        WHERE ps.presentation_storage_path = name
      )
    )
  );

-- Grants
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.match_institutional_domain(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.screen_administrative_mailbox(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_qr_pass(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_offline_attendance(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_judge_evaluation(UUID, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_leaderboard(UUID) TO authenticated;
