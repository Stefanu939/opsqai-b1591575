
CREATE TYPE public.sso_idp_type AS ENUM ('azure_ad', 'okta', 'onelogin', 'ping', 'google_workspace', 'other');
CREATE TYPE public.sso_config_status AS ENUM ('draft', 'pending_review', 'active', 'rejected');

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.sso_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  idp_type public.sso_idp_type NOT NULL DEFAULT 'azure_ad',
  display_name TEXT,
  metadata_url TEXT,
  tenant_id TEXT,
  email_domains TEXT[] NOT NULL DEFAULT '{}',
  status public.sso_config_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sso_configurations TO authenticated;
GRANT ALL ON public.sso_configurations TO service_role;

ALTER TABLE public.sso_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage own SSO config"
ON public.sso_configurations
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_admin')
  OR public.has_role(auth.uid(), 'platform_owner')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = sso_configurations.company_id
      AND public.has_role(auth.uid(), 'admin')
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'platform_admin')
  OR public.has_role(auth.uid(), 'platform_owner')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = sso_configurations.company_id
      AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE TRIGGER set_sso_configurations_updated_at
BEFORE UPDATE ON public.sso_configurations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX idx_sso_configurations_company ON public.sso_configurations(company_id);
CREATE INDEX idx_sso_configurations_status ON public.sso_configurations(status);
