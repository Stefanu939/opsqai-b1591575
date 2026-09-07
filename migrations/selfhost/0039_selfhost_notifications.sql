-- 0039_selfhost_notifications.sql
-- Self-Hosted only. A local notification inbox so the bell in the app shell
-- shows real events (audit issues, incidents, requests, expiring documents).
-- Company-wide rows have user_id NULL; per-user read state lives in its own
-- table so one event can be read independently by every colleague.
-- Vanilla PostgreSQL; access control stays in the application layer.

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid,
  kind text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_notifications_company_idx
  ON public.app_notifications(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.app_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
