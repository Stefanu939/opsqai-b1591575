CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_platform_owner(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
        AND (
          ur.role IN ('platform_admin','platform_owner')
          OR ur.company_id IS NOT DISTINCT FROM public.current_company_id()
        )
    )
$function$;