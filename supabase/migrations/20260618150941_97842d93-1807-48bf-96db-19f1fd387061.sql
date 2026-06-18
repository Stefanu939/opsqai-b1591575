CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb;
  fn text; ln text; full_n text; combined text;
  invited_company uuid; invited_role public.app_role;
  user_count int;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  combined := COALESCE(meta->>'full_name', meta->>'name', '');
  fn := COALESCE(meta->>'first_name', NULLIF(split_part(combined, ' ', 1), ''));
  ln := COALESCE(meta->>'last_name',
                 NULLIF(substring(combined FROM nullif(position(' ' IN combined), 0) + 1), ''));
  full_n := COALESCE(NULLIF(combined, ''), NULLIF(trim(concat_ws(' ', fn, ln)), ''), split_part(NEW.email, '@', 1));

  invited_company := NULLIF(meta->>'company_id', '')::uuid;
  invited_role := COALESCE(NULLIF(meta->>'role', ''), 'employee')::public.app_role;

  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Invite-only enforcement:
  -- Allow account creation ONLY when:
  --   (a) bootstrap: no profiles exist yet -> first user becomes platform_admin
  --   (b) admin-invited: raw_user_meta_data.company_id is set
  IF user_count > 0 AND invited_company IS NULL THEN
    RAISE EXCEPTION 'Account creation is invite-only. Contact your company administrator for access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF user_count = 0 AND invited_company IS NULL THEN
    invited_role := 'platform_admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, language_pref, company_id)
  VALUES (NEW.id, full_n, fn, ln, COALESCE(meta->>'language_pref', 'en'), invited_company)
  ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id;

  IF invited_company IS NOT NULL AND invited_role <> 'platform_admin' THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, invited_role, invited_company)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, 'platform_admin', NULL::uuid)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END $function$;