
-- Bootstrap baristefan5@gmail.com as platform_admin if the auth user exists
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = 'baristefan5@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (uid, 'platform_admin', NULL)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Ensure platform_admin visibility on every tenant-scoped table via additive SELECT policies.
-- has_role already returns true for platform_admin regardless of company.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','user_roles','threads','messages','knowledge_documents','document_chunks','faqs','audit_log','departments','companies']) LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "platform_admin_full_select" ON public.%I;
      CREATE POLICY "platform_admin_full_select" ON public.%I
        FOR SELECT TO authenticated
        USING (public.is_platform_admin());
    $f$, t, t);
  END LOOP;
END $$;

-- Allow platform_admin to manage user_roles (promote/demote other platform admins)
DROP POLICY IF EXISTS "platform_admin_manage_roles" ON public.user_roles;
CREATE POLICY "platform_admin_manage_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
