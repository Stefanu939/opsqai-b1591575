
-- 1) role_permissions: restrict SELECT to platform admins (removes cross-tenant recon exposure)
DROP POLICY IF EXISTS "authenticated reads role_permissions" ON public.role_permissions;

CREATE POLICY "Platform admins read role_permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- 2) user_roles: mirror the WITH CHECK scoping into USING for consistency.
DROP POLICY IF EXISTS "restrict_owner_flag_escalation_upd" ON public.user_roles;

CREATE POLICY "restrict_owner_flag_escalation_upd"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin()
  OR (
    COALESCE(is_platform_owner, false) = false
    AND COALESCE(immutable_owner, false) = false
    AND role <> 'platform_owner'::app_role
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    COALESCE(is_platform_owner, false) = false
    AND COALESCE(immutable_owner, false) = false
    AND role <> 'platform_owner'::app_role
  )
);
