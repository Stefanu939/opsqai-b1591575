-- Self-Hosted owner protection and approved role preset names.
BEGIN;

INSERT INTO public.roles (key, name, description, is_system, is_protected) VALUES
  ('platform_owner','Superadmin','Installation owner with unrestricted access',TRUE,TRUE),
  ('platform_admin','Superadmin','Delegated installation administrator',TRUE,TRUE)
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  is_system=TRUE,
  is_protected=TRUE;

UPDATE public.roles SET name='Superadmin', description='Full control of this OPSQAI installation', is_protected=TRUE WHERE key='admin';
UPDATE public.roles SET name='Supervisor', description='Leads a team and maintains operational knowledge' WHERE key='team_leader';
UPDATE public.roles SET name='Worker', description='Uses AI Chat, Academy and internal messages' WHERE key='employee';

INSERT INTO public.role_permissions (role_key, permission_key)
SELECT role_key, p.key
FROM (VALUES ('platform_owner'),('platform_admin')) AS owners(role_key)
CROSS JOIN public.permissions p
ON CONFLICT DO NOTHING;

-- Upgrade the original setup account on existing installations. Fresh
-- installs are also assigned this role explicitly by admin-seed.mjs.
INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'platform_owner'
FROM public.user_roles ur
JOIN public.users u ON u.id=ur.user_id
WHERE ur.role='admin'
ORDER BY u.created_at
LIMIT 1
ON CONFLICT DO NOTHING;

-- Worker is intentionally restricted to the three approved product areas.
DELETE FROM public.role_permissions WHERE role_key='employee';
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('employee','chat.use'),
  ('employee','academy.learn'),
  ('employee','messages.use')
ON CONFLICT DO NOTHING;

COMMIT;