CREATE TABLE public.prospect_accounts (
  user_id uuid PRIMARY KEY,
  email text,
  data_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.prospect_accounts TO authenticated;
GRANT ALL ON public.prospect_accounts TO service_role;
ALTER TABLE public.prospect_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prospect account" ON public.prospect_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff read prospect accounts" ON public.prospect_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE TABLE public.prospect_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  company_name text NOT NULL,
  phone text,
  employees text,
  message text,
  consent_contact boolean NOT NULL,
  crm_lead_id uuid,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.prospect_leads TO authenticated;
GRANT ALL ON public.prospect_leads TO service_role;
ALTER TABLE public.prospect_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prospect leads read" ON public.prospect_leads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "own prospect leads insert" ON public.prospect_leads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND consent_contact = true);