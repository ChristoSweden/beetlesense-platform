CREATE POLICY "reports_auth_select" ON storage.objects FOR SELECT USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
CREATE POLICY "reports_service_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports');
