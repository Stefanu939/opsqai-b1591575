
-- 1. Tighten exports_select_company policy to authenticated role
DROP POLICY IF EXISTS "exports_select_company" ON public.exports;
CREATE POLICY "exports_select_company" ON public.exports
  FOR SELECT TO authenticated
  USING (
    is_platform_admin() OR (
      (company_id = current_company_id())
      AND (
        (created_by = auth.uid())
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'workspace_owner'::app_role)
      )
    )
  );

-- 2. Tighten "company members read documents" policy to authenticated role
DROP POLICY IF EXISTS "company members read documents" ON public.knowledge_documents;
CREATE POLICY "company members read documents" ON public.knowledge_documents
  FOR SELECT TO authenticated
  USING (
    is_platform_admin() OR (
      (knowledge_type = 'company'::text)
      AND (company_id = current_company_id())
    )
  );

-- 3. Tighten workspace_exports_read on storage.objects to authenticated role
DROP POLICY IF EXISTS "workspace_exports_read" ON storage.objects;
CREATE POLICY "workspace_exports_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    (bucket_id = 'workspace-exports'::text) AND (
      is_platform_admin() OR (
        ((split_part(name, '/'::text, 1))::uuid = current_company_id())
        AND (
          (owner = auth.uid())
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'manager'::app_role)
          OR has_role(auth.uid(), 'workspace_owner'::app_role)
        )
      )
    )
  );

-- 4. Lock down assignment of is_demo_tenant flag: only platform_admin/platform_owner
--    can enable it. This bounds blast radius of the anon demo policies.
CREATE OR REPLACE FUNCTION public.enforce_demo_tenant_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_demo_tenant IS TRUE AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only platform administrators may flag a company as a demo tenant';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_demo_tenant, false) IS DISTINCT FROM COALESCE(OLD.is_demo_tenant, false)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only platform administrators may change the is_demo_tenant flag';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_demo_tenant_flag_trg ON public.companies;
CREATE TRIGGER enforce_demo_tenant_flag_trg
BEFORE INSERT OR UPDATE OF is_demo_tenant ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_tenant_flag();
