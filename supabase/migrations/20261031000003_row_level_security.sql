-- ====================================================================
-- HACKOS ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261031000003_row_level_security.sql
-- ====================================================================

-- Helper functions for cleaner policy expressions
CREATE OR REPLACE FUNCTION public.is_event_organizer(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND organizer_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_venue_owner(p_venue_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.venues
    WHERE id = p_venue_id AND owner_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------
-- 1. PROFILES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- --------------------------------------------------------------------
-- 2. USER ROLES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can request a role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their role selection"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- --------------------------------------------------------------------
-- 3. ORGANIZATIONS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by authenticated users"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organizers can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- --------------------------------------------------------------------
-- 4. ORGANIZATION MEMBERS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id AND owner_user_id = auth.uid())
  );

CREATE POLICY "Organization owners can manage members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id AND owner_user_id = auth.uid())
  );

-- --------------------------------------------------------------------
-- 5. VENUES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified venues; owners can view all their venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (verification_status = 'verified' OR owner_user_id = auth.uid());

CREATE POLICY "Venue authorities can register venues"
  ON public.venues FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Venue owners can update their venues"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- --------------------------------------------------------------------
-- 6. VENUE DOCUMENTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.venue_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners can view their uploaded documents"
  ON public.venue_documents FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_venue_owner(venue_id));

CREATE POLICY "Venue owners can upload documents"
  ON public.venue_documents FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_venue_owner(venue_id));

-- --------------------------------------------------------------------
-- 11. EVENTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are viewable by anyone; drafts viewable by organizer"
  ON public.events FOR SELECT
  TO authenticated, anon
  USING (publication_status = 'published' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete draft events"
  ON public.events FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid() AND publication_status = 'draft');

-- --------------------------------------------------------------------
-- 7. VENUE REQUESTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.venue_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and Venue Owners can view relevant venue requests"
  ON public.venue_requests FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid() OR public.is_venue_owner(venue_id));

CREATE POLICY "Organizers can create venue requests"
  ON public.venue_requests FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid() AND public.is_event_organizer(event_id));

CREATE POLICY "Organizers or Venue Owners can update venue requests"
  ON public.venue_requests FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid() OR public.is_venue_owner(venue_id))
  WITH CHECK (organizer_id = auth.uid() OR public.is_venue_owner(venue_id));

-- --------------------------------------------------------------------
-- 8. VENUE QUOTATIONS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.venue_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties to venue request can view quotations"
  ON public.venue_quotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

CREATE POLICY "Venue owners can create quotations"
  ON public.venue_quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id AND public.is_venue_owner(vr.venue_id)
    )
  );

CREATE POLICY "Venue owners or organizers can update quotations"
  ON public.venue_quotations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

-- --------------------------------------------------------------------
-- 9. VENUE AGREEMENTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.venue_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties to venue request can view agreements"
  ON public.venue_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

CREATE POLICY "Venue owners can create agreements"
  ON public.venue_agreements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id AND public.is_venue_owner(vr.venue_id)
    )
  );

CREATE POLICY "Venue owners or organizers can update agreements"
  ON public.venue_agreements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_requests vr
      WHERE vr.id = venue_request_id
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

-- --------------------------------------------------------------------
-- 10. AGREEMENT AUDIT LOGS & OTP CHALLENGES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.agreement_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties to agreement can view audit logs"
  ON public.agreement_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_agreements va
      JOIN public.venue_requests vr ON vr.id = va.venue_request_id
      WHERE va.id = agreement_id
        AND (vr.organizer_id = auth.uid() OR public.is_venue_owner(vr.venue_id))
    )
  );

CREATE POLICY "Authenticated users can record audit logs"
  ON public.agreement_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

ALTER TABLE public.venue_otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue authorities can manage their OTP challenges"
  ON public.venue_otp_challenges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_agreements va
      JOIN public.venue_requests vr ON vr.id = va.venue_request_id
      WHERE va.id = agreement_id AND public.is_venue_owner(vr.venue_id)
    )
  );

-- --------------------------------------------------------------------
-- 12. EVENT ROUNDS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.event_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rounds are viewable for published events or by organizer"
  ON public.event_rounds FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND (e.publication_status = 'published' OR e.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Organizers can manage event rounds"
  ON public.event_rounds FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- --------------------------------------------------------------------
-- 13. EVENT SPONSORS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors are viewable for published events or by organizer"
  ON public.event_sponsors FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND (e.publication_status = 'published' OR e.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Organizers can manage sponsors"
  ON public.event_sponsors FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- --------------------------------------------------------------------
-- 14. EVENT ARRANGEMENTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.event_arrangements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arrangements are viewable for published events or by organizer"
  ON public.event_arrangements FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND (e.publication_status = 'published' OR e.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Organizers can manage event arrangements"
  ON public.event_arrangements FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- --------------------------------------------------------------------
-- 15. EVENT ANNOUNCEMENTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are viewable for published events or by organizer"
  ON public.event_announcements FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND (e.publication_status = 'published' OR e.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Organizers can post announcements"
  ON public.event_announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_event_organizer(event_id) AND created_by = auth.uid());

-- --------------------------------------------------------------------
-- 16. TEAMS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by members, leaders, or event organizer"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    team_leader_id = auth.uid() OR
    public.is_event_organizer(event_id) OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())))
  );

CREATE POLICY "Team leader can create team"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (team_leader_id = auth.uid());

CREATE POLICY "Team leader can update team"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (team_leader_id = auth.uid())
  WITH CHECK (team_leader_id = auth.uid());

-- --------------------------------------------------------------------
-- 17. TEAM MEMBERS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable by team members, leader, or organizer"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.team_leader_id = auth.uid() OR public.is_event_organizer(t.event_id)))
  );

CREATE POLICY "Team leader can add team members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.team_leader_id = auth.uid())
  );

CREATE POLICY "Team leader or member can update membership status"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.team_leader_id = auth.uid())
  );

-- --------------------------------------------------------------------
-- 18. APPLICATIONS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applications viewable by team leader, members, or event organizer"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    public.is_event_organizer(event_id) OR
    EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_id AND (
        t.team_leader_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Team leader can submit application"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.team_leader_id = auth.uid())
  );

CREATE POLICY "Organizer can update application & payment status; Team leader can withdraw"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    public.is_event_organizer(event_id) OR
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.team_leader_id = auth.uid())
  );

-- --------------------------------------------------------------------
-- 19. JUDGING CRITERIA RLS
-- --------------------------------------------------------------------
ALTER TABLE public.judging_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Criteria viewable for published events or by organizer"
  ON public.judging_criteria FOR SELECT
  TO authenticated
  USING (
    public.is_event_organizer(event_id) OR
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.publication_status = 'published')
  );

CREATE POLICY "Organizers can manage criteria"
  ON public.judging_criteria FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- --------------------------------------------------------------------
-- 20. JUDGING SCORES RLS
-- --------------------------------------------------------------------
ALTER TABLE public.judging_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scores viewable by event organizer"
  ON public.judging_scores FOR SELECT
  TO authenticated
  USING (public.is_event_organizer(event_id));

CREATE POLICY "Organizers can enter scores"
  ON public.judging_scores FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id) AND entered_by = auth.uid());

-- --------------------------------------------------------------------
-- 21. EVENT RESULTS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published results viewable by everyone; draft results viewable by organizer"
  ON public.event_results FOR SELECT
  TO authenticated, anon
  USING (
    result_status = 'published' OR public.is_event_organizer(event_id)
  );

CREATE POLICY "Organizers can manage results"
  ON public.event_results FOR ALL
  TO authenticated
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

-- --------------------------------------------------------------------
-- 22. NOTIFICATIONS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications (mark as read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System/Users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 23. ACTIVITY LOGS RLS
-- --------------------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs they performed"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (actor_user_id = auth.uid());

CREATE POLICY "Authenticated users can create activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

