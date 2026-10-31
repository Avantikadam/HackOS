-- ====================================================================
-- HACKOS ADDITIVE WORKSTREAM MIGRATION
-- Migration: 20261031000007_add_venue_and_notification_integrity.sql
--
-- Additive only. No existing rows are deleted or reset.
-- This migration hardens application state transitions and completes
-- the supporting server-side flows introduced by the MVP roadmap.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Team application inserts must honor free vs paid registration fees
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
    SELECT registration_fee INTO v_registration_fee
    FROM public.events
    WHERE id = NEW.event_id;

    IF NOT public.is_privileged_context() THEN
      NEW.application_status := 'pending';
      NEW.payment_status := CASE WHEN COALESCE(v_registration_fee, 0) > 0 THEN 'pending' ELSE 'waived' END;
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
-- 2. Organizer announcement lifecycle (create/update/delete)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Organizers can update announcements" ON public.event_announcements;
CREATE POLICY "Organizers can update announcements"
  ON public.event_announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_announcements.event_id
        AND e.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_announcements.event_id
        AND e.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizers can delete announcements" ON public.event_announcements;
CREATE POLICY "Organizers can delete announcements"
  ON public.event_announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_announcements.event_id
        AND e.organizer_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- 3. Team member removal lifecycle
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Team leaders can remove team members" ON public.team_members;
CREATE POLICY "Team leaders can remove team members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (public.is_team_leader(team_id));

-- --------------------------------------------------------------------
-- 4. Venue document lifecycle
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Venue owners can delete documents" ON public.venue_documents;
CREATE POLICY "Venue owners can delete documents"
  ON public.venue_documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND public.is_venue_owner(venue_id)
  );

-- --------------------------------------------------------------------
-- 5. Server-side notification records
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_name TEXT;
  v_team_name TEXT;
  v_team_leader UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT e.name, t.team_name, t.team_leader_id
      INTO v_event_name, v_team_name, v_team_leader
      FROM public.teams t
      JOIN public.events e ON e.id = t.event_id
     WHERE t.id = NEW.team_id;

    IF v_team_leader IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (
        v_team_leader,
        'New Team Application',
        'A team has submitted an application.',
        'application_submitted'
      );
    END IF;
    RETURN NEW;
  END IF;

  SELECT e.name, t.team_name, t.team_leader_id
    INTO v_event_name, v_team_name, v_team_leader
    FROM public.teams t
    JOIN public.events e ON e.id = t.event_id
   WHERE t.id = OLD.team_id;

  IF v_team_leader IS NOT NULL
     AND (NEW.application_status IS DISTINCT FROM OLD.application_status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status) THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_team_leader,
      'Application Status Updated',
      format('Your application for %s has changed to %s.', v_event_name, NEW.application_status),
      'application_status_updated'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_application_change
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();

CREATE OR REPLACE FUNCTION public.notify_venue_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_status <> 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, notification_type)
  SELECT
    v.owner_user_id,
    'New Venue Booking Request',
    format('You have a new booking request for %s.', v.venue_name),
    'venue_request_received'
  FROM public.venues v
  WHERE v.id = NEW.venue_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_venue_request
  AFTER INSERT ON public.venue_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_venue_request();

CREATE OR REPLACE FUNCTION public.notify_quotation_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id UUID;
BEGIN
  IF OLD.quotation_status <> 'submitted'
     OR NEW.quotation_status NOT IN ('accepted', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT vr.organizer_id
    INTO v_organizer_id
    FROM public.venue_requests vr
   WHERE vr.id = NEW.venue_request_id;

  IF v_organizer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_organizer_id,
      'Quotation Decision Received',
      format('A venue quotation has been %s.', NEW.quotation_status),
      'quotation_decision'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_quotation_decision
  AFTER UPDATE ON public.venue_quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_quotation_decision();

CREATE OR REPLACE FUNCTION public.notify_agreement_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id UUID;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.agreement_status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT vr.organizer_id
    INTO v_organizer_id
    FROM public.venue_requests vr
   WHERE vr.id = NEW.venue_request_id;

  IF v_organizer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
      v_organizer_id,
      'Venue Agreement Accepted',
      'A venue authority has accepted the authorization agreement.',
      'agreement_accepted'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_agreement_acceptance
  AFTER UPDATE ON public.venue_agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_agreement_acceptance();

CREATE OR REPLACE FUNCTION public.notify_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, notification_type)
  SELECT DISTINCT
    t.team_leader_id,
    'Event Announcement',
    format('New announcement for %s: %s', NEW.event_id::text, NEW.title),
    'event_announcement'
  FROM public.teams t
  JOIN public.applications a ON a.team_id = t.id
  WHERE t.event_id = NEW.event_id
    AND a.application_status IN ('pending', 'accepted');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_announcement
  AFTER INSERT ON public.event_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement();

CREATE OR REPLACE FUNCTION public.notify_result_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND (OLD.result_status <> 'published' OR NEW.result_status <> 'published') THEN
    RETURN NEW;
  END IF;

  IF NEW.result_status = 'published' THEN
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    SELECT
      t.team_leader_id,
      'Published Results',
      format('Results for %s are now published.', NEW.event_id::text),
      'results_published'
    FROM public.teams t
    WHERE t.id = NEW.team_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_result_published
  AFTER INSERT OR UPDATE ON public.event_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_result_published();

-- --------------------------------------------------------------------
-- 6. Grants for new server-side notification behavior
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.notify_application_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_venue_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_quotation_decision() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_agreement_acceptance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_announcement() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_result_published() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_application_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_venue_request() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_quotation_decision() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_agreement_acceptance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_announcement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_result_published() TO authenticated;
