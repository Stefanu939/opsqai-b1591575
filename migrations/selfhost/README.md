# Self-Hosted PostgreSQL Migrations

This directory holds the **Self-Hosted only** migration set. It is applied
by `opsqai-windows/services/bootstrap/migrate.mjs` against a vanilla
PostgreSQL 16+ instance during installation.

## Rules

1. **Vanilla PostgreSQL only.** No references to `auth.*`, `storage.*`,
   `realtime.*`, `supabase_functions.*`, or `vault.*` schemas.
2. **No Supabase roles.** No `authenticated`, `anon`, or `service_role`
   grants. The single owner role is `opsqai`, created by the installer
   before this set runs.
3. **No `auth.uid()` in RLS.** Row-Level Security on Self-Hosted is
   enforced by the application layer (JWT EdDSA claims), not by Postgres
   policies keyed on `auth.uid()`.
4. **Numeric ordering.** Files apply in ascending numeric order:
   `0001_bootstrap.sql`, `0002_...sql`, etc.
5. **Idempotent.** Every statement uses `IF NOT EXISTS` / `CREATE OR
   REPLACE` so re-running is safe. The migration runner still tracks
   applied files in `public.schema_migrations` (added in a follow-up
   slice) to skip already-applied ones.
6. **Never edit an applied migration.** Add a new one instead.

## Cloud is untouched

`supabase/migrations/` (Cloud) is completely separate. Never copy files
between the two sets — Cloud's Supabase-shaped SQL will not run on
vanilla Postgres, and vice versa.

## Bootstrap payload

`opsqai-windows/build/build.ps1` copies **only this directory** into the
installer payload (`payload/app/migrations/`). The Supabase migration
directory is explicitly excluded.
