-- ====================================================================
-- HACKOS OFFICIAL HACKATHON VERIFICATION & ACCOUNTABILITY
-- Migration: 20261031000008_hackathon_verification.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Storage bucket: verification-documents (Private, 20MB limit)
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false,
  20971520,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- --------------------------------------------------------------------
-- 2. Add verification columns to public.events
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'not_submitted'
      CHECK (verification_status IN (
        'not_submitted',
        'pending_review',
        'additional_info_required',
        'verified',
        'rejected',
        'suspended',
        'revoked',
        'expired'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_verification_status ON public.events(verification_status);

-- --------------------------------------------------------------------
-- 3. Table: public.event_verifications
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK (status IN (
      'not_submitted',
      'pending_review',
      'additional_info_required',
      'verified',
      'rejected',
      'suspended',
      'revoked',
      'expired'
    )),
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  representative_designation TEXT NOT NULL,
  representative_contact TEXT, -- Email or phone
  event_name_confirmed TEXT NOT NULL,
  start_at_confirmed TIMESTAMPTZ NOT NULL,
  end_at_confirmed TIMESTAMPTZ NOT NULL,
  duration_hours_confirmed INTEGER,
  document_storage_path TEXT NOT NULL,
  document_filename TEXT NOT NULL,
  document_file_size INTEGER,
  document_mime_type TEXT,
  document_version INTEGER NOT NULL DEFAULT 1,
  letter_public BOOLEAN NOT NULL DEFAULT false,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  rejection_reason TEXT,
  clarification_request TEXT,
  verified_at TIMESTAMPTZ,
  public_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_verifications_event ON public.event_verifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_verifications_organizer ON public.event_verifications(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_verifications_status ON public.event_verifications(status);

-- --------------------------------------------------------------------
-- 4. Table: public.event_verification_terms_acceptances
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_verification_terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.event_verifications(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_terms_text TEXT NOT NULL,
  confirmed_accurate BOOLEAN NOT NULL DEFAULT true,
  confirmed_authentic BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_event ON public.event_verification_terms_acceptances(event_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_verification ON public.event_verification_terms_acceptances(verification_id);

-- --------------------------------------------------------------------
-- 5. Table: public.event_verification_audit_logs (Append-only)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  verification_id UUID REFERENCES public.event_verifications(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'document_submitted',
    'document_replaced',
    'terms_accepted',
    'review_started',
    'clarification_requested',
    'new_evidence_submitted',
    'approved',
    'rejected',
    'suspended',
    'revoked',
    'expired',
    're_review_flagged'
  )),
  document_version INTEGER DEFAULT 1,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_event ON public.event_verification_audit_logs(event_id);

-- Protect audit logs: cannot be updated or deleted by ordinary users
CREATE OR REPLACE FUNCTION public.prevent_verification_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_context() THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Audit records are append-only and cannot be updated or deleted by ordinary users';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_verification_audit ON public.event_verification_audit_logs;
CREATE TRIGGER trg_protect_verification_audit
  BEFORE UPDATE OR DELETE ON public.event_verification_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_verification_audit_tampering();

-- --------------------------------------------------------------------
-- 6. Public View: public.public_hackathon_verifications (Public-safe)
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_hackathon_verifications AS
SELECT
  ev.event_id,
  ev.status AS verification_status,
  ev.venue_name,
  ev.venue_address,
  ev.verified_at,
  ev.public_summary,
  ev.letter_public,
  CASE WHEN ev.letter_public = true THEN ev.document_storage_path ELSE NULL END AS public_document_path
FROM public.event_verifications ev
JOIN public.events e ON e.id = ev.event_id
WHERE ev.status = 'verified' AND e.publication_status = 'published';

GRANT SELECT ON public.public_hackathon_verifications TO anon, authenticated;

-- --------------------------------------------------------------------
-- 7. Sync Verification Status to Events Table
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_event_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.verification_sync', 'on', true);

  UPDATE public.events
  SET
    verification_status = NEW.status,
    verified_at = CASE WHEN NEW.status = 'verified' THEN COALESCE(NEW.verified_at, now()) ELSE NULL END
  WHERE id = NEW.event_id;

  PERFORM set_config('app.verification_sync', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_verification ON public.event_verifications;
CREATE TRIGGER trg_sync_event_verification
  AFTER INSERT OR UPDATE OF status, verified_at ON public.event_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_verification_status();

-- --------------------------------------------------------------------
-- 8. Trigger: Material Changes to Verified Events trigger Re-Review
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_event_material_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_material_change BOOLEAN := false;
  v_verif_id UUID;
  v_actor UUID;
BEGIN
  -- Avoid infinite loops when sync_event_verification_status updates events
  IF current_setting('app.verification_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF OLD.verification_status = 'verified' THEN
    IF (OLD.name <> NEW.name)
       OR (OLD.start_at IS DISTINCT FROM NEW.start_at)
       OR (OLD.end_at IS DISTINCT FROM NEW.end_at)
       OR (OLD.format <> NEW.format) THEN
      v_is_material_change := true;
    END IF;

    IF v_is_material_change THEN
      SELECT id INTO v_verif_id FROM public.event_verifications WHERE event_id = NEW.id;

      IF v_verif_id IS NOT NULL THEN
        v_actor := COALESCE(auth.uid(), NEW.organizer_id);

        UPDATE public.event_verifications
        SET
          status = 'additional_info_required',
          clarification_request = 'Material event details (dates, name, or format) were modified after verification. Please submit updated venue confirmation or re-confirm arrangements.',
          updated_at = now()
        WHERE id = v_verif_id;

        INSERT INTO public.event_verification_audit_logs (
          event_id, verification_id, actor_user_id, action,
          previous_status, new_status, reason, metadata
        ) VALUES (
          NEW.id, v_verif_id, v_actor, 're_review_flagged',
          'verified', 'additional_info_required',
          'Event schedule, format, or identity modified by organizer',
          jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name, 'old_start', OLD.start_at, 'new_start', NEW.start_at)
        );

        INSERT INTO public.notifications (user_id, title, message, notification_type)
        VALUES (
          NEW.organizer_id,
          'Verification Re-Review Required',
          format('Your event "%s" was modified after official verification. The verification status has been moved to Additional Information Required pending re-confirmation.', NEW.name),
          'verification'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_material_change ON public.events;
CREATE TRIGGER trg_event_material_change
  AFTER UPDATE OF name, start_at, end_at, format ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_material_change();

-- --------------------------------------------------------------------
-- 9. Row Level Security Policies
-- --------------------------------------------------------------------
ALTER TABLE public.event_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_verification_terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_verification_audit_logs ENABLE ROW LEVEL SECURITY;

-- event_verifications RLS
DROP POLICY IF EXISTS "Organizers can view own event verifications" ON public.event_verifications;
CREATE POLICY "Organizers can view own event verifications"
  ON public.event_verifications FOR SELECT
  TO authenticated
  USING (
    organizer_id = auth.uid()
    OR public.is_event_organizer(event_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Public can view verified public event verifications" ON public.event_verifications;
CREATE POLICY "Public can view verified public event verifications"
  ON public.event_verifications FOR SELECT
  TO anon, authenticated
  USING (
    status = 'verified'
    AND EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.publication_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Organizers can create verification submission" ON public.event_verifications;
CREATE POLICY "Organizers can create verification submission"
  ON public.event_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id = auth.uid()
    AND public.is_event_organizer(event_id)
  );

DROP POLICY IF EXISTS "Organizers or Admin can update verification" ON public.event_verifications;
CREATE POLICY "Organizers or Admin can update verification"
  ON public.event_verifications FOR UPDATE
  TO authenticated
  USING (
    (organizer_id = auth.uid() AND status IN ('not_submitted', 'pending_review', 'additional_info_required'))
    OR public.is_admin()
  )
  WITH CHECK (
    (organizer_id = auth.uid() AND status IN ('not_submitted', 'pending_review', 'additional_info_required'))
    OR public.is_admin()
  );

-- event_verification_terms_acceptances RLS
DROP POLICY IF EXISTS "Terms acceptances viewable by organizer or admin" ON public.event_verification_terms_acceptances;
CREATE POLICY "Terms acceptances viewable by organizer or admin"
  ON public.event_verification_terms_acceptances FOR SELECT
  TO authenticated
  USING (
    organizer_id = auth.uid()
    OR public.is_event_organizer(event_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Organizers can insert terms acceptance" ON public.event_verification_terms_acceptances;
CREATE POLICY "Organizers can insert terms acceptance"
  ON public.event_verification_terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id = auth.uid()
    AND public.is_event_organizer(event_id)
  );

-- event_verification_audit_logs RLS
DROP POLICY IF EXISTS "Audit logs viewable by organizer or admin" ON public.event_verification_audit_logs;
CREATE POLICY "Audit logs viewable by organizer or admin"
  ON public.event_verification_audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_event_organizer(event_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Authenticated users insert audit logs" ON public.event_verification_audit_logs;
CREATE POLICY "Authenticated users insert audit logs"
  ON public.event_verification_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 10. Storage RLS Policies for verification-documents
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Organizers upload verification documents" ON storage.objects;
CREATE POLICY "Organizers upload verification documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authorized users view verification documents" ON storage.objects;
CREATE POLICY "Authorized users view verification documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.event_verifications ev
        WHERE ev.document_storage_path = name
          AND (ev.organizer_id = auth.uid() OR public.is_event_organizer(ev.event_id))
      )
    )
  );

-- --------------------------------------------------------------------
-- 11. RPC: Submit Hackathon Verification
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_hackathon_verification(
  p_event_id UUID,
  p_venue_name TEXT,
  p_venue_address TEXT,
  p_representative_name TEXT,
  p_representative_designation TEXT,
  p_representative_contact TEXT,
  p_event_name_confirmed TEXT,
  p_start_at_confirmed TIMESTAMPTZ,
  p_end_at_confirmed TIMESTAMPTZ,
  p_duration_hours_confirmed INTEGER,
  p_document_storage_path TEXT,
  p_document_filename TEXT,
  p_document_file_size INTEGER,
  p_document_mime_type TEXT,
  p_terms_version TEXT,
  p_accepted_terms_text TEXT,
  p_confirmed_accurate BOOLEAN,
  p_confirmed_authentic BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.event_verifications%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_verif_id UUID;
  v_doc_version INTEGER := 1;
  v_prev_status TEXT := 'not_submitted';
  v_action TEXT := 'document_submitted';
  v_actor UUID;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  v_actor := COALESCE(auth.uid(), v_event.organizer_id);

  IF NOT (
    public.is_privileged_context()
    OR (public.has_role('organizer') AND public.is_event_organizer(p_event_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit verification for this event';
  END IF;

  IF NOT (p_confirmed_accurate AND p_confirmed_authentic) THEN
    RAISE EXCEPTION 'You must explicitly confirm the accuracy and authenticity of the verification submission';
  END IF;

  SELECT * INTO v_existing FROM public.event_verifications WHERE event_id = p_event_id;

  IF FOUND THEN
    v_prev_status := v_existing.status;
    v_doc_version := v_existing.document_version;

    IF v_existing.document_storage_path <> p_document_storage_path THEN
      v_doc_version := v_doc_version + 1;
      v_action := 'document_replaced';
    ELSE
      v_action := 'new_evidence_submitted';
    END IF;

    UPDATE public.event_verifications
    SET
      venue_name = p_venue_name,
      venue_address = p_venue_address,
      representative_name = p_representative_name,
      representative_designation = p_representative_designation,
      representative_contact = p_representative_contact,
      event_name_confirmed = p_event_name_confirmed,
      start_at_confirmed = p_start_at_confirmed,
      end_at_confirmed = p_end_at_confirmed,
      duration_hours_confirmed = p_duration_hours_confirmed,
      document_storage_path = p_document_storage_path,
      document_filename = p_document_filename,
      document_file_size = p_document_file_size,
      document_mime_type = p_document_mime_type,
      document_version = v_doc_version,
      terms_version = p_terms_version,
      terms_accepted_at = now(),
      status = 'pending_review',
      submitted_at = now(),
      submitted_by = v_actor,
      clarification_request = NULL,
      updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_verif_id;
  ELSE
    INSERT INTO public.event_verifications (
      event_id, organizer_id, status,
      venue_name, venue_address,
      representative_name, representative_designation, representative_contact,
      event_name_confirmed, start_at_confirmed, end_at_confirmed, duration_hours_confirmed,
      document_storage_path, document_filename, document_file_size, document_mime_type,
      document_version, terms_version, terms_accepted_at, submitted_at, submitted_by
    ) VALUES (
      p_event_id, v_event.organizer_id, 'pending_review',
      p_venue_name, p_venue_address,
      p_representative_name, p_representative_designation, p_representative_contact,
      p_event_name_confirmed, p_start_at_confirmed, p_end_at_confirmed, p_duration_hours_confirmed,
      p_document_storage_path, p_document_filename, p_document_file_size, p_document_mime_type,
      1, p_terms_version, now(), now(), v_actor
    )
    RETURNING id INTO v_verif_id;
  END IF;

  -- Terms acceptance record
  INSERT INTO public.event_verification_terms_acceptances (
    verification_id, event_id, organizer_id, terms_version,
    accepted_terms_text, confirmed_accurate, confirmed_authentic, accepted_at
  ) VALUES (
    v_verif_id, p_event_id, v_event.organizer_id, p_terms_version,
    p_accepted_terms_text, p_confirmed_accurate, p_confirmed_authentic, now()
  );

  -- Audit log
  INSERT INTO public.event_verification_audit_logs (
    event_id, verification_id, actor_user_id, action,
    document_version, previous_status, new_status, reason, metadata
  ) VALUES (
    p_event_id, v_verif_id, v_actor, v_action,
    v_doc_version, v_prev_status, 'pending_review',
    'Verification application and authorization letter submitted by organizer',
    jsonb_build_object(
      'venue_name', p_venue_name,
      'document_filename', p_document_filename,
      'terms_version', p_terms_version
    )
  );

  -- Notification to organizer
  INSERT INTO public.notifications (user_id, title, message, notification_type)
  VALUES (
    v_event.organizer_id,
    'Verification Application Submitted',
    format('Your official verification request for "%s" has been submitted and is pending review by HACKOS verification officers.', p_event_name_confirmed),
    'verification'
  );

  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verif_id,
    'status', 'pending_review',
    'message', 'Verification submitted successfully.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_hackathon_verification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_hackathon_verification TO authenticated;

-- --------------------------------------------------------------------
-- 12. RPC: Review Hackathon Verification (Admin Only)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_hackathon_verification(
  p_verification_id UUID,
  p_action TEXT, -- 'approve', 'reject', 'request_info', 'suspend', 'revoke'
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_public_summary TEXT DEFAULT NULL,
  p_letter_public BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verif public.event_verifications%ROWTYPE;
  v_new_status TEXT;
  v_audit_action TEXT;
  v_actor UUID;
BEGIN
  IF NOT (public.is_admin() OR public.is_privileged_context()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized HACKOS verification officers or administrators may review verifications';
  END IF;

  SELECT * INTO v_verif FROM public.event_verifications WHERE id = p_verification_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification record not found';
  END IF;

  v_actor := COALESCE(auth.uid(), (SELECT user_id FROM public.user_roles WHERE role = 'admin' AND status = 'active' LIMIT 1));

  IF p_action = 'approve' THEN
    v_new_status := 'verified';
    v_audit_action := 'approved';
  ELSIF p_action = 'reject' THEN
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'A mandatory rejection reason is required';
    END IF;
    v_new_status := 'rejected';
    v_audit_action := 'rejected';
  ELSIF p_action = 'request_info' THEN
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'Please provide specific clarification or correction details';
    END IF;
    v_new_status := 'additional_info_required';
    v_audit_action := 'clarification_requested';
  ELSIF p_action = 'suspend' THEN
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'A reason is required to suspend verification';
    END IF;
    v_new_status := 'suspended';
    v_audit_action := 'suspended';
  ELSIF p_action = 'revoke' THEN
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
      RAISE EXCEPTION 'A reason is required to revoke verification';
    END IF;
    v_new_status := 'revoked';
    v_audit_action := 'revoked';
  ELSE
    RAISE EXCEPTION 'Invalid review action: %', p_action;
  END IF;

  UPDATE public.event_verifications
  SET
    status = v_new_status,
    reviewed_at = now(),
    reviewed_by = v_actor,
    reviewer_notes = p_notes,
    rejection_reason = CASE WHEN p_action IN ('reject', 'suspend', 'revoke') THEN p_reason ELSE rejection_reason END,
    clarification_request = CASE WHEN p_action = 'request_info' THEN p_reason ELSE NULL END,
    verified_at = CASE WHEN p_action = 'approve' THEN now() ELSE (CASE WHEN v_new_status = 'verified' THEN verified_at ELSE NULL END) END,
    public_summary = COALESCE(p_public_summary, public_summary, 'Official venue authorization and organizer accountability terms verified by HACKOS verification officers.'),
    letter_public = COALESCE(p_letter_public, false),
    updated_at = now()
  WHERE id = p_verification_id;

  -- Audit log
  INSERT INTO public.event_verification_audit_logs (
    event_id, verification_id, actor_user_id, action,
    document_version, previous_status, new_status, reason, metadata
  ) VALUES (
    v_verif.event_id, p_verification_id, v_actor, v_audit_action,
    v_verif.document_version, v_verif.status, v_new_status, p_reason,
    jsonb_build_object(
      'reviewer_notes', p_notes,
      'letter_public', p_letter_public,
      'public_summary', p_public_summary
    )
  );

  -- Notify the organizer
  INSERT INTO public.notifications (user_id, title, message, notification_type)
  VALUES (
    v_verif.organizer_id,
    CASE
      WHEN p_action = 'approve' THEN 'Hackathon Verified!'
      WHEN p_action = 'reject' THEN 'Verification Rejected'
      WHEN p_action = 'request_info' THEN 'Additional Verification Information Requested'
      WHEN p_action = 'suspend' THEN 'Hackathon Verification Suspended'
      WHEN p_action = 'revoke' THEN 'Hackathon Verification Revoked'
    END,
    CASE
      WHEN p_action = 'approve' THEN format('Your hackathon "%s" has been officially verified! The Verified Hackathon badge is now active.', v_verif.event_name_confirmed)
      WHEN p_action = 'reject' THEN format('Official verification for "%s" was rejected. Reason: %s', v_verif.event_name_confirmed, p_reason)
      WHEN p_action = 'request_info' THEN format('Reviewer requested clarification for "%s": %s', v_verif.event_name_confirmed, p_reason)
      WHEN p_action = 'suspend' THEN format('Official verification for "%s" has been suspended. Reason: %s', v_verif.event_name_confirmed, p_reason)
      WHEN p_action = 'revoke' THEN format('Official verification for "%s" has been revoked. Reason: %s', v_verif.event_name_confirmed, p_reason)
    END,
    'verification'
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'message', format('Verification status updated to %s.', v_new_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_hackathon_verification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_hackathon_verification TO authenticated;
