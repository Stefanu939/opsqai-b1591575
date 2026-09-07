-- 0040_transport_risk_ops.sql
-- Self-Hosted only. Enterprise risk operations for OPSQAI Transport:
--   * a morning briefing (email / Teams webhook) for the critical lane
--   * an owner + due date + history for every risk shown on the overview
-- Vanilla PostgreSQL; access control stays in the application layer.

ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_hour integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS digest_emails text,
  ADD COLUMN IF NOT EXISTS digest_webhook_url text;

CREATE TABLE IF NOT EXISTS public.transport_risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  risk_key text NOT NULL,
  subject text,
  owner_user_id uuid,
  owner_name text,
  due_on date,
  status text NOT NULL DEFAULT 'open',
  note text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS transport_risk_actions_company_idx
  ON public.transport_risk_actions(company_id, status, due_on);

CREATE TABLE IF NOT EXISTS public.transport_risk_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.transport_risk_actions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  event text NOT NULL,
  detail text,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_risk_action_events_company_idx
  ON public.transport_risk_action_events(company_id, created_at DESC);
