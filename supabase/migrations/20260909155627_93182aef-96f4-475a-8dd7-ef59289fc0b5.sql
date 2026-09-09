REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (id, name, display_name, is_demo_tenant, is_system, active, business_type, enabled_products, created_at, updated_at) ON public.companies TO anon;

REVOKE SELECT ON public.academy_certificates FROM anon;
GRANT SELECT (id, company_id, path_id, user_id, final_score, issued_at, revoked, created_at, updated_at) ON public.academy_certificates TO anon;