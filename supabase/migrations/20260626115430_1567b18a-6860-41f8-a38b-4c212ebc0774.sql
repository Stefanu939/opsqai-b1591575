
-- 1. Revoke anon EXECUTE on protect_platform_owner trigger function
REVOKE EXECUTE ON FUNCTION public.protect_platform_owner() FROM PUBLIC, anon;

-- 2. Restrict role_permissions reads to authenticated
DROP POLICY IF EXISTS "everyone reads role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated reads role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.role_permissions FROM anon;

-- 3. Prevent company admins from inserting user_roles for users outside their company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND company_id = _company_id)
$$;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO authenticated;

CREATE POLICY "restrict_company_admin_role_target_company"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.user_belongs_to_company(user_id, company_id)
  );

CREATE POLICY "restrict_company_admin_role_target_company_upd"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR public.user_belongs_to_company(user_id, company_id)
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.user_belongs_to_company(user_id, company_id)
  );
