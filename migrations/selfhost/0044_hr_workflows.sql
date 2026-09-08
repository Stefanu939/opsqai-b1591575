-- 0044_hr_workflows.sql
-- OPSQAI HR — working HR (Self-Hosted installation database).
--
--  * documents become real drafts: status, named drafts, template origin,
--    country/language, signed-scan attachment, versions per employee file;
--  * tasks become workable: description, priority, sub-steps, linked
--    document, resolution and completion metadata;
--  * position changes (promote / demote / transfer) with recorded criteria;
--  * equipment packages (safety, hardware, ...) that expand into assets;
--  * policies & procedures with employee acknowledgements;
--  * employee requests (leave, certificates, equipment, data changes);
--  * HR knowledge articles;
--  * trainings and per-employee training records;
--  * compliance items per country with due dates;
--  * candidate Q&A history and editable extracted data;
--  * richer HR settings.
--
-- Authorization stays in the application layer (company scope + HR rights).

-- ── Documents: drafts, approval, attachments ─────────────────────────────
ALTER TABLE public.hr_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS draft_name text,
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS signed_filename text,
  ADD COLUMN IF NOT EXISTS signed_mime text,
  ADD COLUMN IF NOT EXISTS signed_data bytea,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- Existing approved rows keep their approval.
UPDATE public.hr_documents SET status = 'approved' WHERE approved_at IS NOT NULL AND status = 'draft';
UPDATE public.hr_documents SET status = 'file' WHERE data IS NOT NULL AND body IS NULL AND status = 'draft';
CREATE INDEX IF NOT EXISTS hr_documents_status_idx ON public.hr_documents(company_id, status);

ALTER TABLE public.hr_document_templates
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS language text;

-- ── Tasks: workable items ────────────────────────────────────────────────
ALTER TABLE public.hr_tasks
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS document_key text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by text,
  ADD COLUMN IF NOT EXISTS source text;

-- ── Position changes (promote / demote / transfer) ───────────────────────
CREATE TABLE IF NOT EXISTS public.hr_position_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  kind text NOT NULL,                       -- promote | demote | transfer
  from_position_id uuid,
  to_position_id uuid,
  from_position text,
  to_position text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{label, met, note}]
  reason text,
  effective_on date NOT NULL DEFAULT current_date,
  decided_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_position_changes_idx
  ON public.hr_position_changes(company_id, employee_id, effective_on DESC);

-- ── Equipment packages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_asset_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{name, category}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_asset_packages_idx ON public.hr_asset_packages(company_id);

-- ── Policies & procedures ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'policy',        -- policy | procedure | safety | code_of_conduct
  body text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',           -- draft | published | archived
  requires_ack boolean NOT NULL DEFAULT false,
  effective_from date,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_policies_idx ON public.hr_policies(company_id, status);

CREATE TABLE IF NOT EXISTS public.hr_policy_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  policy_id uuid NOT NULL REFERENCES public.hr_policies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text,
  CONSTRAINT hr_policy_acks_unique UNIQUE (policy_id, employee_id, version)
);

-- ── Employee requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',             -- leave | certificate | equipment | data_change | training | other
  title text NOT NULL,
  details text,
  from_date date,
  to_date date,
  status text NOT NULL DEFAULT 'open',            -- open | in_review | approved | rejected | done
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_requests_idx ON public.hr_requests(company_id, status, created_at DESC);

-- ── HR knowledge ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_knowledge_idx ON public.hr_knowledge(company_id, category);

-- ── Training ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',       -- safety | compliance | skills | onboarding | general
  mandatory boolean NOT NULL DEFAULT false,
  valid_months integer,                           -- NULL = never expires
  country text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_trainings_idx ON public.hr_trainings(company_id);

CREATE TABLE IF NOT EXISTS public.hr_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  training_id uuid NOT NULL REFERENCES public.hr_trainings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned',         -- planned | completed | expired
  planned_on date,
  completed_on date,
  valid_until date,
  score text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_training_records_idx
  ON public.hr_training_records(company_id, employee_id, training_id);

-- ── Compliance ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  item_key text,                                  -- built-in key when seeded from the country library
  title text NOT NULL,
  category text NOT NULL DEFAULT 'legal',         -- legal | safety | data_protection | payroll | medical
  country text,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  due_date date,
  status text NOT NULL DEFAULT 'open',            -- open | done | not_applicable
  notes text,
  done_at timestamptz,
  done_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_compliance_idx ON public.hr_compliance_items(company_id, status, due_date);

-- ── Candidates: Q&A + editable data ──────────────────────────────────────
ALTER TABLE public.hr_candidates
  ADD COLUMN IF NOT EXISTS cv_language text,
  ADD COLUMN IF NOT EXISTS qa jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{question, answer, quote, asked_at}]
  ADD COLUMN IF NOT EXISTS strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interview_notes text;

-- ── Settings ─────────────────────────────────────────────────────────────
ALTER TABLE public.hr_settings
  ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS probation_months integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS notice_weeks integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS vacation_days integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS weekly_hours numeric(5,2) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS contract_alert_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS document_alert_days integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS auto_onboarding boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS company_legal_name text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_signatory text;
