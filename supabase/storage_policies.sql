-- Storage RLS policies for BeetleSense buckets

-- Avatars: public read, authenticated upload to own folder
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Captures: authenticated users can manage own captures
CREATE POLICY "captures_auth_select" ON storage.objects FOR SELECT USING (bucket_id = 'captures' AND auth.role() = 'authenticated');
CREATE POLICY "captures_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'captures' AND auth.role() = 'authenticated');
CREATE POLICY "captures_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Pilot data: authenticated pilots can manage uploads
CREATE POLICY "pilot_data_auth_select" ON storage.objects FOR SELECT USING (bucket_id = 'pilot-data' AND auth.role() = 'authenticated');
CREATE POLICY "pilot_data_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pilot-data' AND auth.role() = 'authenticated');
CREATE POLICY "pilot_data_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'pilot-data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Pilot uploads: authenticated pilots can manage
CREATE POLICY "pilot_uploads_auth_select" ON storage.objects FOR SELECT USING (bucket_id = 'pilot-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "pilot_uploads_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pilot-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "pilot_uploads_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'pilot-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
