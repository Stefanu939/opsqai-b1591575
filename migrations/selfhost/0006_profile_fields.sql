-- OPSQAI Self-Hosted — 0006 profile fields on public.users.
--
-- Wave C.2a.1 (Option A): extend public.users with the profile columns
-- Cloud stores in public.profiles, so IProfileRepository has an
-- identical shape on both platforms. Self-Hosted is single-tenant, so
-- company_id is a synthetic constant filled by the app layer — no
-- companies table is created here.
--
-- All added columns are nullable / defaulted so existing rows remain
-- valid. Idempotent (uses ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS company_id       UUID,
  ADD COLUMN IF NOT EXISTS first_name       TEXT,
  ADD COLUMN IF NOT EXISTS last_name        TEXT,
  ADD COLUMN IF NOT EXISTS full_name        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS position         TEXT,
  ADD COLUMN IF NOT EXISTS department       TEXT,
  ADD COLUMN IF NOT EXISTS department_id    UUID,
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS language_pref    TEXT    NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep updated_at fresh on every UPDATE. Uses a table-local trigger to
-- avoid depending on public.update_updated_at_column() being present.
CREATE OR REPLACE FUNCTION public.users_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_touch_updated_at ON public.users;
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_touch_updated_at();

CREATE INDEX IF NOT EXISTS users_company_idx    ON public.users(company_id);
CREATE INDEX IF NOT EXISTS users_department_idx ON public.users(department_id);
