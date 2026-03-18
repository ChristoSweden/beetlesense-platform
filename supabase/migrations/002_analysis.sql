-- ============================================================
-- BeetleSense.ai — Analysis & Processing
-- 002_analysis.sql
-- Analysis results, fusion results, and processing job queue.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Analysis Results (per-module AI inference outputs)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.analysis_results (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id          uuid        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  module             text        NOT NULL CHECK (module IN ('tree_count','species_id','animal_inventory','beetle_detection','boar_damage','module_6')),
  status             text        DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
  started_at         timestamptz,
  completed_at       timestamptz,
  confidence_score   numeric     CHECK (confidence_score BETWEEN 0 AND 1),
  result_summary     jsonb       DEFAULT '{}',
  result_geojson     jsonb,
  result_raster_path text,
  model_version      text,
  processing_log     text[],
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_survey_module ON public.analysis_results(survey_id, module);

-- ────────────────────────────────────────────────────────────
-- 2. Fusion Results (multi-module combined outputs)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fusion_results (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id          uuid        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  fusion_type        text        NOT NULL,
  input_modules      text[],
  output_summary     jsonb       DEFAULT '{}',
  output_geojson     jsonb,
  output_raster_path text,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fusion_results_survey_id ON public.fusion_results(survey_id);

-- ────────────────────────────────────────────────────────────
-- 3. Processing Jobs (BullMQ audit trail)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid        REFERENCES public.surveys(id),
  job_type        text        NOT NULL,
  bullmq_job_id   text,
  status          text        DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','stalled')),
  attempts        integer     DEFAULT 0,
  progress        numeric     DEFAULT 0,
  result          jsonb,
  error           text,
  created_at      timestamptz DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status    ON public.processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_survey_id ON public.processing_jobs(survey_id);

-- ────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fusion_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs  ENABLE ROW LEVEL SECURITY;

-- Analysis results: visible to same-org members via survey
CREATE POLICY "analysis_results_select_org" ON public.analysis_results FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Fusion results: visible to same-org members via survey
CREATE POLICY "fusion_results_select_org" ON public.fusion_results FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Processing jobs: visible to same-org members via survey
CREATE POLICY "processing_jobs_select_org" ON public.processing_jobs FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );
