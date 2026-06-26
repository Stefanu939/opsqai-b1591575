
DO $$ BEGIN
  CREATE POLICY "academy_cert_storage_read" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id='academy-certificates' AND (
      public.is_platform_admin()
      OR (split_part(name,'/',1)::uuid = public.current_company_id())
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "academy_cert_storage_write" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id='academy-certificates' AND public.has_permission(auth.uid(),'academy.certify') AND (
      public.is_platform_admin() OR (split_part(name,'/',1)::uuid = public.current_company_id())
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
