
CREATE TABLE public.installer_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  tag_name TEXT NOT NULL,
  zip_url TEXT NOT NULL,
  zip_size_bytes BIGINT,
  exe_sha256 TEXT,
  exe_size_bytes BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_installer_releases_active ON public.installer_releases (is_active, published_at DESC);

GRANT SELECT ON public.installer_releases TO authenticated;
GRANT ALL ON public.installer_releases TO service_role;

ALTER TABLE public.installer_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view releases"
ON public.installer_releases
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.update_installer_releases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_installer_releases_updated_at
BEFORE UPDATE ON public.installer_releases
FOR EACH ROW EXECUTE FUNCTION public.update_installer_releases_updated_at();
