-- 0033_transport_audit_loop.sql
-- Self-Hosted only. Completes the Transport weekly-audit loop:
--  * cadence, owner and calendar reminder for the periodic audit;
--  * a due date on each audit run so skipped periods can be detected;
--  * links from a failed checklist line to the incident/request it created.
-- Vanilla PostgreSQL; access control stays in the application layer.

ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS audit_cadence text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS audit_owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS audit_reminder boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_settings_audit_cadence_check'
  ) THEN
    ALTER TABLE public.transport_settings
      ADD CONSTRAINT transport_settings_audit_cadence_check
      CHECK (audit_cadence IN ('manual','weekly','biweekly','monthly'));
  END IF;
END $$;

ALTER TABLE public.transport_checks
  ADD COLUMN IF NOT EXISTS due_on date,
  ADD COLUMN IF NOT EXISTS calendar_event_id uuid;

ALTER TABLE public.transport_check_results
  ADD COLUMN IF NOT EXISTS incident_id uuid,
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX IF NOT EXISTS transport_check_results_incident_idx
  ON public.transport_check_results(incident_id);
CREATE INDEX IF NOT EXISTS transport_check_results_request_idx
  ON public.transport_check_results(request_id);
