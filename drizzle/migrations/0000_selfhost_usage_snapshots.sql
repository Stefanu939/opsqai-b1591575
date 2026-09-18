-- Aggregate-only usage history per self-hosted installation.
-- Numbers only: no customer content, names, e-mails or free text.
CREATE TABLE public.selfhost_usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  client_timestamp timestamptz,
  app_version text,
  window_days integer NOT NULL DEFAULT 30,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX selfhost_usage_snapshots_install_idx
  ON public.selfhost_usage_snapshots (install_id, received_at DESC);

GRANT SELECT ON public.selfhost_usage_snapshots TO authenticated;
GRANT ALL ON public.selfhost_usage_snapshots TO service_role;

ALTER TABLE public.selfhost_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff read usage snapshots"
  ON public.selfhost_usage_snapshots
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());
