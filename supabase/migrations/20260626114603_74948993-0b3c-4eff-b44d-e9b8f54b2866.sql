
-- ===================================================================
-- SPRINT X — Platform Governance, Enterprise RBAC & Permission Engine
-- ===================================================================

-- ----- 1. Platform Owner allowlist -----------------------------------
CREATE TABLE IF NOT EXISTS public.platform_owner_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);
GRANT SELECT ON public.platform_owner_allowlist TO authenticated;
GRANT ALL ON public.platform_owner_allowlist TO service_role;
ALTER TABLE public.platform_owner_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read allowlist" ON public.platform_owner_allowlist;
CREATE POLICY "owners read allowlist" ON public.platform_owner_allowlist
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = auth.uid()
                   AND ur.role IN ('platform_owner','platform_admin')));

INSERT INTO public.platform_owner_allowlist (email, note)
VALUES ('baristefan5@gmail.com', 'Founding Platform Owner — permanent')
ON CONFLICT (email) DO NOTHING;

-- ----- 2. Immutable flags on user_roles ------------------------------
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_platform_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS immutable_owner   boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_owner_unique_per_user
  ON public.user_roles (user_id) WHERE role = 'platform_owner';

-- ----- 3. Helper functions ------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'platform_owner'
      AND is_platform_owner = true
      AND immutable_owner   = true
  )
$$;
REVOKE ALL ON FUNCTION public.is_platform_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO authenticated, service_role;

-- Platform Owner inherits Platform Admin capability
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('platform_admin','platform_owner')
  )
$$;

-- ----- 4. Permission engine -----------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role       public.app_role NOT NULL,
  permission text            NOT NULL,
  PRIMARY KEY (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated, anon;
GRANT ALL    ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "everyone reads role_permissions" ON public.role_permissions;
CREATE POLICY "everyone reads role_permissions" ON public.role_permissions
  FOR SELECT USING (true);

-- Seed defaults
INSERT INTO public.role_permissions (role, permission) VALUES
  ('platform_owner', '*'),
  -- Platform Super Admin
  ('platform_admin', 'platform.manage'),
  ('platform_admin', 'company.manage'),
  ('platform_admin', 'company.delete'),
  ('platform_admin', 'company.restore'),
  ('platform_admin', 'billing.view'),
  ('platform_admin', 'billing.manage'),
  ('platform_admin', 'user.create'), ('platform_admin', 'user.update'), ('platform_admin', 'user.delete'),
  ('platform_admin', 'analytics.view'), ('platform_admin', 'dashboard.view'), ('platform_admin', 'reports.export'),
  ('platform_admin', 'template.manage'), ('platform_admin', 'notifications.manage'),
  ('platform_admin', 'audit.view'),
  -- Company Admin
  ('admin', 'company.manage'),
  ('admin', 'department.manage'), ('admin', 'warehouse.manage'),
  ('admin', 'user.create'), ('admin', 'user.update'), ('admin', 'user.delete'),
  ('admin', 'knowledge.manage'),
  ('admin', 'sop.create'), ('admin', 'sop.edit'), ('admin', 'sop.delete'), ('admin', 'sop.publish'),
  ('admin', 'faq.create'), ('admin', 'faq.edit'), ('admin', 'faq.delete'),
  ('admin', 'template.manage'),
  ('admin', 'workspace.manage'),
  ('admin', 'audit.view'), ('admin', 'audit.create'), ('admin', 'audit.update'), ('admin', 'audit.close'),
  ('admin', 'analytics.view'), ('admin', 'dashboard.view'), ('admin', 'reports.export'),
  ('admin', 'notifications.manage'),
  -- Manager
  ('manager', 'sop.create'), ('manager', 'sop.edit'), ('manager', 'sop.delete'), ('manager', 'sop.publish'),
  ('manager', 'faq.create'), ('manager', 'faq.edit'), ('manager', 'faq.delete'),
  ('manager', 'template.manage'),
  ('manager', 'audit.create'), ('manager', 'audit.update'), ('manager', 'audit.close'),
  ('manager', 'analytics.view'), ('manager', 'dashboard.view'), ('manager', 'reports.export'),
  ('manager', 'knowledge.manage'),
  ('manager', 'workspace.manage'),
  ('manager', 'notifications.manage'),
  -- Supervisor
  ('supervisor', 'audit.create'), ('supervisor', 'audit.update'),
  ('supervisor', 'sop.suggest'), ('supervisor', 'faq.suggest'),
  ('supervisor', 'workspace.use'),
  ('supervisor', 'reports.export'), ('supervisor', 'dashboard.view'),
  ('supervisor', 'gap.create'),
  -- Operator
  ('operator', 'chat.use'), ('operator', 'workspace.use'),
  ('operator', 'sop.read'), ('operator', 'faq.read'),
  ('operator', 'sop.acknowledge'), ('operator', 'gap.create'), ('operator', 'feedback.submit'),
  -- Viewer (read-only)
  ('viewer', 'sop.read'), ('viewer', 'faq.read'),
  ('viewer', 'dashboard.view')
ON CONFLICT (role, permission) DO NOTHING;

-- Legacy compatibility: old enum values still in production data.
-- Mirror operator/supervisor perms onto employee/team_leader so any
-- un-migrated rows continue to function until they are moved over.
INSERT INTO public.role_permissions (role, permission)
SELECT 'employee'::public.app_role, permission FROM public.role_permissions WHERE role='operator'
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role, permission)
SELECT 'team_leader'::public.app_role, permission FROM public.role_permissions WHERE role='supervisor'
ON CONFLICT DO NOTHING;

-- ----- 5. has_permission --------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_platform_owner(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id
        AND (rp.permission = _permission OR rp.permission = '*')
        AND (
          ur.role IN ('platform_owner','platform_admin')
          OR ur.company_id IS NOT DISTINCT FROM public.current_company_id()
        )
    )
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

-- Convenience wrapper for the current user
CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS TABLE(permission text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT rp.permission
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = auth.uid()
    AND (
      ur.role IN ('platform_owner','platform_admin')
      OR ur.company_id IS NOT DISTINCT FROM public.current_company_id()
    )
$$;
REVOKE ALL ON FUNCTION public.my_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_permissions() TO authenticated, service_role;

-- ----- 6. Immutable Platform Owner protection trigger ---------------
CREATE OR REPLACE FUNCTION public.protect_platform_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'platform_owner' AND OLD.immutable_owner = true THEN
      RAISE EXCEPTION 'Platform Owner record is immutable and cannot be deleted (user_id=%).', OLD.user_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'platform_owner' AND OLD.immutable_owner = true THEN
      IF NEW.user_id IS DISTINCT FROM OLD.user_id
         OR NEW.role <> 'platform_owner'
         OR NEW.is_platform_owner = false
         OR NEW.immutable_owner   = false THEN
        RAISE EXCEPTION 'Platform Owner record is immutable (user_id=%).', OLD.user_id
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_platform_owner_upd ON public.user_roles;
DROP TRIGGER IF EXISTS trg_protect_platform_owner_del ON public.user_roles;
CREATE TRIGGER trg_protect_platform_owner_upd
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_platform_owner();
CREATE TRIGGER trg_protect_platform_owner_del
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_platform_owner();

-- ----- 7. Auto-restore on signup ------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta jsonb;
  fn text; ln text; full_n text; combined text;
  invited_company uuid; invited_role public.app_role;
  user_count int;
  is_owner_email boolean := false;
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

  -- Allowlist check (Platform Owner restoration)
  SELECT EXISTS (SELECT 1 FROM public.platform_owner_allowlist WHERE lower(email)=lower(NEW.email))
    INTO is_owner_email;

  -- Invite-only enforcement (Platform Owner emails are always allowed)
  IF user_count > 0 AND invited_company IS NULL AND NOT is_owner_email THEN
    RAISE EXCEPTION 'Account creation is invite-only. Contact your company administrator for access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF user_count = 0 AND invited_company IS NULL THEN
    invited_role := 'platform_owner';
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, language_pref, company_id)
  VALUES (NEW.id, full_n, fn, ln, COALESCE(meta->>'language_pref', 'en'), invited_company)
  ON CONFLICT (id) DO UPDATE SET company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id);

  IF invited_company IS NOT NULL AND invited_role NOT IN ('platform_admin','platform_owner') THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, invited_role, invited_company)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Bootstrap or allowlisted email → permanent Platform Owner
  IF is_owner_email OR user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role, company_id, is_platform_owner, immutable_owner)
    VALUES (NEW.id, 'platform_owner', NULL, true, true)
    ON CONFLICT (user_id, role) DO UPDATE
      SET is_platform_owner = true, immutable_owner = true;
  END IF;

  RETURN NEW;
END $$;

-- ----- 8. Data migration: legacy roles -> new roles -----------------
-- team_leader -> supervisor, employee -> operator (one row per user per role)
UPDATE public.user_roles ur
SET role = 'supervisor'
WHERE ur.role = 'team_leader'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'supervisor'
  );
DELETE FROM public.user_roles WHERE role = 'team_leader';

UPDATE public.user_roles ur
SET role = 'operator'
WHERE ur.role = 'employee'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'operator'
  );
DELETE FROM public.user_roles WHERE role = 'employee';

-- ----- 9. Backfill: promote allowlisted users to Platform Owner -----
DO $$
DECLARE u record;
BEGIN
  FOR u IN
    SELECT au.id AS user_id
    FROM auth.users au
    JOIN public.platform_owner_allowlist al ON lower(al.email) = lower(au.email)
  LOOP
    INSERT INTO public.user_roles (user_id, role, company_id, is_platform_owner, immutable_owner)
    VALUES (u.user_id, 'platform_owner', NULL, true, true)
    ON CONFLICT (user_id, role) DO UPDATE
      SET is_platform_owner = true, immutable_owner = true;
  END LOOP;
END $$;
