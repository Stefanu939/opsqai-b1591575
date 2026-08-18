-- SuperAdmin inherits every permission workspace_owner has, plus admin's set.
INSERT INTO public.role_permissions (role, permission)
SELECT 'superadmin'::public.app_role, permission
FROM (
  SELECT permission FROM public.role_permissions WHERE role = 'workspace_owner'
  UNION
  SELECT permission FROM public.role_permissions WHERE role = 'admin'
) s
ON CONFLICT DO NOTHING;

-- Per-user module access for non-SuperAdmin users. SuperAdmins are never
-- restricted: the application layer ignores any rows for them.
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, module_key)
);

CREATE INDEX IF NOT EXISTS user_module_access_user_idx ON public.user_module_access (user_id);
CREATE INDEX IF NOT EXISTS user_module_access_company_idx ON public.user_module_access (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_module_access TO authenticated;
GRANT ALL ON public.user_module_access TO service_role;

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own module access"
ON public.user_module_access FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read module access in their company"
ON public.user_module_access FOR SELECT TO authenticated
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'workspace_owner'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Admins can manage module access in their company"
ON public.user_module_access FOR ALL TO authenticated
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'workspace_owner'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  public.user_belongs_to_company(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_role(auth.uid(), 'workspace_owner'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);