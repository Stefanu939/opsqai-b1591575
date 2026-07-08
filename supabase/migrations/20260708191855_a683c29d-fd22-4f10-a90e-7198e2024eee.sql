
CREATE TABLE public.license_signing_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm text NOT NULL DEFAULT 'ed25519',
  private_key_pem text NOT NULL,
  public_key_pem text NOT NULL,
  key_id text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.license_signing_keys TO authenticated;
GRANT ALL ON public.license_signing_keys TO service_role;
ALTER TABLE public.license_signing_keys ENABLE ROW LEVEL SECURITY;

-- Platform admins can read metadata (but NOT the private key — enforced via view below)
CREATE POLICY "Platform admins read signing keys"
  ON public.license_signing_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Revoke private_key column from authenticated via column-level grants
REVOKE SELECT ON public.license_signing_keys FROM authenticated;
GRANT SELECT (id, algorithm, public_key_pem, key_id, active, created_at) ON public.license_signing_keys TO authenticated;
