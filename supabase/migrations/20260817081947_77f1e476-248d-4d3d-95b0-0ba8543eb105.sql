CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform','portal')),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_email text,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'meeting' CHECK (kind IN ('meeting','renewal','maintenance','release','deadline','training','other')),
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_events_scope_starts_idx ON public.calendar_events (scope, starts_at);
CREATE INDEX calendar_events_owner_email_idx ON public.calendar_events (owner_email);
CREATE INDEX calendar_events_company_idx ON public.calendar_events (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff manage platform events"
ON public.calendar_events FOR ALL TO authenticated
USING (scope = 'platform' AND public.is_platform_admin())
WITH CHECK (scope = 'platform' AND public.is_platform_admin());

CREATE POLICY "Users manage their own portal events"
ON public.calendar_events FOR ALL TO authenticated
USING (scope = 'portal' AND owner_email = (auth.jwt() ->> 'email'))
WITH CHECK (scope = 'portal' AND owner_email = (auth.jwt() ->> 'email'));

CREATE TRIGGER calendar_events_touch
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.calendar_feed_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('platform','portal')),
  owner_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX calendar_feed_tokens_user_idx ON public.calendar_feed_tokens (user_id);

GRANT ALL ON public.calendar_feed_tokens TO service_role;

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only manages feed tokens"
ON public.calendar_feed_tokens FOR ALL TO service_role
USING (true) WITH CHECK (true);