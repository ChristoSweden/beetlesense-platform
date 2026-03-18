-- ============================================================
-- BeetleSense.ai — Document Vault
-- 011_document_vault.sql
-- Secure document storage for forestry-related files:
-- contracts, certificates, insurance, maps, and historical
-- records. Organized per user/organization with tagging.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Vault Documents
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id   uuid REFERENCES public.organizations(id),
  parcel_id         uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  -- Document info
  title             text NOT NULL,
  description       text,
  document_type     text NOT NULL CHECK (document_type IN (
    'contract', 'certificate', 'insurance', 'map',
    'permit', 'invoice', 'report', 'correspondence',
    'photo', 'deed', 'valuation', 'other'
  )),
  -- File storage
  storage_path      text NOT NULL,                               -- Path in Supabase 'vault-documents' bucket
  original_filename text NOT NULL,
  file_size_bytes   bigint,
  mime_type         text,
  -- Categorization
  tags              text[] DEFAULT '{}',
  -- Dates
  document_date     date,                                        -- Date on the document itself
  expiry_date       date,                                        -- For certificates, insurance, permits
  -- Metadata
  is_archived       boolean NOT NULL DEFAULT false,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_documents_user     ON public.vault_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_documents_org      ON public.vault_documents(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vault_documents_parcel   ON public.vault_documents(parcel_id) WHERE parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vault_documents_type     ON public.vault_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vault_documents_tags     ON public.vault_documents USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_vault_documents_expiry   ON public.vault_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TRIGGER set_vault_documents_updated_at
  BEFORE UPDATE ON public.vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Storage Bucket for Vault Documents
--    Create via Supabase Dashboard > Storage:
--    Bucket: 'vault-documents'
--    Public: false
--    File size limit: 200MB
--    Path pattern: {user_id}/{document_id}_{filename}
-- ────────────────────────────────────────────────────────────

-- Storage RLS policies for vault-documents bucket
-- (Applied when bucket is created; included here for reference)
-- CREATE POLICY "vault_documents_select_own" ON storage.objects
--   FOR SELECT USING (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "vault_documents_insert_own" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "vault_documents_update_own" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "vault_documents_delete_own" ON storage.objects
--   FOR DELETE USING (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

-- Users can see their own documents
CREATE POLICY "vault_documents_select_own" ON public.vault_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users in the same org can see org-level documents
CREATE POLICY "vault_documents_select_org" ON public.vault_documents
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Users can upload their own documents
CREATE POLICY "vault_documents_insert_own" ON public.vault_documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own documents
CREATE POLICY "vault_documents_update_own" ON public.vault_documents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own documents
CREATE POLICY "vault_documents_delete_own" ON public.vault_documents
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
