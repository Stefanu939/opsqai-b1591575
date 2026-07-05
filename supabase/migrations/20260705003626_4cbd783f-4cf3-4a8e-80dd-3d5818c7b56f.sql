
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read:faqs','read:knowledge']::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX api_keys_company_idx ON public.api_keys(company_id);
CREATE INDEX api_keys_hash_active_idx ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own company api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'platform_owner'::app_role)
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = api_keys.company_id
      AND has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins insert own company api keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'platform_owner'::app_role)
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = api_keys.company_id
      AND has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins update own company api keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'platform_owner'::app_role)
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = api_keys.company_id
      AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Verification helper — service role only (called from public API route with admin client).
CREATE OR REPLACE FUNCTION public.verify_api_key(_hash text)
RETURNS TABLE(company_id uuid, key_id uuid, scopes text[])
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id, id, scopes
  FROM public.api_keys
  WHERE key_hash = _hash AND revoked_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.verify_api_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;
