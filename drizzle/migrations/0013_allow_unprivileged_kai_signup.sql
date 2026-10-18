CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  meta jsonb;
  fn text; ln text; full_n text; combined text;
  invited_company uuid := NULL;
  invited_role public.app_role := 'employee';
  trusted_provisioning boolean;
  is_owner_email boolean := false;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  combined := COALESCE(meta->>'full_name', meta->>'name', '');
  fn := COALESCE(meta->>'first_name', NULLIF(split_part(combined, ' ', 1), ''));
  ln := COALESCE(meta->>'last_name', NULLIF(substring(combined FROM nullif(position(' ' IN combined), 0) + 1), ''));
  full_n := COALESCE(NULLIF(combined, ''), NULLIF(trim(concat_ws(' ', fn, ln)), ''), split_part(NEW.email, '@', 1));

  -- Only Auth admin API app_metadata or a server-issued invitation can provision access.
  -- Public signup metadata (including company_id/role) never authorizes anything.
  trusted_provisioning := COALESCE(NEW.raw_app_meta_data->>'opsqai_provisioned', '') = 'true'
    OR NEW.invited_at IS NOT NULL;
  IF trusted_provisioning THEN
    invited_company := NULLIF(meta->>'company_id', '')::uuid;
    invited_role := COALESCE(NULLIF(meta->>'role', ''), 'employee')::public.app_role;
  END IF;

  -- No first-public-user promotion. First-run setup uses its guarded bootstrap RPC.
  -- An unconfirmed public signup cannot claim an allowlisted owner's privileges.
  IF NEW.email_confirmed_at IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.platform_owner_allowlist WHERE lower(email) = lower(NEW.email))
      INTO is_owner_email;
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, language_pref, company_id)
  VALUES (NEW.id, full_n, fn, ln, COALESCE(meta->>'language_pref', 'en'), invited_company)
  ON CONFLICT (id) DO UPDATE SET company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id);

  IF invited_company IS NOT NULL AND invited_role NOT IN ('platform_admin', 'platform_owner', 'superadmin') THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, invited_role, invited_company)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF is_owner_email THEN
    INSERT INTO public.user_roles (user_id, role, company_id, is_platform_owner, immutable_owner)
    VALUES (NEW.id, 'platform_owner', NULL, true, true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_platform_owner = true, immutable_owner = true;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;