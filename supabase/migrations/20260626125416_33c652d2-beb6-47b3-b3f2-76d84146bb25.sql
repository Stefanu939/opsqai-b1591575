
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_platform_owner(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.ensure_platform_owner()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE rec record; restored int := 0;
BEGIN
  FOR rec IN
    SELECT u.id AS user_id
    FROM auth.users u
    JOIN public.platform_owner_allowlist a ON lower(a.email)=lower(u.email)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=rec.user_id AND role='platform_owner') THEN
      INSERT INTO public.user_roles (user_id, role, company_id, is_platform_owner, immutable_owner)
      VALUES (rec.user_id, 'platform_owner', NULL, true, true);
      restored := restored + 1;
    ELSE
      UPDATE public.user_roles
        SET is_platform_owner=true, immutable_owner=true
        WHERE user_id=rec.user_id AND role='platform_owner'
          AND (is_platform_owner IS DISTINCT FROM true OR immutable_owner IS DISTINCT FROM true);
    END IF;
  END LOOP;
  RETURN restored;
END $$;

REVOKE EXECUTE ON FUNCTION public.ensure_platform_owner() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.ensure_platform_owner() TO service_role;

SELECT public.ensure_platform_owner();

ALTER FUNCTION public.protect_platform_owner() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
