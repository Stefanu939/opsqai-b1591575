-- 1) user_roles: block escalation to platform_owner / immutable_owner flags
DROP POLICY IF EXISTS restrict_owner_flag_escalation_ins ON public.user_roles;
DROP POLICY IF EXISTS restrict_owner_flag_escalation_upd ON public.user_roles;

CREATE POLICY restrict_owner_flag_escalation_ins
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (COALESCE(is_platform_owner, false) = false
        AND COALESCE(immutable_owner, false) = false
        AND role <> 'platform_owner')
  );

CREATE POLICY restrict_owner_flag_escalation_upd
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    public.is_platform_admin()
    OR (COALESCE(is_platform_owner, false) = false
        AND COALESCE(immutable_owner, false) = false
        AND role <> 'platform_owner')
  );

-- 2) academy-certificates storage: require matching certificate row for uploads
DROP POLICY IF EXISTS academy_cert_storage_write ON storage.objects;

CREATE POLICY academy_cert_storage_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'academy-certificates'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.academy_certificates c
        WHERE c.pdf_path = storage.objects.name
          AND c.company_id = public.current_company_id()
          AND public.has_permission(auth.uid(), 'academy.certify')
      )
    )
  );

-- 3) workspace-temp: explicit UPDATE policy mirroring INSERT/DELETE ownership
DROP POLICY IF EXISTS ws_storage_update ON storage.objects;

CREATE POLICY ws_storage_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'workspace-temp'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  WITH CHECK (
    bucket_id = 'workspace-temp'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );