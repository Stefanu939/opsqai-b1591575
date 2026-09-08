CREATE TABLE public.study_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locale text NOT NULL DEFAULT 'en',
  sector text,
  size_band text,
  country text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed boolean NOT NULL DEFAULT true,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.study_responses TO service_role;
GRANT SELECT ON public.study_responses TO authenticated;
ALTER TABLE public.study_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY study_responses_platform_read ON public.study_responses
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_owner());

CREATE TABLE public.study_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid REFERENCES public.study_responses(id) ON DELETE SET NULL,
  email text NOT NULL,
  contact_name text,
  company_name text,
  country text,
  locale text NOT NULL DEFAULT 'en',
  wants_report boolean NOT NULL DEFAULT true,
  wants_pilot boolean NOT NULL DEFAULT false,
  consent boolean NOT NULL DEFAULT false,
  sector text,
  size_band text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.study_contacts TO service_role;
GRANT SELECT ON public.study_contacts TO authenticated;
ALTER TABLE public.study_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY study_contacts_platform_read ON public.study_contacts
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_owner());

CREATE TRIGGER study_responses_touch BEFORE UPDATE ON public.study_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER study_contacts_touch BEFORE UPDATE ON public.study_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX study_responses_created_idx ON public.study_responses (created_at DESC);
CREATE INDEX study_responses_sector_idx ON public.study_responses (sector);

-- Study respondents who leave an email become CRM leads automatically.
CREATE OR REPLACE FUNCTION public.crm_intake_study()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
BEGIN
  SELECT id INTO existing FROM public.crm_leads WHERE lower(email) = lower(NEW.email) LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO public.crm_leads (
      company_name, contact_name, email, country, source, source_ref, stage, notes
    ) VALUES (
      COALESCE(NULLIF(NEW.company_name, ''), COALESCE(NULLIF(NEW.contact_name, ''), 'Study respondent')),
      NEW.contact_name, NEW.email, NEW.country,
      CASE WHEN NEW.wants_pilot THEN 'pilot_request' ELSE 'study' END,
      NEW.id::text,
      CASE WHEN NEW.wants_pilot THEN 'pilot' ELSE 'new' END,
      'Study respondent (' || NEW.locale || ')'
        || COALESCE(' · sector: ' || NEW.sector, '')
        || COALESCE(' · size: ' || NEW.size_band, '')
    )
    RETURNING id INTO existing;

    INSERT INTO public.crm_lead_events (lead_id, kind, detail)
    VALUES (existing, 'created', 'Study questionnaire (' || NEW.locale || ')');
  ELSE
    UPDATE public.crm_leads
       SET last_activity_at = now(),
           stage = CASE WHEN NEW.wants_pilot AND stage IN ('new', 'qualified') THEN 'pilot' ELSE stage END
     WHERE id = existing;

    INSERT INTO public.crm_lead_events (lead_id, kind, detail)
    VALUES (existing, 'inbound', 'Study questionnaire (' || NEW.locale || ')');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_intake_study() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER crm_intake_study_contacts
AFTER INSERT ON public.study_contacts
FOR EACH ROW EXECUTE FUNCTION public.crm_intake_study();

-- Aggregated study results only: counts and distributions, never individual rows.
CREATE OR REPLACE FUNCTION public.study_benchmark()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.study_responses WHERE completed),
    'by_sector', COALESCE((
      SELECT jsonb_object_agg(sector, c) FROM (
        SELECT COALESCE(sector, 'unknown') AS sector, count(*) AS c
        FROM public.study_responses WHERE completed GROUP BY 1
      ) s), '{}'::jsonb),
    'by_size', COALESCE((
      SELECT jsonb_object_agg(size_band, c) FROM (
        SELECT COALESCE(size_band, 'unknown') AS size_band, count(*) AS c
        FROM public.study_responses WHERE completed GROUP BY 1
      ) s), '{}'::jsonb),
    'by_country', COALESCE((
      SELECT jsonb_object_agg(country, c) FROM (
        SELECT COALESCE(country, 'unknown') AS country, count(*) AS c
        FROM public.study_responses WHERE completed GROUP BY 1
      ) s), '{}'::jsonb),
    'by_question', COALESCE((
      SELECT jsonb_object_agg(qkey, dist) FROM (
        SELECT qkey, jsonb_object_agg(val, c) AS dist FROM (
          SELECT kv.key AS qkey, kv.value #>> '{}' AS val, count(*) AS c
          FROM public.study_responses r, jsonb_each(r.answers) kv
          WHERE r.completed
          GROUP BY 1, 2
        ) a GROUP BY qkey
      ) q), '{}'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.study_benchmark() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_benchmark() TO service_role, authenticated;