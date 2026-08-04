-- OPSQAI Self-Hosted — configurable RBAC, direct messages and AI audit.
-- Idempotent upgrade for existing installations.

BEGIN;

-- Replace the original fixed enum with a role catalog. Existing assignments
-- are preserved as text before the enum is removed.
ALTER TABLE public.user_roles ALTER COLUMN role TYPE TEXT USING role::TEXT;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
DROP TYPE IF EXISTS public.app_role;

CREATE TABLE IF NOT EXISTS public.permissions (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  is_protected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_key_format CHECK (key ~ '^[a-z][a-z0-9_]{1,63}$')
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_key       TEXT NOT NULL REFERENCES public.roles(key) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_key, permission_key)
);

INSERT INTO public.permissions (key, label, category) VALUES
  ('platform.manage','Manage platform','Platform'),
  ('role.manage','Manage roles','Platform'),
  ('user.create','Create users','Users'),
  ('user.update','Update users','Users'),
  ('user.delete','Delete users','Users'),
  ('department.manage','Manage departments','Users'),
  ('chat.use','Use AI Chat','AI'),
  ('messages.use','Use employee messages','Messages'),
  ('knowledge.read','Read knowledge','Knowledge'),
  ('knowledge.manage','Manage knowledge','Knowledge'),
  ('sop.read','Read SOPs','Knowledge'),
  ('sop.create','Create SOPs','Knowledge'),
  ('sop.edit','Edit SOPs','Knowledge'),
  ('sop.delete','Delete SOPs','Knowledge'),
  ('sop.publish','Publish SOPs','Knowledge'),
  ('faq.read','Read FAQ','FAQ'),
  ('faq.create','Create FAQ','FAQ'),
  ('faq.edit','Edit FAQ','FAQ'),
  ('faq.delete','Delete FAQ','FAQ'),
  ('academy.learn','Use Academy','Academy'),
  ('academy.manage','Manage Academy','Academy'),
  ('academy.publish','Publish Academy','Academy'),
  ('ai_audit.view','View AI Audit','AI Audit'),
  ('ai_audit.run','Run AI Audit','AI Audit'),
  ('notifications.read','Read notifications','Notifications'),
  ('notifications.manage','Manage notifications','Notifications'),
  ('analytics.view','View analytics','Analytics'),
  ('dashboard.view','View dashboard','Analytics'),
  ('feedback.submit','Submit feedback','General')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category;

INSERT INTO public.roles (key, name, description, is_system, is_protected) VALUES
  ('admin','Administrator','Full control of this OPSQAI installation',TRUE,TRUE),
  ('manager','Manager','Manages people, content and operational reporting',TRUE,FALSE),
  ('team_leader','Team Leader','Leads a team and maintains operational knowledge',TRUE,FALSE),
  ('employee','Employee','Uses AI, knowledge, academy and messages',TRUE,FALSE),
  ('viewer','Viewer','Read-only access to operational content',TRUE,FALSE),
  ('operator','Operator','Legacy alias for Employee',TRUE,FALSE),
  ('member','Member','Legacy alias for Employee',TRUE,FALSE)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_key, permission_key)
SELECT 'admin', key FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('manager','user.update'),('manager','department.manage'),('manager','chat.use'),
  ('manager','messages.use'),('manager','knowledge.read'),('manager','knowledge.manage'),
  ('manager','sop.read'),('manager','sop.create'),('manager','sop.edit'),
  ('manager','sop.publish'),('manager','faq.read'),('manager','faq.create'),
  ('manager','faq.edit'),('manager','academy.learn'),('manager','academy.manage'),
  ('manager','ai_audit.view'),('manager','ai_audit.run'),('manager','analytics.view'),
  ('manager','dashboard.view'),('manager','feedback.submit'),
  ('team_leader','chat.use'),('team_leader','messages.use'),('team_leader','knowledge.read'),
  ('team_leader','sop.read'),('team_leader','sop.create'),('team_leader','sop.edit'),
  ('team_leader','faq.read'),('team_leader','faq.create'),('team_leader','academy.learn'),
  ('team_leader','ai_audit.view'),('team_leader','dashboard.view'),('team_leader','feedback.submit'),
  ('employee','chat.use'),('employee','messages.use'),('employee','knowledge.read'),
  ('employee','sop.read'),('employee','faq.read'),('employee','academy.learn'),
  ('employee','notifications.read'),('employee','feedback.submit'),
  ('viewer','knowledge.read'),('viewer','sop.read'),('viewer','faq.read'),
  ('viewer','academy.learn'),('viewer','ai_audit.view'),
  ('operator','chat.use'),('operator','messages.use'),('operator','knowledge.read'),
  ('operator','sop.read'),('operator','faq.read'),('operator','academy.learn'),
  ('member','chat.use'),('member','messages.use'),('member','knowledge.read'),
  ('member','sop.read'),('member','faq.read'),('member','academy.learn')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND conname = 'user_roles_role_fk'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_role_fk FOREIGN KEY (role) REFERENCES public.roles(key);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.direct_conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT direct_message_content CHECK (body IS NOT NULL OR jsonb_array_length(attachments) > 0)
);
CREATE INDEX IF NOT EXISTS direct_members_user_idx ON public.direct_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS direct_messages_conv_created_idx ON public.direct_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.ai_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  maturity TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  passed INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  critical INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  latency_ms INTEGER,
  input_hash TEXT,
  output_hash TEXT,
  token_usage JSONB,
  retrieval_chunk_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'completed',
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_audits_company_created_idx ON public.ai_audits(company_id, created_at DESC);

COMMIT;