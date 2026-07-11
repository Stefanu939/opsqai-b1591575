-- Phase 5: singleton platform_config for the resumable Setup Wizard.
-- Enforced singleton via a fixed primary-key trick and a UNIQUE guard.
CREATE TABLE IF NOT EXISTS public.platform_config (
  id boolean PRIMARY KEY DEFAULT true,
  install_id text NULL,
  installer_version text NULL,
  setup_progress jsonb NOT NULL DEFAULT '[]'::jsonb,
  setup_completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_config_singleton CHECK (id = true)
);

GRANT SELECT, INSERT, UPDATE ON public.platform_config TO authenticated;
GRANT ALL ON public.platform_config TO service_role;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Only platform admins may read / write.
DROP POLICY IF EXISTS platform_config_admin_select ON public.platform_config;
CREATE POLICY platform_config_admin_select ON public.platform_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

DROP POLICY IF EXISTS platform_config_admin_write ON public.platform_config;
CREATE POLICY platform_config_admin_write ON public.platform_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Auto-touch updated_at
DROP TRIGGER IF EXISTS platform_config_touch ON public.platform_config;
CREATE TRIGGER platform_config_touch
  BEFORE UPDATE ON public.platform_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the singleton row so the wizard always has somewhere to write.
INSERT INTO public.platform_config (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;