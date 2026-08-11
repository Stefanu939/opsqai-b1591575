-- OPSQAI Self-Hosted — 0019 sign-in throttling / lockout.
--
-- P1 audit item: local sign-in was protected against timing oracles but not
-- against online password guessing. Failed attempts are now recorded per
-- (identifier) where identifier is either `email:<lowercased email>` or
-- `ip:<remote address>`, and the auth provider applies an exponential backoff
-- plus a hard lockout window.
--
-- The table is intentionally tiny and self-pruning (successful sign-in clears
-- the row; `prune_login_attempts()` drops rows older than 24h).
--
-- Idempotent: migrate.mjs may re-run this on every service start.

CREATE TABLE IF NOT EXISTS public.login_attempts (
  identifier    TEXT PRIMARY KEY,
  failures      INTEGER NOT NULL DEFAULT 0,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS login_attempts_last_failed_idx
  ON public.login_attempts (last_failed_at DESC);

CREATE OR REPLACE FUNCTION public.prune_login_attempts()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.login_attempts
   WHERE last_failed_at < now() - INTERVAL '24 hours'
     AND (locked_until IS NULL OR locked_until < now());
$$;
