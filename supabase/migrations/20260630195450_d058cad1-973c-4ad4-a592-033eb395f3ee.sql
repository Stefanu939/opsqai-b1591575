
-- Platform Email Settings (singleton)
CREATE TABLE public.platform_email_settings (
  id boolean PRIMARY KEY DEFAULT true,
  sender_name text NOT NULL DEFAULT 'OPSQAI',
  sender_email text NOT NULL DEFAULT 'noreply@opsqai.de',
  reply_to_email text NOT NULL DEFAULT 'support@opsqai.de',
  support_email text NOT NULL DEFAULT 'support@opsqai.de',
  contact_email text NOT NULL DEFAULT 'info@opsqai.de',
  security_email text NOT NULL DEFAULT 'security@opsqai.de',
  privacy_email text NOT NULL DEFAULT 'policy@opsqai.de',
  website_url text NOT NULL DEFAULT 'https://opsqai.de',
  company_name text NOT NULL DEFAULT 'OPSQAI',
  footer_text text NOT NULL DEFAULT 'OPSQAI · Operational Knowledge Intelligence',
  logo_url text NOT NULL DEFAULT 'https://opsqai.de/brand/logo-horizontal-light.svg',
  provider text NOT NULL DEFAULT 'lovable',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT platform_email_settings_singleton CHECK (id = true)
);

GRANT SELECT, INSERT, UPDATE ON public.platform_email_settings TO authenticated;
GRANT ALL ON public.platform_email_settings TO service_role;

ALTER TABLE public.platform_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admins read email settings"
  ON public.platform_email_settings FOR SELECT TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform admins write email settings"
  ON public.platform_email_settings FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

INSERT INTO public.platform_email_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Contact submissions (public website inquiries)
CREATE TYPE public.contact_subject AS ENUM (
  'general', 'demo', 'sales', 'pricing', 'support', 'bug', 'security', 'privacy', 'partnership', 'other'
);

CREATE TYPE public.contact_status AS ENUM ('new', 'in_progress', 'resolved', 'spam');

CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE DEFAULT ('REQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  country text,
  subject public.contact_subject NOT NULL DEFAULT 'general',
  message text NOT NULL,
  routed_to text NOT NULL,
  status public.contact_status NOT NULL DEFAULT 'new',
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_submissions_created_idx ON public.contact_submissions (created_at DESC);

GRANT SELECT, UPDATE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
-- Public form submits via a server route using service_role, so no anon INSERT grant.

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admins read contact submissions"
  ON public.contact_submissions FOR SELECT TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform admins update contact submissions"
  ON public.contact_submissions FOR UPDATE TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE OR REPLACE FUNCTION public.touch_updated_at_email_cfg() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_platform_email_settings_touch
  BEFORE UPDATE ON public.platform_email_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_email_cfg();

CREATE TRIGGER trg_contact_submissions_touch
  BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_email_cfg();
