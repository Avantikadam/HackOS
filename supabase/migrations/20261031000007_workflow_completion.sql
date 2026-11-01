-- ====================================================================
-- HACKOS WORKFLOW COMPLETION
-- Migration: 20261031000007_workflow_completion.sql
--
-- Additive migration. It does not drop tables or rewrite existing records.
-- Adds:
--   - secure OTP agreement acceptance and agreement document attachment
--   - atomic organizer quotation decision
--   - free-event payment handling
--   - notification triggers for cross-dashboard updates
--   - missing CRUD policies for announcements, team members, documents
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. Application payment status derived from the event fee
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_application_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_event_id UUID;
  v_registration_fee NUMERIC(12, 2);
BEGIN
  SELECT event_id INTO v_team_event_id
  FROM public.teams
  WHERE id = NEW.team_id;

  IF v_team_event_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_team_event_id <> NEW.event_id THEN
    RAISE EXCEPTION 'Team and application must belong to the same event';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_privileged_context() THEN
      SELECT COALESCE(registration_fee, 0)
      INTO v_registration_fee
      FROM public.events
      WHERE id = NEW.event_id;

      NEW.application_status := 'pending';
      NEW.payment_status := CASE
        WHEN COALESCE(v_registration_fee, 0) > 0 THEN 'pending'
        ELSE 'waived'
      END;
      NEW.submitted_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.event_id <> OLD.event_id OR NEW.team_id <> OLD.team_id THEN
    RAISE EXCEPTION 'Application ownership cannot be changed';
  END IF;

  IF public.is_privileged_context()
     OR (public.is_event_organizer(OLD.event_id) AND public.has_role('organizer')) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = OLD.team_id
      AND t.team_leader_id = auth.uid()
      AND public.has_role('participant')
  ) THEN
    IF NEW.application_status <> 'withdrawn'
       OR NEW.payment_status <> OLD.payment_status THEN
      RAISE EXCEPTION 'Team leaders can only withdraw their application';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to change this application';
END;
$$;

-- --------------------------------------------------------------------
-- 1. Secure OTP acceptance
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_venue_agreement(
  p_agreement_id UUID,
  p_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement public.venue_agreements%ROWTYPE;
  v_request public.venue_requests%ROWTYPE;
  v_challenge public.venue_otp_challenges%ROWTYPE;
  v_entered_hash TEXT;
  v_timestamp TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_agreement
  FROM public.venue_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  SELECT * INTO v_request
  FROM public.venue_requests
  WHERE id = v_agreement.venue_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  IF NOT (
    public.has_role('venue_authority')
    AND public.is_venue_owner(v_request.venue_id)
  ) THEN
    RAISE EXCEPTION 'Only the venue authority can accept this agreement';
  END IF;

  IF v_agreement.agreement_status = 'accepted' THEN
    RETURN;
  END IF;

  IF v_agreement.agreement_status <> 'awaiting_otp' THEN
    RAISE EXCEPTION 'Agreement is not awaiting OTP verification';
  END IF;

  SELECT * INTO v_challenge
  FROM public.venue_otp_challenges
  WHERE agreement_id = p_agreement_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active OTP challenge found';
  END IF;

  IF v_challenge.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'This verification code has already been used';
  END IF;

  IF v_challenge.expires_at <= v_timestamp THEN
    RAISE EXCEPTION 'Verification code has expired';
  END IF;

  IF v_challenge.attempts >= 5 THEN
    RAISE EXCEPTION 'Too many incorrect attempts. Request a new code';
  END IF;

  v_entered_hash := encode(digest(btrim(p_code), 'sha256'), 'hex');

  IF v_entered_hash <> v_challenge.otp_hash THEN
    UPDATE public.venue_otp_challenges
    SET attempts = attempts + 1
    WHERE id = v_challenge.id;

    RAISE EXCEPTION 'Invalid verification code';
  END IF;

  UPDATE public.venue_otp_challenges
  SET verified_at = v_timestamp
  WHERE id = v_challenge.id;

  PERFORM set_config('app.agreement_transition', 'on', true);

  UPDATE public.venue_agreements
  SET agreement_status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = v_timestamp,
      otp_verified_at = v_timestamp
  WHERE id = p_agreement_id;

  INSERT INTO public.agreement_audit_logs (
    agreement_id,
    actor_user_id,
    action,
    metadata
  )
  VALUES (
    p_agreement_id,
    auth.uid(),
    'OTP_VERIFIED_AND_ACCEPTED',
    jsonb_build_object(
      'representative_destination', v_challenge.phone_or_email,
      'verified_at', v_timestamp,
      'agreement_version', v_agreement.version
    )
  );

  UPDATE public.venue_requests
  SET request_status = 'accepted'
  WHERE id = v_request.id
    AND request_status <> 'accepted';

  INSERT INTO public.activity_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  VALUES (
    auth.uid(),
    'venue_agreement',
    p_agreement_id,
    'otp_accepted',
    jsonb_build_object('venue_request_id', v_request.id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_venue_agreement(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_venue_agreement(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 2. Attach generated agreement document
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attach_agreement_document(
  p_agreement_id UUID,
  p_storage_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.venue_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_storage_path IS NULL OR btrim(p_storage_path) = '' THEN
    RAISE EXCEPTION 'A storage path is required';
  END IF;

  SELECT vr.* INTO v_request
  FROM public.venue_agreements va
  JOIN public.venue_requests vr ON vr.id = va.venue_request_id
  WHERE va.id = p_agreement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF NOT (
    (v_request.organizer_id = auth.uid() AND public.has_role('organizer'))
    OR (public.is_venue_owner(v_request.venue_id) AND public.has_role('venue_authority'))
  ) THEN
    RAISE EXCEPTION 'Not authorized to attach this agreement document';
  END IF;

  PERFORM set_config('app.agreement_transition', 'on', true);

  UPDATE public.venue_agreements
  SET agreement_document_path = p_storage_path
  WHERE id = p_agreement_id;

  INSERT INTO public.agreement_audit_logs (
    agreement_id,
    actor_user_id,
    action,
    metadata
  )
  VALUES (
    p_agreement_id,
    auth.uid(),
    'DOCUMENT_ATTACHED',
    jsonb_build_object('storage_path', p_storage_path)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attach_agreement_document(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_agreement_document(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 3. Atomic organizer quotation decision
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_venue_quotation(
  p_quotation_id UUID,
  p_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation public.venue_quotations%ROWTYPE;
  v_request public.venue_requests%ROWTYPE;
  v_agreement_id UUID;
BEGIN
  IF p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Quotation decision must be accepted or rejected';
  END IF;

  SELECT * INTO v_quotation
  FROM public.venue_quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  SELECT * INTO v_request
  FROM public.venue_requests
  WHERE id = v_quotation.venue_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  IF NOT (
    v_request.organizer_id = auth.uid()
    AND public.has_role('organizer')
    AND public.is_event_organizer(v_request.event_id)
  ) THEN
    RAISE EXCEPTION 'Only the event organizer can decide this quotation';
  END IF;

  IF v_quotation.quotation_status = p_status THEN
    SELECT id INTO v_agreement_id
    FROM public.venue_agreements
    WHERE venue_request_id = v_request.id
    ORDER BY version DESC
    LIMIT 1;
    RETURN v_agreement_id;
  END IF;

  IF v_quotation.quotation_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only a submitted quotation can be decided';
  END IF;

  UPDATE public.venue_quotations
  SET quotation_status = p_status
  WHERE id = p_quotation_id;

  IF p_status = 'accepted' THEN
    SELECT id INTO v_agreement_id
    FROM public.venue_agreements
    WHERE venue_request_id = v_request.id
    ORDER BY version DESC
    LIMIT 1;

    IF v_agreement_id IS NULL THEN
      INSERT INTO public.venue_agreements (
        venue_request_id,
        quotation_id,
        terms,
        agreement_status,
        version
      )
      VALUES (
        v_request.id,
        v_quotation.id,
        jsonb_build_object(
          'deposit', '20% payable upon acceptance',
          'cancellation_policy', 'Full refund 14 days prior to event load-in',
          'jurisdiction', 'Standard institutional operations agreement'
        ),
        'awaiting_otp',
        1
      )
      RETURNING id INTO v_agreement_id;
    END IF;
  ELSE
    UPDATE public.venue_requests
    SET request_status = 'rejected'
    WHERE id = v_request.id
      AND request_status = 'quoted';
  END IF;

  RETURN v_agreement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_venue_quotation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_venue_quotation(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 4. Missing permitted CRUD policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Organizers can update announcements" ON public.event_announcements;
CREATE POLICY "Organizers can update announcements"
  ON public.event_announcements FOR UPDATE
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "Organizers can delete announcements" ON public.event_announcements;
CREATE POLICY "Organizers can delete announcements"
  ON public.event_announcements FOR DELETE
  TO authenticated
  USING (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "Team leader can remove team members" ON public.team_members;
CREATE POLICY "Team leader can remove team members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (public.is_team_leader(team_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Venue owners can delete their documents" ON public.venue_documents;
CREATE POLICY "Venue owners can delete their documents"
  ON public.venue_documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() AND public.is_venue_owner(venue_id));

-- --------------------------------------------------------------------
-- 5. Notification triggers (server-side, non-blocking)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_name TEXT;
  v_organizer UUID;
  v_team_name TEXT;
  v_leader UUID;
BEGIN
  SELECT e.name, e.organizer_id, t.team_name, t.team_leader_id
  INTO v_event_name, v_organizer, v_team_name, v_leader
  FROM public.events e
  JOIN public.teams t ON t.id = NEW.team_id
  WHERE e.id = NEW.event_id;

  IF TG_OP = 'INSERT' THEN
    IF v_organizer IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_organizer,
        'New team application',
        COALESCE(v_team_name, 'A team') || ' applied to ' || COALESCE(v_event_name, 'your event') || '.',
        'application_submitted'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.application_status IS DISTINCT FROM OLD.application_status AND v_leader IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_leader,
      'Application status updated',
      'Your application for ' || COALESCE(v_event_name, 'the event') || ' is now ' || NEW.application_status || '.',
      'application_status'
    );
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND v_leader IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_leader,
      'Payment status updated',
      'Payment for ' || COALESCE(v_event_name, 'the event') || ' is now ' || NEW.payment_status || '.',
      'payment_status'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification failed for application %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_change ON public.applications;
CREATE TRIGGER trg_notify_application_change
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();

CREATE OR REPLACE FUNCTION public.notify_venue_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_event_name TEXT;
  v_venue_name TEXT;
BEGIN
  SELECT v.owner_user_id, v.venue_name, e.name
  INTO v_owner, v_venue_name, v_event_name
  FROM public.venues v
  JOIN public.events e ON e.id = NEW.event_id
  WHERE v.id = NEW.venue_id;

  IF TG_OP = 'INSERT' THEN
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_owner,
        'New booking request',
        COALESCE(v_event_name, 'An event') || ' requested ' || COALESCE(v_venue_name, 'your venue') || '.',
        'venue_request'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.request_status IS DISTINCT FROM OLD.request_status AND NEW.organizer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      NEW.organizer_id,
      'Venue request updated',
      'Your venue request for ' || COALESCE(v_event_name, 'the event') || ' is now ' || NEW.request_status || '.',
      'venue_request_status'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification failed for venue request %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_venue_request_change ON public.venue_requests;
CREATE TRIGGER trg_notify_venue_request_change
  AFTER INSERT OR UPDATE ON public.venue_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_venue_request_change();

CREATE OR REPLACE FUNCTION public.notify_quotation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.venue_requests%ROWTYPE;
  v_event_name TEXT;
  v_owner UUID;
BEGIN
  SELECT * INTO v_request
  FROM public.venue_requests
  WHERE id = NEW.venue_request_id;

  SELECT e.name, v.owner_user_id
  INTO v_event_name, v_owner
  FROM public.events e
  JOIN public.venues v ON v.id = v_request.venue_id
  WHERE e.id = v_request.event_id;

  IF TG_OP = 'INSERT' THEN
    IF v_request.organizer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_request.organizer_id,
        'Quotation received',
        'A quotation of ' || NEW.total_amount || ' INR was submitted for ' || COALESCE(v_event_name, 'your event') || '.',
        'quotation_submitted'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.quotation_status IS DISTINCT FROM OLD.quotation_status AND v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_owner,
      'Quotation decision',
      'The organizer ' || NEW.quotation_status || ' the quotation for ' || COALESCE(v_event_name, 'the event') || '.',
      'quotation_decision'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification failed for quotation %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quotation_change ON public.venue_quotations;
CREATE TRIGGER trg_notify_quotation_change
  AFTER INSERT OR UPDATE ON public.venue_quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_quotation_change();

CREATE OR REPLACE FUNCTION public.notify_agreement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.venue_requests%ROWTYPE;
  v_event_name TEXT;
  v_owner UUID;
BEGIN
  IF NEW.agreement_status = OLD.agreement_status OR NEW.agreement_status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_request
  FROM public.venue_requests
  WHERE id = NEW.venue_request_id;

  SELECT e.name, v.owner_user_id
  INTO v_event_name, v_owner
  FROM public.events e
  JOIN public.venues v ON v.id = v_request.venue_id
  WHERE e.id = v_request.event_id;

  IF v_request.organizer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_request.organizer_id,
      'Venue agreement accepted',
      COALESCE(v_event_name, 'Your event') || ' is now authorized by the venue representative.',
      'agreement_accepted'
    );
  END IF;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_owner,
      'Agreement signed',
      'Your venue agreement for ' || COALESCE(v_event_name, 'the event') || ' is now accepted.',
      'agreement_accepted'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification failed for agreement %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_agreement_change ON public.venue_agreements;
CREATE TRIGGER trg_notify_agreement_change
  AFTER UPDATE ON public.venue_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_agreement_change();

CREATE OR REPLACE FUNCTION public.notify_announcement_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_name TEXT;
  v_leader UUID;
BEGIN
  SELECT name INTO v_event_name
  FROM public.events
  WHERE id = NEW.event_id;

  FOR v_leader IN
    SELECT DISTINCT t.team_leader_id
    FROM public.applications a
    JOIN public.teams t ON t.id = a.team_id
    WHERE a.event_id = NEW.event_id
      AND a.application_status IN ('pending', 'accepted')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_leader,
      'New announcement',
      COALESCE(v_event_name, 'Your event') || ': ' || NEW.title,
      'announcement'
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification failed for announcement %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_announcement_insert ON public.event_announcements;
CREATE TRIGGER trg_notify_announcement_insert
  AFTER INSERT ON public.event_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement_insert();

CREATE OR REPLACE FUNCTION public.notify_result_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader UUID;
  v_event_name TEXT;
BEGIN
  IF NEW.result_status <> 'published'
     OR (TG_OP = 'UPDATE' AND OLD.result_status = 'published') THEN
    RETURN NEW;
  END IF;

  SELECT t.team_leader_id, e.name
  INTO v_leader, v_event_name
  FROM public.teams t
  JOIN public.events e ON e.id = NEW.event_id
  WHERE t.id = NEW.team_id;

  IF v_leader IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_leader,
      'Results published',
      'Results for ' || COALESCE(v_event_name, 'your event') || ' are now available. Your team ranked #' || NEW.rank || '.',
      'results_published'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification failed for result %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_result_change ON public.event_results;
CREATE TRIGGER trg_notify_result_change
  AFTER INSERT OR UPDATE ON public.event_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_result_change();

-- --------------------------------------------------------------------
-- 6. Helpful indexes for dashboard filters
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_organizer_status
  ON public.events (organizer_id, publication_status, start_at);

CREATE INDEX IF NOT EXISTS idx_applications_event_status
  ON public.applications (event_id, application_status, payment_status);

CREATE INDEX IF NOT EXISTS idx_venue_requests_venue_status
  ON public.venue_requests (venue_id, request_status);

CREATE INDEX IF NOT EXISTS idx_venue_requests_organizer_status
  ON public.venue_requests (organizer_id, request_status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at, created_at DESC);
