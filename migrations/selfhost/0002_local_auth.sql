-- OPSQAI Self-Hosted — 0002 local auth hardening.
--
-- Adds indexes and constraints needed by the local auth provider that
-- were not part of the initial bootstrap. Idempotent.

-- Refresh token lookup by token_hash is the hot path.
CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx
  ON public.refresh_tokens(token_hash);

CREATE INDEX IF NOT EXISTS refresh_tokens_session_idx
  ON public.refresh_tokens(session_id);

CREATE INDEX IF NOT EXISTS password_resets_token_hash_idx
  ON public.password_resets(token_hash);

CREATE INDEX IF NOT EXISTS password_resets_user_idx
  ON public.password_resets(user_id);

-- Prevent a user from having a NULL email when local auth is active.
-- Cloud allows NULL email (SSO-only users); Self-Hosted does not.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_not_null_selfhost'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_email_not_null_selfhost CHECK (email IS NOT NULL);
  END IF;
END$$;

-- Users must have at least one role after createFirstAdmin. Enforced at
-- the application layer, but a partial index makes accidental deletes
-- easier to spot in queries.
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles(user_id);
