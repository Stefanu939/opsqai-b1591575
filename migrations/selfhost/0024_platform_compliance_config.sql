-- 0024: advisory compliance context captured during first-run setup.
-- Non-secret JSON: country code, primary language, reference framework keys
-- and the default review interval. Company-level settings continue to live in
-- public.compliance_settings.

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS compliance_config jsonb;
