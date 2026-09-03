-- role_permissions: remove blanket authenticated read of the full permission
-- model. Users may only see mappings for roles they actually hold; platform
-- admins keep full visibility (existing policy).
DROP POLICY IF EXISTS "Authenticated read role_permissions" ON public.role_permissions;

CREATE POLICY "Users read permissions for their own roles"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = public.role_permissions.role::text
  )
);

-- installer_releases: regular authenticated users may only see the currently
-- published (active) release; historical/unpublished release metadata,
-- download URLs and checksums stay restricted to platform admins.
DROP POLICY IF EXISTS "Authenticated users read published installers" ON public.installer_releases;

CREATE POLICY "Authenticated users read active installer release"
ON public.installer_releases
FOR SELECT
TO authenticated
USING (is_active = true);