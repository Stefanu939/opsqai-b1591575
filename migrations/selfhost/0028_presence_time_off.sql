-- 0028_presence_time_off.sql
-- Presence status on profiles + local time-off (holiday) requests.
-- Mirrors the Cloud schema so the account menu behaves identically offline.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS presence_message text,
  ADD COLUMN IF NOT EXISTS presence_until timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_presence_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_presence_status_check
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
  calendar_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_off_requests_status_check
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  CONSTRAINT time_off_requests_range_check CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS time_off_requests_user_idx
  ON public.time_off_requests(user_id, starts_on DESC);
CREATE INDEX IF NOT EXISTS time_off_requests_company_idx
  ON public.time_off_requests(company_id, status);
