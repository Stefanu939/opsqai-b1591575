GRANT EXECUTE ON FUNCTION public.is_demo_company(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.academy_verify_certificate(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;