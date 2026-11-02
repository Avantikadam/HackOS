-- ====================================================================
-- HACKOS SERVER-SIDE AGREEMENT OTP + AGREEMENT STORAGE HARDENING
-- Migration: 20261031000007_server_side_agreement_otp.sql
-- ====================================================================

ALTER TABLE public.venue_otp_challenges
  ADD COLUMN IF NOT EXISTS otp_salt TEXT,
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Venue authorities can manage their OTP challenges" ON public.venue_otp_challenges;
REVOKE ALL ON public.venue_otp_challenges FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_otp_challenges TO service_role;

REVOKE UPDATE ON public.venue_agreements FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agreement_audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.finalize_agreement_acceptance(
  p_agreement_id UUID,
  p_actor_id UUID,
  p_code_hash TEXT,
  p_document_path TEXT
)
RETURNS public.venue_agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement public.venue_agreements;
  v_request public.venue_requests;
  v_venue public.venues;
  v_challenge public.venue_otp_challenges;
  v_actor_email TEXT;
BEGIN
  IF p_document_path IS NULL OR p_document_path <> p_agreement_id::text || '.pdf' THEN
    RAISE EXCEPTION 'Invalid agreement document path';
  END IF;

  SELECT * INTO v_agreement
  FROM public.venue_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF v_agreement.agreement_status = 'accepted' THEN
    RAISE EXCEPTION 'Agreement is already accepted';
  END IF;

  IF v_agreement.agreement_status <> 'awaiting_otp' THEN
    RAISE EXCEPTION 'Agreement is not awaiting OTP';
  END IF;

  SELECT * INTO v_request
  FROM public.venue_requests
  WHERE id = v_agreement.venue_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue request not found';
  END IF;

  SELECT * INTO v_venue
  FROM public.venues
  WHERE id = v_request.venue_id;

  IF v_venue.owner_user_id <> p_actor_id THEN
    RAISE EXCEPTION 'Only the venue owner can accept this agreement';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_actor_id
      AND role = 'venue_authority'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'An active venue authority role is required';
  END IF;

  SELECT * INTO v_challenge
  FROM public.venue_otp_challenges
  WHERE agreement_id = p_agreement_id
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active OTP challenge';
  END IF;

  IF v_challenge.expires_at < now() THEN
    RAISE EXCEPTION 'OTP challenge has expired';
  END IF;

  IF v_challenge.attempts >= 5 THEN
    RAISE EXCEPTION 'Too many OTP attempts';
  END IF;

  IF v_challenge.otp_hash <> p_code_hash THEN
    RAISE EXCEPTION 'Invalid verification code';
  END IF;

  SELECT email INTO v_actor_email
  FROM auth.users
  WHERE id = p_actor_id;

  PERFORM set_config('app.agreement_transition', 'on', true);

  UPDATE public.venue_agreements
  SET agreement_status = 'accepted',
      accepted_by = p_actor_id,
      accepted_at = now(),
      otp_verified_at = now(),
      agreement_document_path = p_document_path
  WHERE id = p_agreement_id
  RETURNING * INTO v_agreement;

  INSERT INTO public.agreement_audit_logs (
    agreement_id,
    actor_user_id,
    action,
    metadata
  ) VALUES (
    p_agreement_id,
    p_actor_id,
    'OTP_VERIFIED_AND_ACCEPTED',
    jsonb_build_object(
      'representative_email', v_actor_email,
      'verified_at', v_agreement.otp_verified_at,
      'agreement_version', v_agreement.version,
      'document_path', p_document_path
    )
  );

  UPDATE public.venue_requests
  SET request_status = 'accepted'
  WHERE id = v_request.id
    AND request_status <> 'accepted';

  UPDATE public.venue_otp_challenges
  SET verified_at = now(),
      consumed_at = now()
  WHERE id = v_challenge.id;

  PERFORM set_config('app.agreement_transition', 'off', true);

  RETURN v_agreement;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_agreement_acceptance(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_agreement_acceptance(UUID, UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.register_otp_failure(p_agreement_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
  v_attempts INTEGER;
BEGIN
  SELECT id, attempts INTO v_challenge_id, v_attempts
  FROM public.venue_otp_challenges
  WHERE agreement_id = p_agreement_id
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'No active OTP challenge';
  END IF;

  UPDATE public.venue_otp_challenges
  SET attempts = attempts + 1
  WHERE id = v_challenge_id
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.register_otp_failure(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_otp_failure(UUID) TO service_role;

DROP POLICY IF EXISTS "Authenticated upload venue agreements" ON storage.objects;
DROP POLICY IF EXISTS "Authorized view venue agreements" ON storage.objects;
DROP POLICY IF EXISTS "Agreement parties can view agreement pdf" ON storage.objects;

CREATE POLICY "Agreement parties can view agreement pdf"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'venue-agreements'
    AND EXISTS (
      SELECT 1
      FROM public.venue_agreements va
      JOIN public.venue_requests vr ON vr.id = va.venue_request_id
      WHERE va.id::text = split_part(storage.filename(name), '.', 1)
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

DROP POLICY IF EXISTS "Venue owner upload documents" ON storage.objects;
CREATE POLICY "Venue owner upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-documents'
    AND public.has_role('venue_authority')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Organizer upload event assets" ON storage.objects;
CREATE POLICY "Organizer upload event assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-assets'
    AND public.has_role('organizer')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users upload avatar" ON storage.objects;
CREATE POLICY "Authenticated users upload avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
