-- 0032 — Unified named-user functional rights for Self-Hosted.
-- Owner and SuperAdmin remain unrestricted in application authorization.
-- Admin and other roles may receive explicit per-area overrides.

BEGIN;

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
ON CONFLICT DO NOTHING;

-- Ensure all permanent full-access roles inherit every current permission.
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT role_key, p.key
FROM (VALUES ('platform_owner'), ('platform_admin'), ('superadmin')) AS full_roles(role_key)
CROSS JOIN public.permissions p
WHERE EXISTS (SELECT 1 FROM public.roles r WHERE r.key = full_roles.role_key)
ON CONFLICT DO NOTHING;

COMMIT;