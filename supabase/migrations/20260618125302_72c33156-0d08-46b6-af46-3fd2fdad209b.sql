
DO $$
DECLARE keep_id uuid; default_company uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO keep_id FROM auth.users WHERE lower(email) = 'baristefan5@gmail.com' LIMIT 1;
  IF keep_id IS NULL THEN RAISE EXCEPTION 'baristefan5@gmail.com not found'; END IF;

  DELETE FROM auth.users WHERE id <> keep_id;
  DELETE FROM public.user_roles WHERE user_id <> keep_id;
  DELETE FROM public.profiles  WHERE id <> keep_id;

  DELETE FROM public.user_roles WHERE user_id = keep_id;
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (keep_id, 'platform_admin', NULL);

  INSERT INTO public.profiles (id, full_name, language_pref, is_active, company_id)
  VALUES (keep_id, 'Platform Super Admin', 'en', true, default_company)
  ON CONFLICT (id) DO UPDATE SET is_active = true;
END $$;
