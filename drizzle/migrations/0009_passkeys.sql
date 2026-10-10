CREATE TABLE public.passkey_credentials (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX passkey_credentials_user_idx ON public.passkey_credentials(user_id);
GRANT SELECT, DELETE ON public.passkey_credentials TO authenticated;
GRANT ALL ON public.passkey_credentials TO service_role;
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own passkeys read" ON public.passkey_credentials FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own passkeys delete" ON public.passkey_credentials FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL,
  user_id uuid,
  kind text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes'
);
GRANT ALL ON public.passkey_challenges TO service_role;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;