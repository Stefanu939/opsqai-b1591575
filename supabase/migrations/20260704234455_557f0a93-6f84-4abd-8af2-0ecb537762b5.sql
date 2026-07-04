
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS public.company_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','error','pending')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_integrations TO authenticated;
GRANT ALL ON public.company_integrations TO service_role;

ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own company integrations"
  ON public.company_integrations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = company_integrations.company_id)
    )
  );

CREATE POLICY "Admins manage own company integrations"
  ON public.company_integrations FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = company_integrations.company_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = company_integrations.company_id)
    )
  );

CREATE TRIGGER trg_company_integrations_updated_at
  BEFORE UPDATE ON public.company_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_company_integrations_company ON public.company_integrations(company_id);
