ALTER TABLE public.installation_package_downloads
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'package',
  ADD COLUMN IF NOT EXISTS version text;

CREATE INDEX IF NOT EXISTS idx_installation_package_downloads_kind
  ON public.installation_package_downloads(install_id, kind, created_at DESC);