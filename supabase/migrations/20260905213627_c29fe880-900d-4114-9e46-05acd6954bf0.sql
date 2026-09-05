REVOKE ALL ON FUNCTION public.mc_can_see_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mc_can_see_company(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mc_can_see_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mc_can_see_company(uuid) TO service_role;
