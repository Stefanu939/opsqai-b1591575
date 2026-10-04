DROP POLICY IF EXISTS "Authenticated users can read release files" ON storage.objects;
CREATE POLICY "Platform staff can read release files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'releases' AND public.is_platform_admin());

DROP POLICY IF EXISTS "portal buckets: authenticated read" ON storage.objects;
CREATE POLICY "portal buckets: staff read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = ANY (ARRAY['portal-news-images','portal-download-modules'])
  AND (public.has_role(auth.uid(),'platform_owner') OR public.has_role(auth.uid(),'platform_admin')));

DROP POLICY IF EXISTS "support_attach_read" ON storage.objects;
CREATE POLICY "support_attach_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'support-attachments'
  AND (public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner')
       OR owner_id = (select auth.uid()::text)));