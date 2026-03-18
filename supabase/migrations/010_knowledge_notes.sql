-- ============================================================
-- BeetleSense.ai — Knowledge Notes
-- 010_knowledge_notes.sql
-- Voice/text notes attached to parcels or general forest
-- knowledge. Supports audio recordings with transcription.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Knowledge Notes
--    Forest owners record observations, reminders, and
--    knowledge via text or audio (transcribed by AI).
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parcel_id         uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  -- Content
  title             text,
  body              text,                                        -- Text content or transcription
  note_type         text NOT NULL DEFAULT 'text' CHECK (note_type IN ('text', 'audio', 'photo')),
  -- Audio-specific fields
  audio_storage_path text,                                       -- Path in Supabase storage
  audio_duration_sec numeric,
  transcription     text,                                        -- AI-generated transcription
  transcription_status text DEFAULT 'none' CHECK (transcription_status IN ('none', 'pending', 'complete', 'failed')),
  -- Location (SWEREF99 TM)
  location          geometry(Point, 3006),
  latitude          double precision,
  longitude         double precision,
  -- Categorization
  tags              text[] DEFAULT '{}',
  category          text DEFAULT 'general' CHECK (category IN ('general', 'observation', 'reminder', 'action_item', 'meeting_note', 'historical')),
  is_pinned         boolean NOT NULL DEFAULT false,
  -- Metadata
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_notes_user     ON public.knowledge_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_parcel   ON public.knowledge_notes(parcel_id) WHERE parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_category ON public.knowledge_notes(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_tags     ON public.knowledge_notes USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_location ON public.knowledge_notes USING gist (location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_pinned   ON public.knowledge_notes(user_id) WHERE is_pinned = true;

CREATE TRIGGER set_knowledge_notes_updated_at
  BEFORE UPDATE ON public.knowledge_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Storage Bucket for Audio Notes
--    Create via Supabase Dashboard > Storage:
--    Bucket: 'knowledge-audio'
--    Public: false
--    File size limit: 100MB
--    Allowed types: audio/*
-- ────────────────────────────────────────────────────────────

-- Storage RLS policies for knowledge-audio bucket
-- (Applied when bucket is created; included here for reference)
-- CREATE POLICY "knowledge_audio_select_own" ON storage.objects
--   FOR SELECT USING (bucket_id = 'knowledge-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "knowledge_audio_insert_own" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'knowledge-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "knowledge_audio_delete_own" ON storage.objects
--   FOR DELETE USING (bucket_id = 'knowledge-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.knowledge_notes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes
CREATE POLICY "knowledge_notes_select_own" ON public.knowledge_notes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own notes
CREATE POLICY "knowledge_notes_insert_own" ON public.knowledge_notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own notes
CREATE POLICY "knowledge_notes_update_own" ON public.knowledge_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notes
CREATE POLICY "knowledge_notes_delete_own" ON public.knowledge_notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
