-- ====================================================================
-- HACKOS CROSS-ROLE API, AGREEMENT OTP ACCEPTANCE & NOTIFICATIONS
-- Migration: 20261031000007_cross_role_api_and_notifications.sql
--
-- Additive changes only:
--   - Secure server-side RPCs for quotation decisions and OTP agreement acceptance
--   - Server-side attachment of agreement document paths (storage upload happens client-side)
--   - Server-side notification triggers so the notifications table is populated
--   - Missing permitted CRUD policies for announcements, venue documents, and team members
--   - Free-event payment status now computed server-side as waived
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. Free event payment status computed server-side
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_application_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_event_id UUID;
  v_fee NUMERIC(12, 2);
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
      SELECT COALESCE(registration_fee, 0) INTO v_fee
      FROM public.events
      WHERE id = NEW.event_id;

      NEW.application_status := 'pending';
      NEW.payment_status := CASE WHEN v_fee > 0 THEN 'pending' ELSE 'waived' END;
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

DROP TRIGGER IF EXISTS trg_applications_rules ON public.applications;
CREATE TRIGGER trg_applications_rules
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_application_rules();

-- --------------------------------------------------------------------
-- 1. Permitted CRUD policies for auxiliary event content
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Organizers can manage announcements" ON public.event_announcements;
CREATE POLICY "Organizers can manage announcements"
  ON public.event_announcements FOR UPDATE
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "Organizers can delete announcements" ON public.event_announcements;
CREATE POLICY "Organizers can delete announcements"
  ON public.event_announcements FOR DELETE
  TO authenticated
  USING (public.is_event_organizer(event_id));

DROP POLICY IF EXISTS "Venue owners can manage their uploaded documents" ON public.venue_documents;
CREATE POLICY "Venue owners can manage their uploaded documents"
  ON public.venue_documents FOR UPDATE
  TO authenticated
  USING ((uploaded_by = auth.uid()) AND public.is_venue_owner(venue_id))
  WITH CHECK ((uploaded_by = auth.uid()) AND public.is_venue_owner(venue_id));

DROP POLICY IF EXISTS "Venue owners can delete their uploaded documents" ON public.venue_documents;
CREATE POLICY "Venue owners can delete their uploaded documents"
  ON public.venue_documents FOR DELETE
  TO authenticated
  USING ((uploaded_by = auth.uid()) AND public.is_venue_owner(venue_id));

DROP POLICY IF EXISTS "Team leader can remove pending team members" ON public.team_members;
CREATE POLICY "Team leader can remove pending team members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (
    public.is_team_leader(team_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.team_id = team_members.team_id
        AND a.application_status IN ('accepted', 'withdrawn')
    )
  );

-- --------------------------------------------------------------------
-- 2. Secure quotation decision (accept/reject)
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
  SELECT * INTO v_quotation
  FROM public.venue_quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  SELECT * INTO v_request
  FROM public.venue_requests
  WHERE id = v_quotation.venue_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  IF NOT (
    public.has_role('organizer')
    AND v_request.organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the event organizer can decide this quotation';
  END IF;

  IF p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid quotation decision';
  END IF;

  IF v_quotation.quotation_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted quotations can be accepted or rejected';
  END IF;

  UPDATE public.venue_quotations
  SET quotation_status = p_status
  WHERE id = p_quotation_id;

  IF p_status = 'accepted' THEN
    SELECT id INTO v_agreement_id
    FROM public.venue_agreements
    WHERE venue_request_id = v_request.id
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
        p_quotation_id,
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

    RETURN v_agreement_id;
  ELSE
    UPDATE public.venue_requests
    SET request_status = 'rejected'
    WHERE id = v_request.id
      AND request_status <> 'accepted';

    RETURN NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_venue_quotation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_venue_quotation(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 3. Secure OTP agreement acceptance
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
  v_hash TEXT;
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
  WHERE id = v_agreement.venue_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  IF NOT (
    public.has_role('venue_authority')
    AND public.is_venue_owner(v_request.venue_id)
  ) THEN
    RAISE EXCEPTION 'Only the authorized venue authority representative can accept this agreement';
  END IF;

  IF v_agreement.agreement_status = 'accepted' THEN
    RETURN;
  END IF;

  SELECT * INTO v_challenge
  FROM public.venue_otp_challenges
  WHERE agreement_id = p_agreement_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active OTP challenge found for this agreement';
  END IF;

  IF v_challenge.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'OTP challenge has already been used';
  END IF;

  IF v_challenge.expires_at < now() THEN
    RAISE EXCEPTION 'Verification code has expired';
  END IF;

  IF v_challenge.attempts >= 5 THEN
    RAISE EXCEPTION 'Too many incorrect attempts';
  END IF;

  v_hash := encode(digest(p_code, 'sha256'), 'hex');

  IF v_hash <> v_challenge.otp_hash THEN
    UPDATE public.venue_otp_challenges
    SET attempts = attempts + 1
    WHERE id = v_challenge.id;

    RAISE EXCEPTION 'Invalid verification code';
  END IF;

  UPDATE public.venue_otp_challenges
  SET verified_at = now()
  WHERE id = v_challenge.id;

  PERFORM set_config('app.agreement_transition', 'on', true);

  UPDATE public.venue_agreements
  SET agreement_status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now(),
      otp_verified_at = now()
  WHERE id = p_agreement_id;

  INSERT INTO public.agreement_audit_logs (agreement_id, actor_user_id, action, metadata)
  VALUES (
    p_agreement_id,
    auth.uid(),
    'OTP_VERIFIED_AND_ACCEPTED',
    jsonb_build_object(
      'representative_user_id', auth.uid(),
      'verified_at', now(),
      'agreement_version', v_agreement.version
    )
  );

  UPDATE public.venue_requests
  SET request_status = 'accepted'
  WHERE id = v_request.id
    AND request_status <> 'accepted';
END;
$$;

REVOKE ALL ON FUNCTION public.accept_venue_agreement(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_venue_agreement(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 4. Attach agreement document path after OTP acceptance
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
  v_agreement public.venue_agreements%ROWTYPE;
  v_request_organizer_id UUID;
  v_request_venue_id UUID;
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

  SELECT organizer_id, venue_id INTO v_request_organizer_id, v_request_venue_id
  FROM public.venue_requests
  WHERE id = v_agreement.venue_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  IF NOT (
    (v_request_organizer_id = auth.uid() AND public.has_role('organizer'))
    OR (public.is_venue_owner(v_request_venue_id) AND public.has_role('venue_authority'))
  ) THEN
    RAISE EXCEPTION 'Not authorized to attach documents to this agreement';
  END IF;

  IF v_agreement.agreement_status <> 'accepted' THEN
    RAISE EXCEPTION 'Agreement must be accepted before attaching the signed document';
  END IF;

  PERFORM set_config('app.agreement_transition', 'on', true);

  UPDATE public.venue_agreements
  SET agreement_document_path = p_storage_path
  WHERE id = p_agreement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_agreement_document(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_agreement_document(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 5. Notification triggers
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_leader_id UUID;
  v_event_name TEXT;
  v_team_name TEXT;
  v_organizer_id UUID;
BEGIN
  SELECT t.team_leader_id, e.name, t.team_name, e.organizer_id
  INTO v_team_leader_id, v_event_name, v_team_name, v_organizer_id
  FROM public.teams t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.id = NEW.team_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_organizer_id,
      'New team application',
      format('Team %s applied to %s.', v_team_name, v_event_name),
      'application_submitted'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.application_status <> NEW.application_status THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_team_leader_id,
        'Application status updated',
        format('Your application for %s is now %s.', v_event_name, NEW.application_status),
        'application_updated'
      );
    END IF;

    IF OLD.payment_status <> NEW.payment_status THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_team_leader_id,
        'Payment status updated',
        format('Payment for %s is now %s.', v_event_name, NEW.payment_status),
        'payment_updated'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_change ON public.applications;
CREATE TRIGGER trg_notify_application_change
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();

CREATE OR REPLACE FUNCTION public.notify_venue_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id UUID;
  v_event_name TEXT;
BEGIN
  SELECT v.owner_user_id, e.name
  INTO v_owner_user_id, v_event_name
  FROM public.venues v
  JOIN public.venue_requests vr ON vr.venue_id = v.id
  WHERE vr.id = NEW.id;

  INSERT INTO public.notifications (user_id, title, message, notification_type)
  VALUES (
    v_owner_user_id,
    'New venue booking request',
    format('%s requested your venue for their hackathon.', v_event_name),
    'venue_request_received'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_venue_request_insert ON public.venue_requests;
CREATE TRIGGER trg_notify_venue_request_insert
  AFTER INSERT ON public.venue_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_venue_request_insert();

CREATE OR REPLACE FUNCTION public.notify_quotation_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id UUID;
  v_venue_name TEXT;
BEGIN
  SELECT vr.organizer_id, v.venue_name
  INTO v_organizer_id, v_venue_name
  FROM public.venue_quotations q
  JOIN public.venue_requests vr ON vr.id = q.venue_request_id
  JOIN public.venues v ON v.id = vr.venue_id
  WHERE q.id = NEW.id;

  INSERT INTO public.notifications (user_id, title, message, notification_type)
  VALUES (
    v_organizer_id,
    'Quotation received',
    format('%s issued a quotation for your booking request.', v_venue_name),
    'quotation_received'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quotation_insert ON public.venue_quotations;
CREATE TRIGGER trg_notify_quotation_insert
  AFTER INSERT ON public.venue_quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_quotation_insert();

CREATE OR REPLACE FUNCTION public.notify_agreement_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id UUID;
  v_owner_user_id UUID;
  v_event_name TEXT;
BEGIN
  IF OLD.agreement_status = 'accepted' AND NEW.agreement_status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT vr.organizer_id, v.owner_user_id, e.name
  INTO v_organizer_id, v_owner_user_id, v_event_name
  FROM public.venue_agreements va
  JOIN public.venue_requests vr ON vr.id = va.venue_request_id
  JOIN public.events e ON e.id = vr.event_id
  JOIN public.venues v ON v.id = vr.venue_id
  WHERE va.id = NEW.id;

  IF NEW.agreement_status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_organizer_id,
      'Venue agreement accepted',
      format('The venue agreement for %s has been accepted via OTP.', v_event_name),
      'agreement_accepted'
    );

    IF v_owner_user_id IS NOT NULL AND v_owner_user_id <> v_organizer_id THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_owner_user_id,
        'Venue agreement accepted',
        format('Your venue authorization for %s has been accepted.', v_event_name),
        'agreement_accepted'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_agreement_accepted ON public.venue_agreements;
CREATE TRIGGER trg_notify_agreement_accepted
  AFTER UPDATE ON public.venue_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_agreement_accepted();

CREATE OR REPLACE FUNCTION public.notify_announcement_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, notification_type)
  SELECT DISTINCT
    t.team_leader_id,
    NEW.title,
    NEW.body,
    'announcement'
  FROM public.applications a
  JOIN public.teams t ON t.id = a.team_id
  WHERE a.event_id = NEW.event_id
    AND a.application_status IN ('pending', 'accepted')
    AND t.team_leader_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_announcement_insert ON public.event_announcements;
CREATE TRIGGER trg_notify_announcement_insert
  AFTER INSERT ON public.event_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement_insert();

CREATE OR REPLACE FUNCTION public.notify_result_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_leader_id UUID;
BEGIN
  IF NEW.result_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.result_status = 'published' THEN
    RETURN NEW;
  END IF;

  SELECT t.team_leader_id
  INTO v_team_leader_id
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  INSERT INTO public.notifications (user_id, title, message, notification_type)
  VALUES (
    v_team_leader_id,
    'Results published',
    format('Results for your team in event %s have been published.', NEW.event_id),
    'results_published'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_result_published ON public.event_results;
CREATE TRIGGER trg_notify_result_published
  AFTER INSERT OR UPDATE ON public.event_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_result_published();
