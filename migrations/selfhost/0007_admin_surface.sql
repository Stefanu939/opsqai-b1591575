-- OPSQAI Self-Hosted — 0007 admin user + department surface.
--
-- Wave C.2a.1.c: adds the columns and tables required by the admin
-- operations moving off `supabaseAdmin.*` and onto platform providers.
--
-- Additions:
--  1. public.users.must_change_password — set when an administrator
--     creates a user with a temporary password. The sign-in flow reads
--     it and forces a password change before issuing a session that can
--     reach protected routes.
--  2. public.users.last_sign_in_at — populated by the local auth
--     provider on every successful sign-in. Consumed by the admin
--     "list users" surface for parity with Cloud's Supabase Auth
--     last_sign_in_at.
--  3. public.departments — single-tenant department directory. There
--     is no separate companies table on Self-Hosted; the synthetic
--     tenant id (OPSQAI_INSTALL_ID) fills company_id everywhere.
--
-- Idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_sign_in_at      TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.departments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS departments_company_idx
  ON public.departments(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS departments_company_name_ci_idx
  ON public.departments(company_id, LOWER(name));

-- Trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.departments_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departments_touch_updated_at ON public.departments;
CREATE TRIGGER departments_touch_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.departments_touch_updated_at();
