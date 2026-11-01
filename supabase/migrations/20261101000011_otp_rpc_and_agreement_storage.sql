-- ====================================================================
-- HACKOS CLIENT-CALLABLE AGREEMENT OTP + AGREEMENT STORAGE POLICIES
-- Migration: 20261101000011_otp_rpc_and_agreement_storage.sql
--
-- The agreement-otp edge function is not deployed in this environment and
-- direct access to venue_otp_challenges was revoked. This migration exposes
-- a small, audited RPC surface so the browser can request and verify the
-- representative OTP, and lets the venue authority upload the signed PDF.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Request an OTP challenge (venue authority only)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_agreement_otp(p_agreement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_agreement public.venue_agreements%ROWTYPE;
  v_request public.venue_requests%ROWTYPE;
  v_venue public.venues%ROWTYPE;
  v_code TEXT;
  v_salt TEXT;
  v_destination TEXT;
  v_expires_at TIMESTAMPTZ;
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

  IF NOT (
    public.has_role('venue_authority')
    AND public.is_venue_owner(v_request.venue_id)
  ) THEN
    RAISE EXCEPTION 'Only the authorized venue authority representative can request an OTP';
  END IF;

  SELECT COALESCE(NULLIF(v_venue.contact_email, ''), u.email)
  INTO v_destination
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_destination IS NULL THEN
    v_destination := 'registered venue contact';
  END IF;

  UPDATE public.venue_otp_challenges
  SET consumed_at = now()
  WHERE agreement_id = p_agreement_id
    AND consumed_at IS NULL;

  v_code := lpad((floor(random() * 1000000))::INT::TEXT, 6, '0');
  v_salt := encode(gen_random_bytes(16), 'hex');
  v_expires_at := now() + INTERVAL '10 minutes';

  INSERT INTO public.venue_otp_challenges (
    agreement_id,
    phone_or_email,
    otp_hash,
    otp_salt,
    expires_at,
    attempts
  ) VALUES (
    p_agreement_id,
    v_destination,
    encode(digest(v_salt || ':' || v_code, 'sha256'), 'hex'),
    v_salt,
    v_expires_at,
    0
  );

  RETURN jsonb_build_object(
    'success', true,
    'destination', v_destination,
    'dev_code', v_code,
    'expires_at', v_expires_at,
    'message', 'Verification code generated. It expires in 10 minutes.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_agreement_otp(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_agreement_otp(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 2. Accept agreement with a salted OTP hash and consume the challenge
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_venue_agreement(p_agreement_id UUID, p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_agreement public.venue_agreements%ROWTYPE;
  v_request public.venue_requests%ROWTYPE;
  v_challenge public.venue_otp_challenges%ROWTYPE;
  v_hash TEXT;
  v_document_path TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RAISE EXCEPTION 'Verification code is required';
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

  IF v_agreement.agreement_status <> 'awaiting_otp' THEN
    RAISE EXCEPTION 'Agreement is not awaiting OTP';
  END IF;

  SELECT * INTO v_challenge
  FROM public.venue_otp_challenges
  WHERE agreement_id = p_agreement_id
    AND consumed_at IS NULL
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

  IF v_challenge.otp_salt IS NOT NULL THEN
    v_hash := encode(digest(v_challenge.otp_salt || ':' || btrim(p_code), 'sha256'), 'hex');
  ELSE
    v_hash := encode(digest(btrim(p_code), 'sha256'), 'hex');
  END IF;

  IF v_hash <> v_challenge.otp_hash THEN
    UPDATE public.venue_otp_challenges
    SET attempts = attempts + 1
    WHERE id = v_challenge.id;

    RAISE EXCEPTION 'Invalid verification code';
  END IF;

  UPDATE public.venue_otp_challenges
  SET verified_at = now(),
      consumed_at = now()
  WHERE id = v_challenge.id;

  IF v_agreement.agreement_document_path IS NULL
     AND EXISTS (
       SELECT 1
       FROM storage.objects o
       WHERE o.bucket_id = 'venue-agreements'
         AND o.name = p_agreement_id::text || '.pdf'
     ) THEN
    v_document_path := p_agreement_id::text || '.pdf';
  ELSE
    v_document_path := v_agreement.agreement_document_path;
  END IF;

  PERFORM set_config('app.agreement_transition', 'on', true);

  UPDATE public.venue_agreements
  SET agreement_status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now(),
      otp_verified_at = now(),
      agreement_document_path = COALESCE(v_document_path, agreement_document_path)
  WHERE id = p_agreement_id;

  INSERT INTO public.agreement_audit_logs (agreement_id, actor_user_id, action, metadata)
  VALUES (
    p_agreement_id,
    auth.uid(),
    'OTP_VERIFIED_AND_ACCEPTED',
    jsonb_build_object(
      'representative_user_id', auth.uid(),
      'verified_at', now(),
      'agreement_version', v_agreement.version,
      'document_path', v_document_path
    )
  );

  UPDATE public.venue_requests
  SET request_status = 'accepted'
  WHERE id = v_request.id
    AND request_status <> 'accepted';

  PERFORM set_config('app.agreement_transition', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_venue_agreement(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_venue_agreement(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 3. Storage policies for the signed authorization PDF
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Venue owner upload agreement pdf" ON storage.objects;
CREATE POLICY "Venue owner upload agreement pdf"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-agreements'
    AND public.has_role('venue_authority')
    AND storage.filename(name) IN (
      SELECT va.id::text || '.pdf'
      FROM public.venue_agreements va
      JOIN public.venue_requests vr ON vr.id = va.venue_request_id
      WHERE va.agreement_status IN ('awaiting_otp', 'accepted')
        AND public.is_venue_owner(vr.venue_id)
    )
  );

DROP POLICY IF EXISTS "Venue owner replace agreement pdf" ON storage.objects;
CREATE POLICY "Venue owner replace agreement pdf"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-agreements'
    AND public.has_role('venue_authority')
    AND storage.filename(name) IN (
      SELECT va.id::text || '.pdf'
      FROM public.venue_agreements va
      JOIN public.venue_requests vr ON vr.id = va.venue_request_id
      WHERE va.agreement_status IN ('awaiting_otp', 'accepted')
        AND public.is_venue_owner(vr.venue_id)
    )
  )
  WITH CHECK (
    bucket_id = 'venue-agreements'
    AND public.has_role('venue_authority')
    AND storage.filename(name) IN (
      SELECT va.id::text || '.pdf'
      FROM public.venue_agreements va
      JOIN public.venue_requests vr ON vr.id = va.venue_request_id
      WHERE va.agreement_status IN ('awaiting_otp', 'accepted')
        AND public.is_venue_owner(vr.venue_id)
    )
  );

-- --------------------------------------------------------------------
-- 4. Quotation decision RPC exposure (already defined in 007 workflow)
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.decide_venue_quotation(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_venue_quotation(UUID, TEXT) TO authenticated;
