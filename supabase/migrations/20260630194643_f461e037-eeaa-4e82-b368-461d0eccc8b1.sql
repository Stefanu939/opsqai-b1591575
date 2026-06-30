
-- 1) knowledge_documents: ensure non-company knowledge_type is platform-admin only
DROP POLICY IF EXISTS "company members read documents" ON public.knowledge_documents;
CREATE POLICY "company members read documents"
ON public.knowledge_documents
FOR SELECT
USING (
  is_platform_admin()
  OR (
    knowledge_type = 'company'
    AND company_id = current_company_id()
  )
);

-- Add restrictive policy so no permissive rule can ever expose non-company rows to non-platform users
CREATE POLICY "restrict_non_company_knowledge_to_platform_admin"
ON public.knowledge_documents
AS RESTRICTIVE
FOR SELECT
USING (
  knowledge_type = 'company' OR is_platform_admin()
);

-- 2) notifications: drop redundant permissive insert (covered by notif_insert_admin_manager which already allows user_id = auth.uid())
DROP POLICY IF EXISTS notif_insert ON public.notifications;

-- 3) user_roles: also block company admins from assigning platform_owner via permissive policy
DROP POLICY IF EXISTS "company admins manage company roles" ON public.user_roles;
CREATE POLICY "company admins manage company roles"
ON public.user_roles
FOR ALL
USING (
  is_platform_admin()
  OR (
    company_id = current_company_id()
    AND has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'platform_admin'::app_role
    AND role <> 'platform_owner'::app_role
  )
)
WITH CHECK (
  is_platform_admin()
  OR (
    company_id = current_company_id()
    AND has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'platform_admin'::app_role
    AND role <> 'platform_owner'::app_role
  )
);
