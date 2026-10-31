-- ====================================================================
-- HACKOS VENUE REQUEST VISIBILITY
-- Migration: 20261031000005_venue_request_visibility.sql
--
-- Fixes:
--   1. Venues cannot see draft events attached to their booking requests,
--      which leaves QuotationBuilderPage without event details.
--   2. Participants cannot see the venue request attached to a published
--      event, which hides the venue and agreement on MyApplicationsPage.
--
-- Both helpers are SECURITY DEFINER so policy evaluation does not recurse
-- through RLS-protected tables.
-- ====================================================================

-- 1. True when the event is published.
CREATE OR REPLACE FUNCTION public.is_published_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.publication_status = 'published'
  );
$$;

-- 2. True when the current user is a leader/member of an application for
--    the given event. Team members without a linked user_id are excluded.
CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.teams t ON t.id = a.team_id
    WHERE a.event_id = p_event_id
      AND (
        t.team_leader_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_id = t.id
            AND tm.user_id = auth.uid()
        )
      )
  );
$$;

-- 3. True when the current user owns a venue that received a request
--    for the given event.
CREATE OR REPLACE FUNCTION public.venue_owns_event_request(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_requests vr
    JOIN public.venues v ON v.id = vr.venue_id
    WHERE vr.event_id = p_event_id
      AND v.owner_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_published_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_event_participant(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.venue_owns_event_request(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_published_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.venue_owns_event_request(UUID) TO authenticated;

-- 4. Requested venues may read the draft event attached to their request.
DROP POLICY IF EXISTS "Requested venues can view their event requests" ON public.events;
CREATE POLICY "Requested venues can view their event requests"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.venue_owns_event_request(id));

-- 5. Participants may read the venue request for a published event they
--    applied to. Existing organizer/venue-owner access remains in place.
DROP POLICY IF EXISTS "Participants can view published venue requests" ON public.venue_requests;
CREATE POLICY "Participants can view published venue requests"
  ON public.venue_requests FOR SELECT
  TO authenticated
  USING (
    public.is_published_event(event_id)
    AND public.is_event_participant(event_id)
  );
