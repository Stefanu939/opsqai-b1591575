-- installer_version is the version of the Installation Package running on the
-- customer host. It's independent from app_version (application build).
ALTER TABLE public.license_installs
  ADD COLUMN IF NOT EXISTS installer_version text NULL;

-- Ownership tracking on the Installation License row.
-- Only meaningful when kind='install'; module rows leave these NULL.
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'opsqai',
  ADD COLUMN IF NOT EXISTS owner_since timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS handed_over_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS handover_notes text NULL;

ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_owner_type_check;
ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_owner_type_check
  CHECK (owner_type IN ('opsqai','customer'));