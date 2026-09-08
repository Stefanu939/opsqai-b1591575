-- 0045_hr_payroll_signing.sql
-- OPSQAI HR — employee file upgrade (Self-Hosted installation database).
--
--  * salary history + monthly additions / deductions + payslips
--    (no automatic tax or contribution calculation — every deduction is
--     entered manually by HR and the PDF says so);
--  * a dedicated payroll right: without it no salary value, payslip or
--    payroll export is visible anywhere in the application;
--  * document signing: request signature, on-screen drawn signature,
--    uploaded signed copy, reminders / expiry, version history.

BEGIN;

-- ── Rights ───────────────────────────────────────────────────────────────
INSERT INTO public.permissions (key, label, category, description) VALUES
  ('hr.view','View HR','HR','Open HR workspaces and read employee records'),
  ('hr.create','Create HR records','HR','Create employees, documents and HR records'),
  ('hr.edit','Edit HR records','HR','Change employee records and HR documents'),
  ('hr.delete','Delete HR records','HR','Delete HR records'),
  ('hr.approve','Approve HR documents','HR','Approve documents, requests and decisions'),
  ('hr.administer','Administer HR','HR','Manage HR settings and exports'),
  ('hr_payroll.view','View payroll','HR','See salary values, payslips and payroll history'),
  ('hr_payroll.edit','Edit payroll','HR','Record salaries, additions, deductions and payslips'),
  ('hr_payroll.administer','Administer payroll','HR','Export payroll data for accounting')
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, category = EXCLUDED.category, description = EXCLUDED.description;

INSERT INTO public.area_permission_map (area_key, action, permission_key) VALUES
  ('hr','view','hr.view'),
  ('hr','create','hr.create'),
  ('hr','edit','hr.edit'),
  ('hr','delete','hr.delete'),
  ('hr','approve','hr.approve'),
  ('hr','administer','hr.administer'),
  ('hr_payroll','view','hr_payroll.view'),
  ('hr_payroll','edit','hr_payroll.edit'),
  ('hr_payroll','administer','hr_payroll.administer')
ON CONFLICT (area_key, action) DO NOTHING;

INSERT INTO public.role_permissions (role_key, permission_key)
SELECT r.role_key, p.permission_key
  FROM (VALUES ('superadmin'),('platform_owner'),('workspace_owner'),('admin')) AS r(role_key)
  CROSS JOIN (VALUES
    ('hr.view'),('hr.create'),('hr.edit'),('hr.delete'),('hr.approve'),('hr.administer'),
    ('hr_payroll.view'),('hr_payroll.edit'),('hr_payroll.administer')
  ) AS p(permission_key)
 WHERE EXISTS (SELECT 1 FROM public.roles ro WHERE ro.key = r.role_key)
ON CONFLICT DO NOTHING;

-- ── Salary history ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  valid_from DATE NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  period TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('month','hour','year')),
  hours_per_week NUMERIC(5,2),
  reason TEXT,
  note TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_salaries_employee_idx
  ON public.hr_salaries (company_id, employee_id, valid_from DESC);

-- ── Monthly additions / deductions (manual only) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('addition','deduction')),
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_payroll_entries_period_idx
  ON public.hr_payroll_entries (company_id, period_month, employee_id);

-- ── Payslips (generated PDF kept in the employee file) ───────────────────
CREATE TABLE IF NOT EXISTS public.hr_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  additions NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  filename TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'application/pdf',
  data BYTEA,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, employee_id, period_month)
);

-- ── Document signing ─────────────────────────────────────────────────────
ALTER TABLE public.hr_documents
  ADD COLUMN IF NOT EXISTS signature_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS signature_due DATE,
  ADD COLUMN IF NOT EXISTS signature_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS signature_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_kind TEXT;

CREATE TABLE IF NOT EXISTS public.hr_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.hr_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'signed',
  filename TEXT,
  mime TEXT,
  data BYTEA,
  body TEXT,
  signed_by_name TEXT,
  signature_kind TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_document_versions_doc_idx
  ON public.hr_document_versions (company_id, document_id, version DESC);

COMMIT;
