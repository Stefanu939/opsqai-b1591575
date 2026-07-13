
-- Extend license_installs with package generation metadata
ALTER TABLE public.license_installs
  ADD COLUMN IF NOT EXISTS package_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS package_generation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS package_storage_path text,
  ADD COLUMN IF NOT EXISTS package_checksum_sha256 text,
  ADD COLUMN IF NOT EXISTS package_installer_version text,
  ADD COLUMN IF NOT EXISTS previous_bundle_revoked_at timestamptz;

-- Extend licenses (install kind) with pin + tech contact
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS pinned_installer_version text,
  ADD COLUMN IF NOT EXISTS technical_contact_email text;

-- Audit table for downloads
CREATE TABLE IF NOT EXISTS public.installation_package_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL REFERENCES public.licenses(install_id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  signed_url_expires_at timestamptz,
  user_agent text,
  ip_address text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_installation_package_downloads_install
  ON public.installation_package_downloads(install_id, created_at DESC);

GRANT SELECT, INSERT ON public.installation_package_downloads TO authenticated;
GRANT ALL ON public.installation_package_downloads TO service_role;

ALTER TABLE public.installation_package_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read downloads"
  ON public.installation_package_downloads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Portal customers read own downloads"
  ON public.installation_package_downloads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses l
      WHERE l.install_id = installation_package_downloads.install_id
        AND l.contact_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Inserts happen only via service_role from server functions; no authenticated INSERT policy.
