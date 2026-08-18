-- 0025 — SuperAdmin role + per-user module access (Basic package).
--
-- Self-Hosted mirror of the Cloud migration. Row-level security is not used
-- here: the Self-Hosted provider layer connects with a trusted application
-- role and enforces access in server functions.

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'employee';

-- SuperAdmin inherits the full administrative permission set.
INSERT INTO role_permissions (role, permission)
SELECT 'superadmin'::app_role, permission
FROM (
  SELECT permission FROM role_permissions WHERE role = 'workspace_owner'
  UNION
  SELECT permission FROM role_permissions WHERE role = 'admin'
) s
ON CONFLICT DO NOTHING;

-- Which modules a non-SuperAdmin user may open. SuperAdmins are never
-- restricted; the application layer ignores any rows recorded for them.
CREATE TABLE IF NOT EXISTS user_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, module_key)
);

CREATE INDEX IF NOT EXISTS user_module_access_user_idx ON user_module_access (user_id);
CREATE INDEX IF NOT EXISTS user_module_access_company_idx ON user_module_access (company_id);
