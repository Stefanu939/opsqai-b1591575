-- CRM for the Management Center (cloud only, platform staff)

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  country text,
  language text DEFAULT 'en',
  source text NOT NULL DEFAULT 'manual',
  source_ref text,
  stage text NOT NULL DEFAULT 'new',
  status text NOT NULL DEFAULT 'open',
  value_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'EUR',
  probability integer,
  products text[] NOT NULL DEFAULT '{}',
  notes text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  lost_reason text,
  next_action_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX crm_leads_email_key ON public.crm_leads (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX crm_leads_stage_idx ON public.crm_leads (stage);
CREATE INDEX crm_leads_owner_idx ON public.crm_leads (owner_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_leads_staff_read ON public.crm_leads FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_leads_staff_insert ON public.crm_leads FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_leads_owner_update ON public.crm_leads FOR UPDATE TO authenticated
  USING (public.is_platform_owner() OR owner_user_id = auth.uid())
  WITH CHECK (public.is_platform_owner() OR owner_user_id = auth.uid());
CREATE POLICY crm_leads_owner_delete ON public.crm_leads FOR DELETE TO authenticated
  USING (public.is_platform_owner() OR owner_user_id = auth.uid());

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  subject text,
  body text,
  due_at timestamptz,
  done_at timestamptz,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_activities_lead_idx ON public.crm_activities (lead_id);
CREATE INDEX crm_activities_due_idx ON public.crm_activities (due_at) WHERE done_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_activities_staff_read ON public.crm_activities FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_activities_staff_insert ON public.crm_activities FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_activities_owner_update ON public.crm_activities FOR UPDATE TO authenticated
  USING (public.is_platform_owner() OR owner_user_id = auth.uid())
  WITH CHECK (public.is_platform_owner() OR owner_user_id = auth.uid());
CREATE POLICY crm_activities_owner_delete ON public.crm_activities FOR DELETE TO authenticated
  USING (public.is_platform_owner() OR owner_user_id = auth.uid());

CREATE TABLE public.crm_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_lead_events_lead_idx ON public.crm_lead_events (lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.crm_lead_events TO authenticated;
GRANT ALL ON public.crm_lead_events TO service_role;
ALTER TABLE public.crm_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_lead_events_staff_read ON public.crm_lead_events FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_lead_events_staff_insert ON public.crm_lead_events FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_platform_owner());

CREATE TABLE public.crm_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  products text[] NOT NULL DEFAULT '{}',
  amount numeric(12,2),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  pdf_path text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_offers_lead_idx ON public.crm_offers (lead_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_offers TO authenticated;
GRANT ALL ON public.crm_offers TO service_role;
ALTER TABLE public.crm_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_offers_staff_read ON public.crm_offers FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_offers_staff_insert ON public.crm_offers FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_platform_owner());
CREATE POLICY crm_offers_owner_update ON public.crm_offers FOR UPDATE TO authenticated
  USING (public.is_platform_owner() OR owner_user_id = auth.uid())
  WITH CHECK (public.is_platform_owner() OR owner_user_id = auth.uid());
CREATE POLICY crm_offers_owner_delete ON public.crm_offers FOR DELETE TO authenticated
  USING (public.is_platform_owner() OR owner_user_id = auth.uid());

CREATE TRIGGER crm_leads_touch BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER crm_activities_touch BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER crm_offers_touch BEFORE UPDATE ON public.crm_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Website contact form / pilot requests become CRM leads automatically.
CREATE OR REPLACE FUNCTION public.crm_intake_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
  target_stage text;
BEGIN
  target_stage := CASE WHEN NEW.subject::text = 'pilot' THEN 'pilot' ELSE 'new' END;

  IF NEW.email IS NOT NULL THEN
    SELECT id INTO existing FROM public.crm_leads WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;

  IF existing IS NULL THEN
    INSERT INTO public.crm_leads (
      company_name, contact_name, email, phone, country,
      source, source_ref, stage, notes
    ) VALUES (
      COALESCE(NULLIF(NEW.company, ''), COALESCE(NEW.name, 'Unknown')),
      NEW.name, NEW.email, NEW.phone, NEW.country,
      CASE WHEN NEW.subject::text = 'pilot' THEN 'pilot_request' ELSE 'contact_form' END,
      NEW.reference_code, target_stage, NEW.message
    )
    RETURNING id INTO existing;

    INSERT INTO public.crm_lead_events (lead_id, kind, detail)
    VALUES (existing, 'created', 'Website: ' || COALESCE(NEW.subject::text, 'general'));
  ELSE
    UPDATE public.crm_leads
       SET last_activity_at = now(),
           stage = CASE WHEN target_stage = 'pilot' AND stage IN ('new', 'qualified') THEN 'pilot' ELSE stage END
     WHERE id = existing;

    INSERT INTO public.crm_lead_events (lead_id, kind, detail)
    VALUES (existing, 'inbound', 'Website: ' || COALESCE(NEW.subject::text, 'general') || COALESCE(' — ' || NEW.reference_code, ''));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_intake_contact_submissions
AFTER INSERT ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.crm_intake_contact();