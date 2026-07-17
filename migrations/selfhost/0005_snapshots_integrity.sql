-- Phase 6: extend platform_snapshots with integrity + tagging metadata.
--
-- • sha256      hex digest of the archive at snapshot time
-- • verified_at last time the archive was re-hashed and matched sha256
-- • tag         free-form label ("pre-update-1.2.3", "scheduled-daily", ...)
-- • kind        'manual' | 'scheduled' | 'pre-update' — used for retention UX
--
-- Safe to run repeatedly (used both fresh installs and upgrades).

CREATE TABLE IF NOT EXISTS public.platform_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  path         TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  detail       JSONB NOT NULL DEFAULT '{}'::JSONB
);

ALTER TABLE public.platform_snapshots
  ADD COLUMN IF NOT EXISTS sha256      TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tag         TEXT,
  ADD COLUMN IF NOT EXISTS kind        TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS platform_snapshots_created_at_idx
  ON public.platform_snapshots (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_snapshots_kind_idx
  ON public.platform_snapshots (kind, created_at DESC);
