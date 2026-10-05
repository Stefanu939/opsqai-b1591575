CREATE TABLE public.kai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by TEXT NOT NULL DEFAULT 'Kai',
  requested_at TIMESTAMPTZ NOT NULL,
  approved_by UUID,
  approved_by_email TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('executed','failed')),
  action_type TEXT NOT NULL,
  label TEXT NOT NULL,
  target TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  conversation_id TEXT
);
GRANT ALL ON public.kai_action_log TO service_role;
ALTER TABLE public.kai_action_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX kai_action_log_approved_at_idx ON public.kai_action_log (approved_at DESC);