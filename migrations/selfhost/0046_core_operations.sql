-- 0046_core_operations.sql
-- OPSQAI Core — Operational Intelligence Engine (Self-Hosted only).
--
-- Incidents / damages, their relationship to procedures and FAQs, grounded
-- root-cause analyses (5 Why + Lean) and corrective / preventive actions.
-- Vanilla PostgreSQL; access control is enforced by the application layer
-- (user_area_rights: core_ops / core_costs) exactly like Transport and HR.

-- ── Incidents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.core_incidents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid,
  ref            text,
  kind           text NOT NULL DEFAULT 'damage',
  title          text NOT NULL,
  description    text,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  department_id  uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location       text,
  cost_amount    numeric(14,2) NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'EUR',
  lost_minutes   integer NOT NULL DEFAULT 0,
  frequency_per_month numeric(8,2) NOT NULL DEFAULT 1,
  status         text NOT NULL DEFAULT 'open',
  involved_person text,
  involved_role  text,
  immediate_cause text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_incidents_kind_check CHECK (kind IN
    ('damage','accident','process_error','system_error','quality','other')),
  CONSTRAINT core_incidents_status_check CHECK (status IN
    ('open','analysed','action','closed'))
);

CREATE INDEX IF NOT EXISTS core_incidents_company_idx ON public.core_incidents(company_id);
CREATE INDEX IF NOT EXISTS core_incidents_occurred_idx ON public.core_incidents(occurred_at DESC);
CREATE INDEX IF NOT EXISTS core_incidents_dept_idx ON public.core_incidents(department_id);
CREATE INDEX IF NOT EXISTS core_incidents_status_idx ON public.core_incidents(status);

-- ── Relations: violated SOP, related SOPs, FAQs, sibling incidents ────────
CREATE TABLE IF NOT EXISTS public.core_incident_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid NOT NULL REFERENCES public.core_incidents(id) ON DELETE CASCADE,
  link_type    text NOT NULL,
  target_id    uuid,
  target_title text,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_incident_links_type_check CHECK (link_type IN
    ('violated_sop','related_sop','faq','incident')),
  CONSTRAINT core_incident_links_unique UNIQUE (incident_id, link_type, target_id)
);

CREATE INDEX IF NOT EXISTS core_incident_links_incident_idx
  ON public.core_incident_links(incident_id);
CREATE INDEX IF NOT EXISTS core_incident_links_target_idx
  ON public.core_incident_links(target_id);

-- ── Evidence attachments (images / PDF, stored in the database) ───────────
CREATE TABLE IF NOT EXISTS public.core_incident_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.core_incidents(id) ON DELETE CASCADE,
  filename    text NOT NULL,
  mime_type   text NOT NULL,
  bytes       integer NOT NULL DEFAULT 0,
  data        bytea NOT NULL,
  uploaded_by uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS core_incident_attachments_incident_idx
  ON public.core_incident_attachments(incident_id);

-- ── Root cause analysis (one per incident, editable) ──────────────────────
CREATE TABLE IF NOT EXISTS public.core_root_causes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       uuid NOT NULL UNIQUE REFERENCES public.core_incidents(id) ON DELETE CASCADE,
  problem           text,
  immediate_cause   text,
  root_cause        text,
  sop_violation     text,
  process_failure   text,
  related_processes text,
  financial_impact  numeric(14,2) NOT NULL DEFAULT 0,
  frequency         numeric(8,2) NOT NULL DEFAULT 0,
  why_steps         jsonb NOT NULL DEFAULT '[]'::jsonb,
  lean_class        text,
  corrective        text,
  preventive        text,
  sources           jsonb NOT NULL DEFAULT '[]'::jsonb,
  unsupported       jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at      timestamptz,
  generated_by      uuid,
  edited_at         timestamptz,
  edited_by         uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Corrective / preventive actions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.core_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.core_incidents(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'corrective',
  title       text NOT NULL,
  detail      text,
  owner_name  text,
  due_date    date,
  status      text NOT NULL DEFAULT 'open',
  sources     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_actions_kind_check CHECK (kind IN ('corrective','preventive')),
  CONSTRAINT core_actions_status_check CHECK (status IN ('open','in_progress','done','cancelled'))
);

CREATE INDEX IF NOT EXISTS core_actions_incident_idx ON public.core_actions(incident_id);
CREATE INDEX IF NOT EXISTS core_actions_status_idx ON public.core_actions(status);
CREATE INDEX IF NOT EXISTS core_actions_due_idx ON public.core_actions(due_date);

-- ── Rights: Operations area + financial visibility ────────────────────────
-- area_permission_map.permission_key references public.permissions(key), so the
-- permission rows must exist before the mapping is inserted.
INSERT INTO public.permissions (key, label, category, description) VALUES
  ('core_ops.view',       'Operations: view',       'operations', 'View incidents, damages and root-cause records'),
  ('core_ops.create',     'Operations: create',     'operations', 'Create incidents and damages'),
  ('core_ops.edit',       'Operations: edit',       'operations', 'Edit incidents, root causes and actions'),
  ('core_ops.delete',     'Operations: delete',     'operations', 'Delete incidents and evidence'),
  ('core_ops.administer', 'Operations: administer', 'operations', 'Administer Operations settings and all departments'),
  ('core_costs.view',     'Operations: costs',      'operations', 'View incident costs and financial analytics')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.area_permission_map (area_key, action, permission_key) VALUES
  ('core_ops', 'view',       'core_ops.view'),
  ('core_ops', 'create',     'core_ops.create'),
  ('core_ops', 'edit',       'core_ops.edit'),
  ('core_ops', 'delete',     'core_ops.delete'),
  ('core_ops', 'administer', 'core_ops.administer'),
  ('core_costs', 'view',     'core_costs.view')
ON CONFLICT (area_key, action) DO NOTHING;

-- Full-access roles inherit the new Operations permissions.
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT full_roles.role_key, p.key
FROM (VALUES ('platform_owner'), ('platform_admin'), ('superadmin')) AS full_roles(role_key)
CROSS JOIN (VALUES ('core_ops.view'),('core_ops.create'),('core_ops.edit'),
                   ('core_ops.delete'),('core_ops.administer'),('core_costs.view')) AS p(key)
WHERE EXISTS (SELECT 1 FROM public.roles r WHERE r.key = full_roles.role_key)
ON CONFLICT DO NOTHING;
