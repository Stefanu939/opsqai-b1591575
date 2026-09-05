-- 1) Owner on companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_user_id uuid;
CREATE INDEX IF NOT EXISTS companies_owner_user_id_idx ON public.companies(owner_user_id);

-- 2) Collaborators (shared visibility)
CREATE TABLE IF NOT EXISTS public.company_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_collaborators TO authenticated;
GRANT ALL ON public.company_collaborators TO service_role;

ALTER TABLE public.company_collaborators ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS company_collaborators_user_idx ON public.company_collaborators(user_id);

-- 3) Ownership-aware visibility helper
CREATE OR REPLACE FUNCTION public.mc_can_see_company(_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = _company AND c.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_collaborators cc
      WHERE cc.company_id = _company AND cc.user_id = auth.uid()
    )
$$;

CREATE POLICY "collaborators readable by platform staff"
ON public.company_collaborators FOR SELECT TO authenticated
USING (public.is_platform_admin() AND (public.is_platform_owner(auth.uid()) OR user_id = auth.uid() OR public.mc_can_see_company(company_id)));

CREATE POLICY "collaborators managed by platform owner"
ON public.company_collaborators FOR ALL TO authenticated
USING (public.is_platform_owner(auth.uid()) OR (public.is_platform_admin() AND public.mc_can_see_company(company_id)))
WITH CHECK (public.is_platform_owner(auth.uid()) OR (public.is_platform_admin() AND public.mc_can_see_company(company_id)));

CREATE TRIGGER company_collaborators_touch
BEFORE UPDATE ON public.company_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Backfill owner from existing account manager assignments
UPDATE public.companies c
SET owner_user_id = cp.account_manager_id
FROM public.customer_profiles cp
WHERE cp.company_id = c.id
  AND cp.account_manager_id IS NOT NULL
  AND c.owner_user_id IS NULL;

-- 5) Ownership-aware access for OPSQAI staff on companies
DROP POLICY IF EXISTS "platform_admin_full_select" ON public.companies;
DROP POLICY IF EXISTS "platform admins manage companies" ON public.companies;

CREATE POLICY "platform staff read owned companies"
ON public.companies FOR SELECT TO authenticated
USING (public.is_platform_admin() AND (public.is_platform_owner(auth.uid()) OR public.mc_can_see_company(id)));

CREATE POLICY "platform staff insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin());

CREATE POLICY "platform staff update owned companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_platform_admin() AND (public.is_platform_owner(auth.uid()) OR public.mc_can_see_company(id)))
WITH CHECK (public.is_platform_admin() AND (public.is_platform_owner(auth.uid()) OR public.mc_can_see_company(id)));

CREATE POLICY "platform owner deletes companies"
ON public.companies FOR DELETE TO authenticated
USING (public.is_platform_owner(auth.uid()) OR public.is_platform_admin());
