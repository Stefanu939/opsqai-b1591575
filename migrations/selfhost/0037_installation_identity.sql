-- 0037_installation_identity.sql
-- Self-Hosted only. Binds this installation's data to exactly ONE customer.
--
-- Problem this closes: reinstalling on the same Windows machine preserves
-- %ProgramData%\OPSQAI (database, uploads, accounts). A licence issued to a
-- DIFFERENT company could be activated on top of that data, so the new
-- company inherited the previous tenant's users and records.
--
-- The single row below records the owning company the first time an
-- installation licence is activated. Activation for any other company is
-- refused, and the platform enters a restricted mode when the active licence
-- does not match this row.
--
-- Vanilla PostgreSQL; access control stays in the application layer.

CREATE TABLE IF NOT EXISTS public.installation_identity (
  id                   BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  install_id           TEXT,
  company_key          TEXT NOT NULL,
  company_name         TEXT,
  bound_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing installations must not be locked out: adopt the licence that is
-- already active on the next activation / startup check (company_key stays
-- empty until then).
CREATE TABLE IF NOT EXISTS public.installation_owner_events (
  id           BIGSERIAL PRIMARY KEY,
  event        TEXT NOT NULL,
  detail       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
