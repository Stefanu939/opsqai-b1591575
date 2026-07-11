
-- Phase 1: licenses schema split — Installation vs Module licenses on a single table
-- with a `kind` discriminator, per-module rows, and hardening columns.

-- 1. Discriminator + new columns
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'install',
  ADD COLUMN IF NOT EXISTS module_key text NULL,
  ADD COLUMN IF NOT EXISTS seats integer NULL,
  ADD COLUMN IF NOT EXISTS maintenance_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS suspended_reason text NULL,
  ADD COLUMN IF NOT EXISTS license_version integer NOT NULL DEFAULT 1;

-- 2. Backfill install rows: seats := max_users where seats is null
UPDATE public.licenses
   SET seats = COALESCE(seats, max_users)
 WHERE kind = 'install' AND seats IS NULL;

-- 3. Backfill per-module rows from the legacy modules[] jsonb.
--    For each install license row, explode modules[] into new kind='module' rows
--    for every add-on module (non-basic). Existing signed_token is reused as a
--    placeholder; Phase 1 code will re-sign real per-module tokens when the
--    Module License is (re-)issued through the new API.
INSERT INTO public.licenses (
  install_id, company_name, contact_email, tier, modules, max_users,
  issued_at, expires_at, hard_expiry, revoked, signed_token, notes, issued_by,
  kind, module_key, seats, maintenance_expires_at, suspended, license_version
)
SELECT
  parent.install_id,
  parent.company_name,
  parent.contact_email,
  parent.tier,
  '[]'::jsonb,
  parent.max_users,
  parent.issued_at,
  parent.expires_at,
  parent.hard_expiry,
  parent.revoked,
  NULL, -- module tokens must be freshly issued through Phase 1 API
  'auto-migrated from bundled modules[] — reissue for real token',
  parent.issued_by,
  'module',
  m.value #>> '{}',
  NULL,
  parent.expires_at, -- inherit maintenance from install expiry initially
  false,
  1
FROM public.licenses parent
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(parent.modules, '[]'::jsonb)) AS m(value)
WHERE parent.kind = 'install'
  AND (m.value #>> '{}') NOT IN ('chat','kb','faq','notifications','bilingual_ui','pwa')
ON CONFLICT DO NOTHING;

-- 4. Constraints
ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_kind_check;
ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_kind_check CHECK (kind IN ('install','module'));

ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_module_shape_check;
ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_module_shape_check CHECK (
    (kind = 'install' AND module_key IS NULL) OR
    (kind = 'module'  AND module_key IS NOT NULL)
  );

-- 5. Unique indexes: exactly one install license per install_id,
--    and at most one module license per (install_id, module_key).
DROP INDEX IF EXISTS licenses_one_install_per_id;
CREATE UNIQUE INDEX licenses_one_install_per_id
  ON public.licenses (install_id)
  WHERE kind = 'install';

DROP INDEX IF EXISTS licenses_one_module_per_install;
CREATE UNIQUE INDEX licenses_one_module_per_install
  ON public.licenses (install_id, module_key)
  WHERE kind = 'module';

CREATE INDEX IF NOT EXISTS licenses_kind_idx ON public.licenses (kind);
CREATE INDEX IF NOT EXISTS licenses_install_kind_idx ON public.licenses (install_id, kind);
