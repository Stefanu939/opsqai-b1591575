ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cui text,
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS onboarding_error text;
CREATE UNIQUE INDEX IF NOT EXISTS companies_cui_unique ON public.companies (cui) WHERE cui IS NOT NULL AND terminated_at IS NULL;

CREATE TABLE public.kai_conversations (
  id text NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kai_conversations TO authenticated;
GRANT ALL ON public.kai_conversations TO service_role;
ALTER TABLE public.kai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kai conversations" ON public.kai_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.mc_sender_settings (
  user_id uuid PRIMARY KEY,
  sender_email text,
  email_provider text NOT NULL DEFAULT 'default',
  whatsapp_number text,
  kai_may_compose boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_sender_settings TO authenticated;
GRANT ALL ON public.mc_sender_settings TO service_role;
ALTER TABLE public.mc_sender_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sender settings" ON public.mc_sender_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());