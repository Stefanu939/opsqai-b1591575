-- 0032 — Unified named-user functional rights for Self-Hosted.
-- Owner and SuperAdmin remain unrestricted in application authorization.
-- Admin and other roles may receive explicit per-area overrides.

BEGIN;

INSERT INTO public.permissions (key, label, category, description) VALUES
  ('transport.view','View Transport','Transport','Open Transport workspaces and read records'),
  ('transport.create','Create Transport records','Transport','Create vehicles, drivers, documents and operational records'),
  ('transport.edit','Edit Transport records','Transport','Change Transport records, checklists and CMR data'),
  ('transport.delete','Delete Transport records','Transport','Delete Transport records'),
  ('transport.approve','Approve Transport decisions','Transport','Approve requests and incident decisions'),
  ('transport.administer','Administer Transport','Transport','Manage Transport settings, rights and exports')
ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, category=EXCLUDED.category, description=EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.area_permission_map (
  area_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view','create','edit','delete','approve','administer')),
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (area_key, action),
  UNIQUE (permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_area_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  area_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view','create','edit','delete','approve','administer')),
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id, area_key, action)
);

CREATE INDEX IF NOT EXISTS user_area_rights_user_idx ON public.user_area_rights (user_id);
CREATE INDEX IF NOT EXISTS user_area_rights_company_idx ON public.user_area_rights (company_id);

ALTER TABLE public.transport_grants DROP CONSTRAINT IF EXISTS transport_grants_key_check;
ALTER TABLE public.transport_grants ADD CONSTRAINT transport_grants_key_check CHECK (
  grant_key IN ('view','create','edit','delete','approve','checklist','settings','export','cmr')
);

-- Existing Transport edit rights historically covered create/edit/delete.
INSERT INTO public.transport_grants (user_id, grant_key, granted_by)
SELECT user_id, expanded.grant_key, granted_by
FROM public.transport_grants current_grant
CROSS JOIN LATERAL (VALUES ('create'), ('delete')) AS expanded(grant_key)
WHERE current_grant.grant_key = 'edit'
ON CONFLICT (user_id, grant_key) DO NOTHING;

INSERT INTO public.area_permission_map (area_key, action, permission_key) VALUES
  ('platform','administer','platform.manage'),
  ('roles','administer','role.manage'),
  ('users','create','user.create'),('users','edit','user.update'),('users','delete','user.delete'),
  ('departments','administer','department.manage'),
  ('chat','view','chat.use'),('messages','view','messages.use'),
  ('knowledge','view','knowledge.read'),('knowledge','administer','knowledge.manage'),
  ('sop','view','sop.read'),('sop','create','sop.create'),('sop','edit','sop.edit'),
  ('sop','delete','sop.delete'),('sop','approve','sop.publish'),
  ('faq','view','faq.read'),('faq','create','faq.create'),('faq','edit','faq.edit'),('faq','delete','faq.delete'),
  ('academy','view','academy.learn'),('academy','edit','academy.manage'),('academy','approve','academy.publish'),
  ('ai_audit','view','ai_audit.view'),('ai_audit','create','ai_audit.run'),
  ('notifications','view','notifications.read'),('notifications','administer','notifications.manage'),
  ('analytics','view','analytics.view'),('dashboard','view','dashboard.view'),
  ('feedback','create','feedback.submit')
  ,('transport','view','transport.view'),('transport','create','transport.create'),
  ('transport','edit','transport.edit'),('transport','delete','transport.delete'),
  ('transport','approve','transport.approve'),('transport','administer','transport.administer')
ON CONFLICT DO NOTHING;

-- Bridge the existing Transport-specific matrix into the canonical rights.
INSERT INTO public.user_area_rights (user_id, company_id, area_key, action, granted, granted_by)
SELECT tg.user_id, u.company_id, 'transport', mapped.action, TRUE, tg.granted_by
FROM public.transport_grants tg
JOIN public.users u ON u.id = tg.user_id
CROSS JOIN LATERAL (
  SELECT CASE tg.grant_key
    WHEN 'view' THEN 'view'
    WHEN 'create' THEN 'create'
    WHEN 'edit' THEN 'edit'
    WHEN 'delete' THEN 'delete'
    WHEN 'approve' THEN 'approve'
    WHEN 'settings' THEN 'administer'
    ELSE NULL
  END AS action
) mapped
WHERE u.company_id IS NOT NULL AND mapped.action IS NOT NULL
ON CONFLICT (user_id, company_id, area_key, action) DO NOTHING;

-- Ensure all permanent full-access roles inherit every current permission.
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT role_key, p.key
FROM (VALUES ('platform_owner'), ('platform_admin'), ('superadmin')) AS full_roles(role_key)
CROSS JOIN public.permissions p
WHERE EXISTS (SELECT 1 FROM public.roles r WHERE r.key = full_roles.role_key)
ON CONFLICT DO NOTHING;

COMMIT;