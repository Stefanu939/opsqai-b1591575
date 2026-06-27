
DROP POLICY IF EXISTS workspace_exports_read ON storage.objects;
DROP POLICY IF EXISTS workspace_exports_write ON storage.objects;
DROP POLICY IF EXISTS workspace_exports_update ON storage.objects;
DROP POLICY IF EXISTS workspace_exports_delete ON storage.objects;

CREATE POLICY workspace_exports_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'workspace-exports'
    AND (
      public.is_platform_admin()
      OR (split_part(name,'/',1))::uuid = public.current_company_id()
    )
  );

CREATE POLICY workspace_exports_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-exports'
    AND (
      public.is_platform_admin()
      OR (
        (split_part(name,'/',1))::uuid = public.current_company_id()
        AND (public.has_role(auth.uid(),'workspace_owner') OR public.has_role(auth.uid(),'admin'))
      )
    )
  );

CREATE POLICY workspace_exports_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workspace-exports'
    AND (
      public.is_platform_admin()
      OR (
        (split_part(name,'/',1))::uuid = public.current_company_id()
        AND (public.has_role(auth.uid(),'workspace_owner') OR public.has_role(auth.uid(),'admin'))
      )
    )
  );

CREATE POLICY workspace_exports_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workspace-exports'
    AND (
      public.is_platform_admin()
      OR (
        (split_part(name,'/',1))::uuid = public.current_company_id()
        AND public.has_role(auth.uid(),'workspace_owner')
      )
    )
  );
