-- OPSQAI Self-Hosted — 0003 backup snapshots.
--
-- Tracks the archives produced by `WindowsBackupService.snapshot()`.
-- Kept idempotent so the installer's migrate.mjs runner is safe to
-- re-invoke on every service restart.

CREATE TABLE IF NOT EXISTS public.platform_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  path         TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  detail       JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS platform_snapshots_created_idx
  ON public.platform_snapshots(created_at DESC);
