-- 0027 — Product architecture: profile + product entitlements (additive)
--
-- OPSQAI evolved from a flat list of "modules" into Core platform
-- capabilities (always included) + OPSQAI Products + optional add-ons.
-- The signed installation license now carries the company profile and the
-- explicitly enabled products; this migration mirrors them locally so the
-- app can resolve visible workspaces offline.
--
-- Purely additive: nothing is renamed or dropped, older tokens keep working.

ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS product_key TEXT,
  ADD COLUMN IF NOT EXISTS profile     TEXT,
  ADD COLUMN IF NOT EXISTS products    TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

COMMENT ON COLUMN public.licenses.product_key IS
  'OPSQAI Product key when this mirror row represents a product entitlement.';
COMMENT ON COLUMN public.licenses.profile IS
  'Company profile (business type) carried by the installation license.';
COMMENT ON COLUMN public.licenses.products IS
  'Explicitly enabled OPSQAI Product keys from the installation license.';

CREATE INDEX IF NOT EXISTS licenses_product_key_idx
  ON public.licenses (product_key)
  WHERE product_key IS NOT NULL;
