-- 0028_presence_time_off.sql
-- Presence status on the local user table + local time-off (holiday) requests.
-- Mirrors the Cloud behaviour so the account menu works identically offline.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS presence_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS presence_message text,
  ADD COLUMN IF NOT EXISTS presence_until timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_presence_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_presence_status_check
      CHECK (presence_status IN ('available','busy','away','dnd'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_off_requests_user_idx
  ON public.time_off_requests (user_id, starts_on DESC);
CREATE INDEX IF NOT EXISTS time_off_requests_status_idx
  ON public.time_off_requests (status, starts_on DESC);
