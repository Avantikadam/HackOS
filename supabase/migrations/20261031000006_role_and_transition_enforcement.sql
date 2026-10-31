-- ====================================================================
-- HACKOS ROLE & STATE ENFORCEMENT
-- Migration: 20261031000006_role_and_transition_enforcement.sql
--
-- Enforces the rules that were previously client-only:
--   - active role required for organizer/venue/participant actions
--   - venue verification is reviewer-only
--   - events are always created as drafts; publishing requires the RPC
--   - agreement acceptance cannot be written directly
--   - team leaders cannot set application/payment status
--   - quotations compute their own totals and revisions
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. Role model
-- --------------------------------------------------------------------
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%venue_authority%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('organizer', 'participant', 'venue_authority', 'admin'));

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
      AND role = p_role
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role('admin');
$$;

-- True only for the service role or a direct SQL session with no JWT.
-- Do not use current_user here: inside a SECURITY DEFINER trigger it is the
-- function owner, which would make every client update look privileged.
CREATE OR REPLACE FUNCTION public.is_privileged_context()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
      ),
      ''
    ) = 'service_role'
    OR (
      COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
      ) IS NULL
      AND auth.uid() IS NULL
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged_context() TO authenticated;

-- Self-service role selection: organizer/participant/venue become active on
-- insert. Admin is reviewer-only. Users cannot change their own role/status.
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
    IF NEW.role = 'admin' THEN
      RAISE EXCEPTION 'Admin access can only be granted by a reviewer';
    END IF;
    NEW.user_id := auth.uid();
    NEW.status := 'active';
    RETURN NEW;
  END IF;

  IF NEW.user_id <> OLD.user_id
     OR NEW.role <> OLD.role THEN
    RAISE EXCEPTION 'Role changes require reviewer approval';
  END IF;

  IF NEW.status <> OLD.status
     AND NOT (
       OLD.status = 'pending'
       AND NEW.status = 'active'
       AND OLD.role <> 'admin'
     ) THEN
    RAISE EXCEPTION 'Role changes require reviewer approval';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_write ON public.user_roles;
CREATE TRIGGER trg_user_roles_write
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_role_write();

-- --------------------------------------------------------------------
-- 1. Venues
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Venue authorities can register venues" ON public.venues;
CREATE POLICY "Venue authorities can register venues"
  ON public.venues FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND public.has_role('venue_authority')
  );

DROP POLICY IF EXISTS "Venue owners can update their venues" ON public.venues;
CREATE POLICY "Venue owners can update their venues"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND public.has_role('venue_authority')
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND public.has_role('venue_authority')
  );

CREATE OR REPLACE FUNCTION public.enforce_venue_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT (public.is_privileged_context() OR public.has_role('venue_authority')) THEN
      RAISE EXCEPTION 'An active venue authority role is required';
    END IF;
    NEW.verification_status := 'pending';
    IF NOT public.is_privileged_context() THEN
      NEW.owner_user_id := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.owner_user_id <> OLD.owner_user_id
     AND NOT public.is_privileged_context() THEN
    RAISE EXCEPTION 'Venue ownership cannot be changed';
  END IF;

  IF NEW.verification_status <> OLD.verification_status
     AND NOT (
       public.is_privileged_context()
       OR public.is_admin()
       OR COALESCE(current_setting('app.venue_review', true), '') = 'on'
     ) THEN
    RAISE EXCEPTION 'Venue verification is reviewer-only';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venues_rules ON public.venues;
CREATE TRIGGER trg_venues_rules
  BEFORE INSERT OR UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.enforce_venue_rules();

CREATE OR REPLACE FUNCTION public.submit_venue_verification(
  p_venue_id UUID,
  p_rep_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role('venue_authority')
    AND public.is_venue_owner(p_venue_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit this venue';
  END IF;

  PERFORM set_config('app.venue_review', 'on', true);

  UPDATE public.venues
  SET authorized_rep_name = NULLIF(btrim(p_rep_name), ''),
      verification_status = 'pending'
  WHERE id = p_venue_id
    AND owner_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  INSERT INTO public.activity_logs (actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (auth.uid(), 'venue', p_venue_id, 'verification_submitted',
          jsonb_build_object('representative', p_rep_name));
END;
$$;

REVOKE ALL ON FUNCTION public.submit_venue_verification(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_venue_verification(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_venue(
  p_venue_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only reviewers can change venue verification';
  END IF;

  IF p_status NOT IN ('pending', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification status';
  END IF;

  PERFORM set_config('app.venue_review', 'on', true);

  UPDATE public.venues
  SET verification_status = p_status
  WHERE id = p_venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  INSERT INTO public.activity_logs (actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (auth.uid(), 'venue', p_venue_id, 'verification_' || p_status,
          jsonb_build_object('status', p_status));
END;
$$;

REVOKE ALL ON FUNCTION public.review_venue(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_venue(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 2. Events
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Organizers can create events" ON public.events;
CREATE POLICY "Organizers can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id = auth.uid()
    AND public.has_role('organizer')
  );

DROP POLICY IF EXISTS "Organizers can update their own events" ON public.events;
CREATE POLICY "Organizers can update their own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    organizer_id = auth.uid()
    AND public.has_role('organizer')
  )
  WITH CHECK (
    organizer_id = auth.uid()
    AND public.has_role('organizer')
  );

DROP POLICY IF EXISTS "Organizers can delete draft events" ON public.events;
CREATE POLICY "Organizers can delete draft events"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    organizer_id = auth.uid()
    AND public.has_role('organizer')
    AND publication_status = 'draft'
  );

CREATE OR REPLACE FUNCTION public.enforce_event_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT (public.is_privileged_context() OR public.has_role('organizer')) THEN
      RAISE EXCEPTION 'An active organizer role is required';
    END IF;
    NEW.publication_status := 'draft';
    IF NOT public.is_privileged_context() THEN
      NEW.organizer_id := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.organizer_id <> OLD.organizer_id
     AND NOT public.is_privileged_context() THEN
    RAISE EXCEPTION 'Event ownership cannot be changed';
  END IF;

  IF NEW.publication_status <> OLD.publication_status
     AND NOT (
       public.is_privileged_context()
       OR COALESCE(current_setting('app.event_transition', true), '') = 'on'
     ) THEN
    RAISE EXCEPTION 'Event publication must go through the publish action';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_rules ON public.events;
CREATE TRIGGER trg_events_rules
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_rules();

CREATE OR REPLACE FUNCTION public.publish_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_has_agreement BOOLEAN;
BEGIN
  IF NOT (
    public.has_role('organizer')
    AND public.is_event_organizer(p_event_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to publish this event';
  END IF;

  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.publication_status = 'published' THEN
    RETURN;
  END IF;

  IF v_event.name IS NULL OR btrim(v_event.name) = '' THEN
    RAISE EXCEPTION 'Event name is required';
  END IF;

  IF v_event.start_at IS NULL OR v_event.end_at IS NULL THEN
    RAISE EXCEPTION 'Event start and end dates are required';
  END IF;

  IF v_event.end_at <= v_event.start_at THEN
    RAISE EXCEPTION 'Event end date must be after the start date';
  END IF;

  IF v_event.maximum_team_size < v_event.minimum_team_size THEN
    RAISE EXCEPTION 'Maximum team size cannot be smaller than the minimum';
  END IF;

  IF v_event.format IN ('offline', 'hybrid') THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      JOIN public.venue_agreements va ON va.venue_request_id = vr.id
      WHERE vr.event_id = p_event_id
        AND va.agreement_status = 'accepted'
    ) INTO v_has_agreement;

    IF NOT v_has_agreement THEN
      RAISE EXCEPTION 'Offline and hybrid events require an accepted venue agreement';
    END IF;
  END IF;

  PERFORM set_config('app.event_transition', 'on', true);

  UPDATE public.events
  SET publication_status = 'published'
  WHERE id = p_event_id;

  INSERT INTO public.activity_logs (actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (auth.uid(), 'event', p_event_id, 'published',
          jsonb_build_object('format', v_event.format));
END;
$$;

REVOKE ALL ON FUNCTION public.publish_event(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_event(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 3. Venue requests
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Organizers can create venue requests" ON public.venue_requests;
CREATE POLICY "Organizers can create venue requests"
  ON public.venue_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id = auth.uid()
    AND public.is_event_organizer(event_id)
    AND public.has_role('organizer')
  );

DROP POLICY IF EXISTS "Organizers or Venue Owners can update venue requests" ON public.venue_requests;
CREATE POLICY "Organizers or Venue Owners can update venue requests"
  ON public.venue_requests FOR UPDATE
  TO authenticated
  USING (
    (organizer_id = auth.uid() AND public.has_role('organizer'))
    OR (public.is_venue_owner(venue_id) AND public.has_role('venue_authority'))
  )
  WITH CHECK (
    (organizer_id = auth.uid() AND public.has_role('organizer'))
    OR (public.is_venue_owner(venue_id) AND public.has_role('venue_authority'))
  );

CREATE OR REPLACE FUNCTION public.enforce_venue_request_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.request_status := 'pending';
    RETURN NEW;
  END IF;

  IF NEW.event_id <> OLD.event_id
     OR NEW.venue_id <> OLD.venue_id
     OR NEW.organizer_id <> OLD.organizer_id THEN
    RAISE EXCEPTION 'Venue request ownership cannot be changed';
  END IF;

  IF NEW.request_status <> OLD.request_status THEN
    IF NEW.request_status = 'accepted' AND NOT EXISTS (
      SELECT 1
      FROM public.venue_agreements
      WHERE venue_request_id = OLD.id
        AND agreement_status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'A request cannot be accepted without an accepted agreement';
    END IF;

    IF NEW.request_status = 'quoted' AND NOT EXISTS (
      SELECT 1
      FROM public.venue_quotations
      WHERE venue_request_id = OLD.id
        AND quotation_status IN ('submitted', 'accepted')
    ) THEN
      RAISE EXCEPTION 'A quotation is required before marking a request as quoted';
    END IF;

    IF OLD.request_status = 'accepted' AND NEW.request_status NOT IN ('accepted', 'cancelled') THEN
      RAISE EXCEPTION 'An accepted request can only be cancelled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_requests_rules ON public.venue_requests;
CREATE TRIGGER trg_venue_requests_rules
  BEFORE INSERT OR UPDATE ON public.venue_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_venue_request_rules();

-- --------------------------------------------------------------------
-- 4. Quotations
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Venue owners can create quotations" ON public.venue_quotations;
CREATE POLICY "Venue owners can create quotations"
  ON public.venue_quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role('venue_authority')
    AND EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND public.is_venue_owner(vr.venue_id)
    )
  );

DROP POLICY IF EXISTS "Venue owners or organizers can update quotations" ON public.venue_quotations;
CREATE POLICY "Venue owners or organizers can update quotations"
  ON public.venue_quotations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (
          (vr.organizer_id = auth.uid() AND public.has_role('organizer'))
          OR (public.is_venue_owner(vr.venue_id) AND public.has_role('venue_authority'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (
          (vr.organizer_id = auth.uid() AND public.has_role('organizer'))
          OR (public.is_venue_owner(vr.venue_id) AND public.has_role('venue_authority'))
        )
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_quotation_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_total NUMERIC(12, 2);
BEGIN
  SELECT event_id INTO v_event_id
  FROM public.venue_requests
  WHERE id = NEW.venue_request_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  SELECT COALESCE(SUM(COALESCE((item->>'amount')::NUMERIC, 0)), 0)
  INTO v_total
  FROM jsonb_array_elements(NEW.itemized_costs) AS item;

  IF v_total < 0 THEN
    RAISE EXCEPTION 'Quotation total cannot be negative';
  END IF;

  NEW.total_amount := v_total;

  IF TG_OP = 'INSERT' THEN
    NEW.quotation_status := 'submitted';
    SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM public.venue_quotations
    WHERE venue_request_id = NEW.venue_request_id;
    RETURN NEW;
  END IF;

  IF NEW.venue_request_id <> OLD.venue_request_id THEN
    RAISE EXCEPTION 'Quotation request cannot be changed';
  END IF;

  IF OLD.quotation_status IN ('accepted', 'rejected') THEN
    IF NEW.itemized_costs <> OLD.itemized_costs
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.validity_date IS DISTINCT FROM OLD.validity_date
       OR NEW.quotation_status <> OLD.quotation_status THEN
      RAISE EXCEPTION 'Accepted or rejected quotations cannot be changed';
    END IF;
  END IF;

  IF NEW.quotation_status <> OLD.quotation_status THEN
    IF NOT (
      public.is_privileged_context()
      OR public.is_event_organizer(v_event_id)
    ) THEN
      RAISE EXCEPTION 'Only the organizer can decide a quotation';
    END IF;

    IF OLD.quotation_status <> 'submitted'
       OR NEW.quotation_status NOT IN ('accepted', 'rejected') THEN
      RAISE EXCEPTION 'Invalid quotation status transition';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotations_rules ON public.venue_quotations;
CREATE TRIGGER trg_quotations_rules
  BEFORE INSERT OR UPDATE ON public.venue_quotations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quotation_rules();

-- --------------------------------------------------------------------
-- 5. Agreements
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Parties to request can create agreements" ON public.venue_agreements;
CREATE POLICY "Parties to request can create agreements"
  ON public.venue_agreements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role('organizer')
    AND EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND vr.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Venue owners or organizers can update agreements" ON public.venue_agreements;
CREATE POLICY "Venue owners or organizers can update agreements"
  ON public.venue_agreements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (
          (vr.organizer_id = auth.uid() AND public.has_role('organizer'))
          OR (public.is_venue_owner(vr.venue_id) AND public.has_role('venue_authority'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (
          (vr.organizer_id = auth.uid() AND public.has_role('organizer'))
          OR (public.is_venue_owner(vr.venue_id) AND public.has_role('venue_authority'))
        )
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_agreement_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.agreement_status := 'awaiting_otp';
    NEW.accepted_by := NULL;
    NEW.accepted_at := NULL;
    NEW.otp_verified_at := NULL;
    NEW.version := 1;
    RETURN NEW;
  END IF;

  IF NOT (
    public.is_privileged_context()
    OR COALESCE(current_setting('app.agreement_transition', true), '') = 'on'
  ) THEN
    RAISE EXCEPTION 'Agreements can only be accepted through OTP verification';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agreements_rules ON public.venue_agreements;
CREATE TRIGGER trg_agreements_rules
  BEFORE INSERT OR UPDATE ON public.venue_agreements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_agreement_rules();

-- Audit logs are written by server-side functions only.
DROP POLICY IF EXISTS "Authenticated users can record audit logs" ON public.agreement_audit_logs;

-- --------------------------------------------------------------------
-- 6. Team helpers (break teams <-> team_members RLS recursion)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.team_leader_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND (
        tm.user_id = auth.uid()
        OR tm.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_event_organizer(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND public.is_event_organizer(t.event_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_leader(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_event_organizer(UUID) TO authenticated;

DROP POLICY IF EXISTS "Teams viewable by members, leaders, or event organizer" ON public.teams;
CREATE POLICY "Teams viewable by members, leaders, or event organizer"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    team_leader_id = auth.uid()
    OR public.is_event_organizer(event_id)
    OR public.is_team_member(id)
  );

DROP POLICY IF EXISTS "Team members viewable by team members, leader, or organizer" ON public.team_members;
CREATE POLICY "Team members viewable by team members, leader, or organizer"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_team_leader(team_id)
    OR public.is_team_event_organizer(team_id)
  );

DROP POLICY IF EXISTS "Team leader can add team members" ON public.team_members;
CREATE POLICY "Team leader can add team members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_leader(team_id));

DROP POLICY IF EXISTS "Team leader or member can update membership status" ON public.team_members;
CREATE POLICY "Team leader or member can update membership status"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_team_leader(team_id))
  WITH CHECK (user_id = auth.uid() OR public.is_team_leader(team_id));

DROP POLICY IF EXISTS "Applications viewable by team leader, members, or event organizer" ON public.applications;
CREATE POLICY "Applications viewable by team leader, members, or event organizer"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    public.is_event_organizer(event_id)
    OR public.is_team_leader(team_id)
    OR public.is_team_member(team_id)
  );

-- --------------------------------------------------------------------
-- 7. Applications
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Team leader can submit application" ON public.applications;
CREATE POLICY "Team leader can submit application"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role('participant')
    AND public.is_team_leader(team_id)
  );

DROP POLICY IF EXISTS "Organizer can update application & payment status; Team leader " ON public.applications;
CREATE POLICY "Organizer can update application & payment status; Team leader "
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    (public.is_event_organizer(event_id) AND public.has_role('organizer'))
    OR (public.has_role('participant') AND public.is_team_leader(team_id))
  )
  WITH CHECK (
    (public.is_event_organizer(event_id) AND public.has_role('organizer'))
    OR (public.has_role('participant') AND public.is_team_leader(team_id))
  );

CREATE OR REPLACE FUNCTION public.enforce_application_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_event_id UUID;
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
      NEW.application_status := 'pending';
      NEW.payment_status := 'pending';
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

-- Notifications are written by server-side flows only.
DROP POLICY IF EXISTS "System/Users can insert notifications" ON public.notifications;
