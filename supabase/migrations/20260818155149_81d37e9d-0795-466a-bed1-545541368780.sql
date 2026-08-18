-- Phase 4: Self-hosted heartbeat visibility.
-- New tables only (license_installs is owned by a role we cannot ALTER here).

CREATE TABLE IF NOT EXISTS public.selfhost_installations (
  install_id text PRIMARY KEY REFERENCES public.license_installs(install_id) ON DELETE CASCADE,
  organization_name text,
  country text,
  primary_language text,
  enabled_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  reported_status text,
  license_status text,
  last_maintenance_at timestamptz,
  next_maintenance_at timestamptz,
  last_heartbeat_at timestamptz,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.selfhost_installations TO authenticated;
GRANT ALL ON public.selfhost_installations TO service_role;
ALTER TABLE public.selfhost_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins view selfhost installations" ON public.selfhost_installations FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.selfhost_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL REFERENCES public.license_installs(install_id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  reported_status text,
  license_status text,
  app_version text,
  organization_name text,
  country text,
  primary_language text,
  enabled_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_maintenance_at timestamptz,
  next_maintenance_at timestamptz,
  client_timestamp timestamptz
);
CREATE INDEX IF NOT EXISTS idx_selfhost_heartbeats_install_received
  ON public.selfhost_heartbeats (install_id, received_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.selfhost_heartbeats TO authenticated;
GRANT ALL ON public.selfhost_heartbeats TO service_role;
ALTER TABLE public.selfhost_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins view heartbeat history" ON public.selfhost_heartbeats FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());