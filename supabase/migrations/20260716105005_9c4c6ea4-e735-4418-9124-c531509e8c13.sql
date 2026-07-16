CREATE OR REPLACE FUNCTION public.search_chat_contacts(_q text, _limit integer DEFAULT 15)
 RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, is_staff boolean, is_colleague boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _my_company uuid;
  _pat text;
BEGIN
  IF _me IS NULL THEN RETURN; END IF;
  IF coalesce(length(trim(_q)), 0) < 2 THEN RETURN; END IF;
  _pat := '%' || trim(_q) || '%';
  SELECT p.company_id INTO _my_company FROM public.profiles p WHERE p.id = _me;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(p.full_name, ''), NULLIF(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')), ''), '')::text AS full_name,
    u.email::text AS email,
    NULL::text AS avatar_url,
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('platform_owner','platform_admin')) AS is_staff,
    (p.company_id IS NOT NULL AND p.company_id = _my_company) AS is_colleague
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> _me
    AND COALESCE(p.is_active, true) = true
    AND (
      (p.company_id IS NOT NULL AND p.company_id = _my_company)
      OR EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('platform_owner','platform_admin'))
    )
    AND (
      p.full_name ILIKE _pat
      OR p.first_name ILIKE _pat
      OR p.last_name ILIKE _pat
      OR u.email ILIKE _pat
    )
  ORDER BY
    (p.company_id IS NOT NULL AND p.company_id = _my_company) DESC,
    COALESCE(p.full_name, u.email::text) ASC
  LIMIT _limit;
END;
$function$;