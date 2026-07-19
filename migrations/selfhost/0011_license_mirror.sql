-- --------------------------------------------------------------------
-- License mirror v2 — JWT activation bundle compatibility
-- --------------------------------------------------------------------
-- Self-Hosted now receives activation-bundle.jwt from the Customer Portal.
-- The local mirror must be able to cache both the mandatory Installation
-- License and any per-module JWT licenses carried by that bundle.

ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS install_id TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'install';
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS module_key TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS max_users INT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS maintenance_expires_at TIMESTAMPTZ;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS signed_token TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS license_version INT NOT NULL DEFAULT 1;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

ALTER TABLE public.licenses ALTER COLUMN expires_at DROP NOT NULL;

UPDATE public.licenses
SET company_name = COALESCE(company_name, customer),
    tier = COALESCE(tier, edition),
    max_users = COALESCE(max_users, seats),
    signed_token = COALESCE(signed_token, raw_token)
WHERE company_name IS NULL OR tier IS NULL OR max_users IS NULL OR signed_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS licenses_install_unique
  ON public.licenses (install_id)
  WHERE kind = 'install' AND install_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS licenses_module_unique
  ON public.licenses (install_id, module_key)
  WHERE kind = 'module' AND install_id IS NOT NULL AND module_key IS NOT NULL;