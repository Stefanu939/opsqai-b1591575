-- 0031_time_off_calendar_link.sql
-- Adds the calendar link + decision note fields the time-off code expects.
-- Without calendar_event_id, creating a request fails with
-- 'column "calendar_event_id" does not exist'.

ALTER TABLE public.time_off_requests
  ADD COLUMN IF NOT EXISTS calendar_event_id uuid,
  ADD COLUMN IF NOT EXISTS decision_note text;

CREATE INDEX IF NOT EXISTS time_off_requests_company_status_idx
  ON public.time_off_requests (company_id, status, starts_on DESC);
