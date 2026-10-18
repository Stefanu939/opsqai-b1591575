CREATE TABLE public.prospect_sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  ip_hash text,
  user_id uuid,
  email text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_message_count int NOT NULL DEFAULT 0,
  login_gate_at timestamptz,
  signed_in_at timestamptz,
  converted_at timestamptz,
  crm_lead_id uuid,
  analysis jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.prospect_sessions TO service_role;
ALTER TABLE public.prospect_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX prospect_sessions_last_idx ON public.prospect_sessions (last_message_at DESC);
CREATE INDEX prospect_sessions_ip_idx ON public.prospect_sessions (ip_hash, started_at);
CREATE INDEX prospect_sessions_user_idx ON public.prospect_sessions (user_id);