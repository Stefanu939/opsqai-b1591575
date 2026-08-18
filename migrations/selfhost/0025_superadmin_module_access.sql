-- 0025 — SuperAdmin role + per-user module access (Basic package).
--
-- Self-Hosted uses the text role catalog introduced by 0012, not the Cloud
-- app_role enum. company_id is the installation UUID and intentionally has no
-- companies foreign key because Self-Hosted is single-tenant.

BEGIN;

INSERT INTO public.roles (key, name, description, is_system, is_protected)
VALUES (
  'superadmin',
  'Superadmin',
  'Installation administrator with unrestricted access',
  TRUE,
  TRUE
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = TRUE,
  is_protected = TRUE;

-- Superadmin inherits the complete local administrative permission set.
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT 'superadmin', permission_key
FROM public.role_permissions
WHERE role_key IN ('platform_owner', 'platform_admin', 'admin')
ON CONFLICT DO NOTHING;

-- Which modules a non-Superadmin user may open. Superadmins are never
-- restricted; the application layer ignores any rows recorded for them.
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  module_key TEXT NOT NULL,
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id, module_key)
);

CREATE INDEX IF NOT EXISTS user_module_access_user_idx
  ON public.user_module_access (user_id);
CREATE INDEX IF NOT EXISTS user_module_access_company_idx
  ON public.user_module_access (company_id);

COMMIT;
