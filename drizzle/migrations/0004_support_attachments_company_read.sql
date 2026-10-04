DROP POLICY IF EXISTS "support_attach_read" ON storage.objects;
CREATE POLICY "support_attach_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'support-attachments'
  AND (public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'platform_owner')
       OR owner_id = (select auth.uid()::text)
       OR split_part(name,'/',1) = (SELECT p.company_id::text FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id IS NOT NULL)));