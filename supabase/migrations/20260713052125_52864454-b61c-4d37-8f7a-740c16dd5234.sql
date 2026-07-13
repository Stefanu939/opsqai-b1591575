
-- 1) installation_package_downloads: explicit deny of INSERT/UPDATE/DELETE for authenticated users
--    (service_role bypasses RLS, so writes still work from server-only paths).
CREATE POLICY "Block client writes on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- The permissive SELECT policies still apply because a RESTRICTIVE ALL policy
-- combines with permissives via AND, but USING(false) blocks SELECT too.
-- Split into write-only restriction so reads keep working.
DROP POLICY "Block client writes on package download logs"
  ON public.installation_package_downloads;

CREATE POLICY "Block client inserts on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block client deletes on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- 2) support_messages: add a defence-in-depth restrictive policy that guarantees
--    a non-platform authenticated user can never insert with sender_kind other
--    than 'customer', or set internal_note = true.
CREATE POLICY "Non-platform senders cannot spoof sender_kind"
  ON public.support_messages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_admin'::app_role)
    OR public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR (sender_kind = 'customer'::support_sender_kind AND internal_note = false)
  );

-- 3) user_belongs_to_company usage: also require acting admin's own company
--    to match the target row's company_id. Replace the two restrict policies.
DROP POLICY IF EXISTS restrict_company_admin_role_target_company ON public.user_roles;
DROP POLICY IF EXISTS restrict_company_admin_role_target_company_upd ON public.user_roles;

CREATE POLICY "restrict_company_admin_role_target_company"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = public.current_company_id()
      AND public.user_belongs_to_company(user_id, company_id)
    )
  );

CREATE POLICY "restrict_company_admin_role_target_company_upd"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = public.current_company_id()
      AND public.user_belongs_to_company(user_id, company_id)
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = public.current_company_id()
      AND public.user_belongs_to_company(user_id, company_id)
    )
  );
