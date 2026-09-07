-- OPSQAI HR — phases 2..8 (Self-Hosted installation database).
--
--  * contract / document templates and generated employee documents;
--  * onboarding & offboarding checklist templates that expand into hr_tasks;
--  * equipment (assets) with assignment history and predefined packages;
--  * incidents, warnings and their documentation;
--  * candidate screening: job profiles, candidates, transparent AI scoring.
--
-- Authorization is enforced in the application layer (company scope + per-user
-- HR rights), exactly like every other Self-Hosted domain.

-- ── Documents & templates ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'contract',
  country text,
  contract_type text,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_document_templates_company_idx
  ON public.hr_document_templates(company_id, kind);

CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  filename text,
  mime text,
  data bytea,
  body text,
  valid_until date,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS hr_documents_company_idx
  ON public.hr_documents(company_id, employee_id);
CREATE INDEX IF NOT EXISTS hr_documents_expiry_idx
  ON public.hr_documents(company_id, valid_until);

-- ── Onboarding / offboarding checklists ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'onboarding',
  name text NOT NULL,
  position_id uuid REFERENCES public.hr_positions(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_checklist_templates_company_idx
  ON public.hr_checklist_templates(company_id, kind);

-- ── Equipment ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  serial text,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_assets_company_idx ON public.hr_assets(company_id, status);

CREATE TABLE IF NOT EXISTS public.hr_asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.hr_assets(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  assigned_on date NOT NULL DEFAULT current_date,
  returned_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_asset_assignments_company_idx
  ON public.hr_asset_assignments(company_id, employee_id);

-- ── Incidents & warnings ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'incident',
  severity text NOT NULL DEFAULT 'low',
  title text NOT NULL,
  description text,
  action_taken text,
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS hr_incidents_company_idx
  ON public.hr_incidents(company_id, occurred_on DESC);

-- ── Candidate screening ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_job_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  description text,
  -- [{ label, weight, required }] — the saved, reusable screening criteria.
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_job_profiles_company_idx
  ON public.hr_job_profiles(company_id, active);

CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  job_profile_id uuid REFERENCES public.hr_job_profiles(id) ON DELETE SET NULL,
  reference text,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  cv_filename text,
  cv_text text,
  -- AI output, always evidence-backed; UNKNOWN when the CV does not say.
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric(5,2),
  status text NOT NULL DEFAULT 'new',
  decision_note text,
  hired_employee_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_candidates_company_idx
  ON public.hr_candidates(company_id, job_profile_id, status);
