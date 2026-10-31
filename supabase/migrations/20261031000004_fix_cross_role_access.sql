-- ====================================================================
-- HACKOS CROSS-ROLE ACCESS ENHANCEMENT
-- Migration: 20261031000004_fix_cross_role_access.sql
-- ====================================================================

-- 1. Venue Agreements INSERT: permit both organizer and venue owner
DROP POLICY IF EXISTS "Venue owners can create agreements" ON public.venue_agreements;
CREATE POLICY "Parties to request can create agreements"
  ON public.venue_agreements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

-- 2. Venue Agreements SELECT: permit parties or participants of published event
DROP POLICY IF EXISTS "Parties to venue request can view agreements" ON public.venue_agreements;
CREATE POLICY "Parties to venue request or published event participants can view agreements"
  ON public.venue_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      JOIN public.events e ON e.id = vr.event_id
      WHERE vr.id = venue_request_id
        AND (
          vr.organizer_id = auth.uid() 
          OR public.is_venue_owner(vr.venue_id)
          OR e.publication_status = 'published'
        )
    )
  );

-- 3. Venue Quotations SELECT: permit parties or participants of published event
DROP POLICY IF EXISTS "Parties to venue request can view quotations" ON public.venue_quotations;
CREATE POLICY "Parties to request or published event participants can view quotations"
  ON public.venue_quotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      JOIN public.events e ON e.id = vr.event_id
      WHERE vr.id = venue_request_id
        AND (
          vr.organizer_id = auth.uid() 
          OR public.is_venue_owner(vr.venue_id)
          OR e.publication_status = 'published'
        )
    )
  );

-- 4. Venues SELECT: permit verified, owned, or requested venues
DROP POLICY IF EXISTS "Anyone can view verified venues; owners can view all their venues" ON public.venues;
CREATE POLICY "View verified venues or owned venues or requested venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (
    verification_status = 'verified' 
    OR owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.venue_requests vr WHERE vr.venue_id = venues.id AND vr.organizer_id = auth.uid())
  );

