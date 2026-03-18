-- ============================================================
-- BeetleSense.ai — Row Level Security Policies
-- 002_rls_policies.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helper functions (JWT claim extractors)
-- ────────────────────────────────────────────────────────────

-- auth.uid() is built-in to Supabase, but we define org/role helpers.

CREATE OR REPLACE FUNCTION public.get_organization_id()
RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 2. Enable RLS on ALL tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_open_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_uploads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fusion_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_access          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_embeddings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_embeddings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_embeddings   ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 3. Organizations
-- ────────────────────────────────────────────────────────────

-- Members can see their own organization
CREATE POLICY "organizations_select_members"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only admin/owner can insert organizations
CREATE POLICY "organizations_insert_admin"
  ON public.organizations FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'owner')
  );

-- Only admin/owner can update their organization
CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. Profiles
-- ────────────────────────────────────────────────────────────

-- Users can see own profile + same-org profiles
CREATE POLICY "profiles_select_own_and_org"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on signup)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 5. Parcels
-- ────────────────────────────────────────────────────────────

-- Same org members can see parcels, OR via parcel_access grants
CREATE POLICY "parcels_select_org_or_access"
  ON public.parcels FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR id IN (
      SELECT parcel_id FROM public.parcel_access WHERE user_id = auth.uid()
    )
  );

-- Owner/admin of the org can insert parcels
CREATE POLICY "parcels_insert_owner_admin"
  ON public.parcels FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owner/admin of the org can update parcels
CREATE POLICY "parcels_update_owner_admin"
  ON public.parcels FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. Parcel Open Data
-- ────────────────────────────────────────────────────────────

-- Follows parcel visibility
CREATE POLICY "parcel_open_data_select"
  ON public.parcel_open_data FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
      OR id IN (
        SELECT parcel_id FROM public.parcel_access WHERE user_id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. Surveys
-- ────────────────────────────────────────────────────────────

-- Same org can see surveys
CREATE POLICY "surveys_select_org"
  ON public.surveys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Pilot, inspector, admin, owner can create surveys
CREATE POLICY "surveys_insert_roles"
  ON public.surveys FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'pilot', 'inspector')
    )
  );

-- Assigned pilot or admin/owner can update surveys
CREATE POLICY "surveys_update_assigned_admin"
  ON public.surveys FOR UPDATE
  USING (
    pilot_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    pilot_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 8. Survey Uploads
-- ────────────────────────────────────────────────────────────

-- Same org can see uploads
CREATE POLICY "survey_uploads_select_org"
  ON public.survey_uploads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Pilot/inspector can insert uploads
CREATE POLICY "survey_uploads_insert_roles"
  ON public.survey_uploads FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('pilot', 'inspector')
    )
  );

-- Uploader (via survey's pilot) can update uploads
CREATE POLICY "survey_uploads_update_uploader"
  ON public.survey_uploads FOR UPDATE
  USING (
    survey_id IN (
      SELECT id FROM public.surveys WHERE pilot_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys WHERE pilot_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 9. Analysis Results
-- ────────────────────────────────────────────────────────────

-- Same org can see analysis results
CREATE POLICY "analysis_results_select_org"
  ON public.analysis_results FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 10. Fusion Results
-- ────────────────────────────────────────────────────────────

CREATE POLICY "fusion_results_select_org"
  ON public.fusion_results FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 11. Reports
-- ────────────────────────────────────────────────────────────

CREATE POLICY "reports_select_org"
  ON public.reports FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 12. Companion Sessions
-- ────────────────────────────────────────────────────────────

-- Users can only see their own sessions
CREATE POLICY "companion_sessions_select_own"
  ON public.companion_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "companion_sessions_insert_own"
  ON public.companion_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "companion_sessions_update_own"
  ON public.companion_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 13. Companion Messages
-- ────────────────────────────────────────────────────────────

-- Users can only see messages in their own sessions
CREATE POLICY "companion_messages_select_own_sessions"
  ON public.companion_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.companion_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "companion_messages_insert_own_sessions"
  ON public.companion_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.companion_sessions WHERE user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 14. Pilot Profiles
-- ────────────────────────────────────────────────────────────

-- Public read for pilot discovery (all authenticated users)
CREATE POLICY "pilot_profiles_select_all"
  ON public.pilot_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pilots can only update their own profile
CREATE POLICY "pilot_profiles_update_own"
  ON public.pilot_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Pilots can insert their own pilot profile
CREATE POLICY "pilot_profiles_insert_own"
  ON public.pilot_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 15. Satellite Observations
-- ────────────────────────────────────────────────────────────

CREATE POLICY "satellite_observations_select_org"
  ON public.satellite_observations FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 16. Processing Jobs
-- ────────────────────────────────────────────────────────────

CREATE POLICY "processing_jobs_select_org"
  ON public.processing_jobs FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 17. Parcel Access
-- ────────────────────────────────────────────────────────────

-- Involved parties can see access grants (parcel owner org or the granted user)
CREATE POLICY "parcel_access_select_involved"
  ON public.parcel_access FOR SELECT
  USING (
    user_id = auth.uid()
    OR parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Org admin/owner can grant access
CREATE POLICY "parcel_access_insert_admin"
  ON public.parcel_access FOR INSERT
  WITH CHECK (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Org admin/owner can revoke access
CREATE POLICY "parcel_access_delete_admin"
  ON public.parcel_access FOR DELETE
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 18. Research Embeddings (public knowledge base — all authenticated)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "research_embeddings_select_authenticated"
  ON public.research_embeddings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 19. Regulatory Embeddings (public knowledge base — all authenticated)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "regulatory_embeddings_select_authenticated"
  ON public.regulatory_embeddings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 20. User Data Embeddings (CRITICAL: per-user isolation)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "user_data_embeddings_select_own"
  ON public.user_data_embeddings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_data_embeddings_insert_own"
  ON public.user_data_embeddings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_data_embeddings_delete_own"
  ON public.user_data_embeddings FOR DELETE
  USING (user_id = auth.uid());
