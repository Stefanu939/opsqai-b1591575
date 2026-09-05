CREATE OR REPLACE FUNCTION public.mc_can_see_company(_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin()
    OR public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = _company AND c.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_collaborators cc
      WHERE cc.company_id = _company AND cc.user_id = auth.uid()
    )
$$;