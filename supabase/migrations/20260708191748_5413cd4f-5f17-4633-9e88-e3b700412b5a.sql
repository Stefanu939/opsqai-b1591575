
-- shared trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============= licenses =============
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_email text,
  tier text NOT NULL DEFAULT 'basic',
  modules jsonb NOT NULL DEFAULT '["chat","kb","faq"]'::jsonb,
  max_users integer NOT NULL DEFAULT 50,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  hard_expiry boolean NOT NULL DEFAULT false,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  revoked_reason text,
  signed_token text,
  notes text,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage licenses" ON public.licenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- ============= license_installs =============
CREATE TABLE public.license_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL UNIQUE REFERENCES public.licenses(install_id) ON DELETE CASCADE,
  last_heartbeat_at timestamptz,
  app_version text,
  user_count integer,
  host_info jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_installs TO authenticated;
GRANT ALL ON public.license_installs TO service_role;
ALTER TABLE public.license_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins view installs" ON public.license_installs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- ============= license_orders =============
CREATE TABLE public.license_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL REFERENCES public.licenses(install_id) ON DELETE CASCADE,
  module_key text NOT NULL,
  unit_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  stripe_payment_intent text,
  invoice_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_orders TO authenticated;
GRANT ALL ON public.license_orders TO service_role;
ALTER TABLE public.license_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage orders" ON public.license_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- ============= license_releases =============
CREATE TABLE public.license_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'stable',
  docker_image text NOT NULL,
  checksum text,
  release_notes_url text,
  min_supported text,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_releases TO authenticated;
GRANT ALL ON public.license_releases TO service_role;
ALTER TABLE public.license_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage releases" ON public.license_releases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- triggers
CREATE TRIGGER trg_licenses_updated_at BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_license_installs_updated_at BEFORE UPDATE ON public.license_installs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_license_orders_updated_at BEFORE UPDATE ON public.license_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_license_releases_updated_at BEFORE UPDATE ON public.license_releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_licenses_install_id ON public.licenses(install_id);
CREATE INDEX idx_license_orders_install_id ON public.license_orders(install_id);
CREATE INDEX idx_license_releases_channel ON public.license_releases(channel, is_current);
