-- OPSQAI Self-Hosted — 0016 academy repository gap columns.
--
-- Adds the columns required by the Self-Hosted IAcademyRepository
-- implementations for the department directory (list/upsert used by the
-- Academy department admin surface, mirroring Cloud's academy_departments
-- table which carries a `description` column).
--
-- Idempotent. Vanilla Postgres; no RLS/auth.*/Supabase helpers.

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS description TEXT;
