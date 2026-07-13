-- Add install_id bridge column on companies so per-company server fns can
-- resolve which Installation License to enforce against.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS install_id text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_install_id_key
  ON public.companies (install_id)
  WHERE install_id IS NOT NULL;

COMMENT ON COLUMN public.companies.install_id IS
  'Optional link to licenses.install_id. When set, per-company server fns enforce module licensing via assertModuleForCompany.';