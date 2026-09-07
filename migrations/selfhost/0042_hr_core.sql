-- 0042_hr_core.sql
-- OPSQAI HR — Employee Lifecycle Engine, Phase 1 (Employee Core).
--
-- Employee master data with a stable internal Employee ID (EMP-000001) that
-- every other OPSQAI module can reference, reference data (departments,
-- positions, locations), one generic HR task engine, an automatic employee
-- timeline and an append-only audit log. Vanilla PostgreSQL only; access
-- control is enforced by the application layer (roles + area rights).

-- ── Settings (one row per company/installation) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_settings (
  company_id uuid PRIMARY KEY,
  country text NOT NULL DEFAULT 'generic',           -- 'de' | 'ro' | 'generic'
  employee_prefix text NOT NULL DEFAULT 'EMP',
  blind_screening boolean NOT NULL DEFAULT true,
  retention_months_after_exit integer NOT NULL DEFAULT 9,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Reference data ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_departments_unique UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS public.hr_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_positions_unique UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS public.hr_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_locations_unique UNIQUE (company_id, name)
);

-- ── Employee ID allocation (sequential, per company) ──────────────────────
CREATE TABLE IF NOT EXISTS public.hr_employee_counters (
  company_id uuid PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- ── Employee master ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_no text NOT NULL,                          -- EMP-000123
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  address text,
  email text,
  phone text,
  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  position_id uuid REFERENCES public.hr_positions(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.hr_locations(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'onboarding',
  contract_type text,
  employment_type text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_employees_no_unique UNIQUE (company_id, employee_no),
  CONSTRAINT hr_employees_status_check CHECK (status IN
    ('onboarding','active','leave','offboarding','terminated'))
);

CREATE INDEX IF NOT EXISTS hr_employees_company_idx ON public.hr_employees(company_id, status);
CREATE INDEX IF NOT EXISTS hr_employees_name_idx ON public.hr_employees(company_id, last_name, first_name);

-- ── Generic HR task engine (onboarding, offboarding, expiries, approvals) ──
CREATE TABLE IF NOT EXISTS public.hr_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  team text,                                           -- HR | IT | Manager | ...
  assigned_to text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_tasks_status_check CHECK (status IN ('pending','in_progress','done','cancelled'))
);

CREATE INDEX IF NOT EXISTS hr_tasks_company_idx ON public.hr_tasks(company_id, status, due_date);
CREATE INDEX IF NOT EXISTS hr_tasks_employee_idx ON public.hr_tasks(employee_id);

-- ── Employee timeline (fed automatically by every HR module) ──────────────
CREATE TABLE IF NOT EXISTS public.hr_employee_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  kind text NOT NULL,                                  -- employee | contract | onboarding | asset | training | incident | document
  message text NOT NULL,
  actor text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_employee_events_idx
  ON public.hr_employee_events(employee_id, occurred_at DESC);

-- ── Append-only audit log for HR writes ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_employee_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_employee_audit_idx
  ON public.hr_employee_audit_log(company_id, created_at DESC);
