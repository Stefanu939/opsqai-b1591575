-- OPSQAI Self-Hosted — Bootstrap schema.
--
-- Runs against a vanilla PostgreSQL 16+ instance. No dependency on any
-- Supabase-managed schema (auth, storage, realtime, vault). The single
-- owner role is `opsqai`; there is no `authenticated`, `anon`, or
-- `service_role` on Self-Hosted.
--
-- Every table in this migration set that holds user-facing data lives in
-- `public`, uses `gen_random_uuid()` for primary keys, and is owned by
-- `opsqai`. Row-Level Security is enforced at the application layer
-- through the local auth session (JWT EdDSA claims) — Postgres RLS is
-- not used because there is no per-request Postgres role.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- --------------------------------------------------------------------
-- Platform metadata (single-row table)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_metadata (
  singleton         BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  installation_id   UUID        NOT NULL,
  platform_version  TEXT        NOT NULL,
  schema_version    TEXT        NOT NULL,
  installer_version TEXT        NOT NULL,
  build_number      TEXT        NOT NULL,
  installed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  machine_fingerprint_sha256 TEXT NOT NULL
);

-- --------------------------------------------------------------------
-- Feature flags (developer-facing, seeded per Edition at install)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  edition_min TEXT    NOT NULL DEFAULT 'community',
  notes       TEXT
);

-- --------------------------------------------------------------------
-- Roles catalog + app_role enum
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'member');
  END IF;
END$$;

-- --------------------------------------------------------------------
-- Users (local auth). No dependency on auth.users.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT      UNIQUE, -- CITEXT provided by 'citext' extension below
  display_name   TEXT,
  password_hash  TEXT        NOT NULL,           -- argon2id
  disabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at  TIMESTAMPTZ
);



-- --------------------------------------------------------------------
-- Sessions + refresh tokens
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON public.sessions(user_id);

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  token_hash    TEXT        NOT NULL UNIQUE, -- SHA-256 of the opaque token
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.password_resets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

-- --------------------------------------------------------------------
-- Role assignments
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Same signature as Cloud, different implementation (no auth.uid()).
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- --------------------------------------------------------------------
-- Append-only audit log
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         BIGSERIAL   PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id   UUID        REFERENCES public.users(id),
  action     TEXT        NOT NULL,
  target     TEXT,
  detail     JSONB       NOT NULL DEFAULT '{}'::JSONB
);

CREATE OR REPLACE RULE audit_log_no_update AS ON UPDATE TO public.audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_log_no_delete AS ON DELETE TO public.audit_log DO INSTEAD NOTHING;

-- --------------------------------------------------------------------
-- Local license mirror (validated copy of the signed license token)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.licenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer        TEXT NOT NULL,
  seats           INT  NOT NULL,
  edition         TEXT NOT NULL,
  channel         TEXT NOT NULL,
  support_level   TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  raw_token       TEXT NOT NULL,
  validated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- Grants — no anon / authenticated / service_role on Self-Hosted.
-- All access is via the application connecting as the `opsqai` role.
-- --------------------------------------------------------------------
-- (Grants intentionally omitted here; the installer creates and grants
-- ownership of the entire `public` schema to `opsqai` before running
-- this migration set.)
