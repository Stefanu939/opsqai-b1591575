
-- 1) Revoke EXECUTE from anon/PUBLIC on SECURITY DEFINER academy_* functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
      AND p.proname IN ('academy_company_visible','academy_department_performance','academy_heatmap',
                       'academy_kpis','academy_on_sop_change','academy_snapshot_lesson','academy_verify_certificate')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
  END LOOP;
END $$;

-- 2) Tighten academy-certificates storage read policy
DROP POLICY IF EXISTS "academy_cert_storage_read" ON storage.objects;
CREATE POLICY "academy_cert_storage_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id='academy-certificates' AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.academy_certificates c
      WHERE c.pdf_path = storage.objects.name
        AND (
          c.user_id = auth.uid()
          OR (c.company_id = public.current_company_id()
              AND public.has_permission(auth.uid(),'academy.certify'))
        )
    )
  )
);

-- 3) Restrict departments email/phone exposure
DROP POLICY IF EXISTS "company members read departments" ON public.departments;
CREATE POLICY "company members read departments" ON public.departments FOR SELECT TO authenticated
USING (
  is_platform_admin()
  OR (
    company_id = current_company_id() AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'team_leader'::app_role)
      OR id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);
