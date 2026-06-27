
-- 1. Profiles: hide phone column from broad reads
REVOKE SELECT (phone) ON public.profiles FROM authenticated;
REVOKE SELECT (phone) ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_profile_phone(_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  target_company uuid;
  caller_company uuid;
  phone_value text;
BEGIN
  IF caller IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT phone, company_id INTO phone_value, target_company
  FROM public.profiles WHERE id = _id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Self
  IF caller = _id THEN
    RETURN phone_value;
  END IF;

  -- Platform admin
  IF public.is_platform_admin() THEN
    RETURN phone_value;
  END IF;

  -- Same-company admins/managers/workspace owners
  SELECT company_id INTO caller_company FROM public.profiles WHERE id = caller;
  IF caller_company IS NOT NULL
     AND caller_company = target_company
     AND (
       public.has_role(caller, 'admin'::app_role)
       OR public.has_role(caller, 'manager'::app_role)
       OR public.has_role(caller, 'workspace_owner'::app_role)
     )
  THEN
    RETURN phone_value;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_phone(uuid) TO authenticated;

-- 2. Exports: restrict SELECT
DROP POLICY IF EXISTS exports_select_company ON public.exports;
CREATE POLICY exports_select_company ON public.exports
FOR SELECT
USING (
  public.is_platform_admin()
  OR (
    company_id = public.current_company_id()
    AND (
      created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'workspace_owner'::app_role)
    )
  )
);

-- 3. workspace-exports storage SELECT: restrict to admins/managers/owners or creator
DROP POLICY IF EXISTS workspace_exports_read ON storage.objects;
CREATE POLICY workspace_exports_read ON storage.objects
FOR SELECT
USING (
  bucket_id = 'workspace-exports'
  AND (
    public.is_platform_admin()
    OR (
      (split_part(name, '/', 1))::uuid = public.current_company_id()
      AND (
        owner = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR public.has_role(auth.uid(), 'workspace_owner'::app_role)
      )
    )
  )
);
