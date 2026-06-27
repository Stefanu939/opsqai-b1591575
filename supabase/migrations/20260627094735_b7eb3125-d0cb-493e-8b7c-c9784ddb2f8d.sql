
-- 1) academy-certificates: add UPDATE/DELETE storage policies for certifiers + platform admins
DROP POLICY IF EXISTS "academy_cert_storage_update" ON storage.objects;
CREATE POLICY "academy_cert_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy-certificates'
    AND (public.is_platform_admin() OR public.has_permission(auth.uid(), 'academy.certify'))
    AND EXISTS (
      SELECT 1 FROM public.academy_certificates c
      WHERE c.pdf_path = storage.objects.name
        AND (public.is_platform_admin() OR c.company_id = public.current_company_id())
    )
  )
  WITH CHECK (
    bucket_id = 'academy-certificates'
    AND (public.is_platform_admin() OR public.has_permission(auth.uid(), 'academy.certify'))
    AND EXISTS (
      SELECT 1 FROM public.academy_certificates c
      WHERE c.pdf_path = storage.objects.name
        AND (public.is_platform_admin() OR c.company_id = public.current_company_id())
    )
  );

DROP POLICY IF EXISTS "academy_cert_storage_delete" ON storage.objects;
CREATE POLICY "academy_cert_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-certificates'
    AND (public.is_platform_admin() OR public.has_permission(auth.uid(), 'academy.certify'))
    AND EXISTS (
      SELECT 1 FROM public.academy_certificates c
      WHERE c.pdf_path = storage.objects.name
        AND (public.is_platform_admin() OR c.company_id = public.current_company_id())
    )
  );

-- 2) brand-assets: explicit deny-by-default RLS policies (platform admin only)
DROP POLICY IF EXISTS "brand_assets_select" ON storage.objects;
CREATE POLICY "brand_assets_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_platform_admin());

DROP POLICY IF EXISTS "brand_assets_insert" ON storage.objects;
CREATE POLICY "brand_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_platform_admin());

DROP POLICY IF EXISTS "brand_assets_update" ON storage.objects;
CREATE POLICY "brand_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_platform_admin())
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_platform_admin());

DROP POLICY IF EXISTS "brand_assets_delete" ON storage.objects;
CREATE POLICY "brand_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_platform_admin());

-- 3) notifications: allow admins/managers to insert notifications for users in their company
DROP POLICY IF EXISTS "notif_insert_admin_manager" ON public.notifications;
CREATE POLICY "notif_insert_admin_manager" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_platform_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = public.current_company_id()
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = notifications.user_id AND p.company_id = notifications.company_id
      )
    )
  );
