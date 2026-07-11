ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS break_glass_hash text NULL,
  ADD COLUMN IF NOT EXISTS break_glass_created_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS break_glass_used_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS recovery_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_mode_since timestamptz NULL,
  ADD COLUMN IF NOT EXISTS recovery_mode_reason text NULL;

CREATE TABLE IF NOT EXISTS public.dr_bootstrap_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id text NOT NULL,
  key_id text NOT NULL,
  nonce text NOT NULL,
  issued_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz NULL,
  reason text NULL,
  UNIQUE (install_id, nonce)
);

CREATE INDEX IF NOT EXISTS dr_bootstrap_tokens_install_idx
  ON public.dr_bootstrap_tokens (install_id, issued_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.dr_bootstrap_tokens TO authenticated;
GRANT ALL ON public.dr_bootstrap_tokens TO service_role;

ALTER TABLE public.dr_bootstrap_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dr_bootstrap_tokens_admin_select ON public.dr_bootstrap_tokens;
CREATE POLICY dr_bootstrap_tokens_admin_select ON public.dr_bootstrap_tokens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

DROP POLICY IF EXISTS dr_bootstrap_tokens_admin_write ON public.dr_bootstrap_tokens;
CREATE POLICY dr_bootstrap_tokens_admin_write ON public.dr_bootstrap_tokens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));