CREATE TABLE IF NOT EXISTS public.compliance_settings (
    company_id            uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    country_code          text NOT NULL DEFAULT 'OTHER_EU',
    primary_language      text NOT NULL DEFAULT 'en',
    framework_keys        text[] NOT NULL DEFAULT ARRAY[]::text[],
    review_interval_days  jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by            uuid,
    updated_at            timestamptz NOT NULL DEFAULT now(),
    created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.compliance_settings IS
  'Advisory-only org compliance configuration (country, language, selected frameworks, review cadence). Never asserts legal compliance.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_settings TO authenticated;
GRANT ALL ON public.compliance_settings TO service_role;

ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view their company compliance settings"
  ON public.compliance_settings FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR company_id = public.current_company_id());

CREATE POLICY "Company admins manage their company compliance settings"
  ON public.compliance_settings FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  );