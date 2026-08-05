-- Export jobs (KB / FAQ / workspace ZIP exports) for Self-Hosted.
--
-- Mirrors the Cloud `exports` table shape used by IExportRepository. No RLS:
-- tenancy is enforced at the application layer via the requireAuth middleware
-- and the company-scoped repository.

BEGIN;

CREATE TABLE IF NOT EXISTS public.exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID,
  created_by      UUID REFERENCES public.users(id),
  kind            TEXT NOT NULL,
  mode            TEXT NOT NULL,
  format          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'processing',
  progress        INTEGER NOT NULL DEFAULT 0,
  storage_path    TEXT,
  sha256          TEXT,
  bytes           BIGINT,
  file_count      INTEGER,
  manifest        JSONB NOT NULL DEFAULT '{}'::JSONB,
  deletion_status TEXT,
  deletion_typed  TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS exports_company_idx ON public.exports (company_id);
CREATE INDEX IF NOT EXISTS exports_created_at_idx ON public.exports (created_at DESC);
CREATE INDEX IF NOT EXISTS exports_status_idx ON public.exports (status);

COMMIT;
