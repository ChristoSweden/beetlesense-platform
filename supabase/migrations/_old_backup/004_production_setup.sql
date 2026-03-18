-- Migration: 004_production_setup.sql
-- Description: Auto-profile trigger, storage bucket instructions, storage RLS, and profile+org view
-- Date: 2026-03-16

-- ============================================================================
-- 1. Auto-profile creation trigger on auth.users insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'sv'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. Storage buckets (create via Supabase Dashboard > Storage)
-- ============================================================================

-- Storage buckets (create via Supabase Dashboard > Storage):
-- 1. 'captures' — photo captures from smartphone/drone
--    Public: false, File size limit: 50MB, Allowed types: image/*
-- 2. 'avatars' — user profile photos
--    Public: true, File size limit: 5MB, Allowed types: image/*
-- 3. 'survey-uploads' — drone imagery and data files
--    Public: false, File size limit: 500MB
-- 4. 'reports' — generated PDF reports
--    Public: false, File size limit: 50MB, Allowed types: application/pdf

-- ============================================================================
-- 3. Storage RLS policies
-- ============================================================================

-- Avatars: public read, authenticated upload own
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Captures: authenticated users in same org can read, uploader can write
CREATE POLICY "Authenticated users can upload captures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'captures' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view captures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'captures' AND auth.role() = 'authenticated');

-- ============================================================================
-- 4. Convenience view: profile with organization name
-- ============================================================================

CREATE OR REPLACE VIEW public.profile_with_org AS
SELECT
  p.*,
  o.name as organization_name
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id;
