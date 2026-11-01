-- ====================================================================
-- HACKOS DATA INTEGRITY HARDENING
-- Migration: 20261101000010_data_integrity_hardening.sql
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_qr_pass(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_event public.events%ROWTYPE;
  v_pass public.participant_qr_passes%ROWTYPE;
  v_token TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access QR pass';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.publication_status <> 'published' THEN
    RAISE EXCEPTION 'QR passes are only available for published events';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.teams t ON t.id = a.team_id
    LEFT JOIN public.team_members tm ON tm.team_id = t.id AND tm.user_id = v_caller_id
    WHERE a.event_id = p_event_id
      AND a.application_status = 'accepted'
      AND (
        t.team_leader_id = v_caller_id
        OR (tm.user_id = v_caller_id AND tm.invitation_status = 'accepted')
      )
  ) THEN
    RAISE EXCEPTION 'An accepted team application is required for this event';
  END IF;

  SELECT * INTO v_pass FROM public.participant_qr_passes
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

CREATE OR REPLACE FUNCTION public.enforce_single_active_application_per_user_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_active_count INTEGER;
BEGIN
  SELECT count(*) INTO v_active_count
  FROM public.applications a
  JOIN public.teams t ON t.id = a.team_id
  LEFT JOIN public.team_members tm ON tm.team_id = t.id AND tm.user_id = v_caller_id
  WHERE a.event_id = COALESCE(NEW.event_id, OLD.event_id)
    AND a.application_status <> 'withdrawn'
    AND (NEW.id IS NULL OR a.id <> NEW.id)
    AND (
      t.team_leader_id = v_caller_id
      OR (tm.user_id = v_caller_id AND tm.invitation_status = 'accepted')
    );

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'Only one active application per user per event is allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_active_application_per_user_event ON public.applications;
CREATE TRIGGER trg_single_active_application_per_user_event
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_application_per_user_event();

DROP POLICY IF EXISTS "Team members upload project presentations" ON storage.objects;
CREATE POLICY "Team members upload project presentations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-presentations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
