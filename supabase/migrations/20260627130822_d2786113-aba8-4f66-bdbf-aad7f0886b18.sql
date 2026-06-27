
CREATE POLICY "customer_exports_platform_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-exports' AND public.is_platform_admin());
CREATE POLICY "customer_exports_platform_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-exports' AND public.is_platform_admin());
CREATE POLICY "customer_exports_platform_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'customer-exports' AND public.is_platform_admin())
  WITH CHECK (bucket_id = 'customer-exports' AND public.is_platform_admin());
CREATE POLICY "customer_exports_platform_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'customer-exports' AND public.is_platform_admin());
