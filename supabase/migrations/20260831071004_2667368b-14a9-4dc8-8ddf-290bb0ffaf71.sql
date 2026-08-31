-- Phase 2: product architecture (additive only, nothing dropped)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS enabled_products text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill so existing customers keep exactly today's surface.
UPDATE public.companies
   SET business_type = COALESCE(business_type, 'logistics'),
       enabled_products = CASE
         WHEN enabled_products IS NULL OR cardinality(enabled_products) = 0
           THEN ARRAY['opsqai_logistics']::text[]
         ELSE enabled_products
       END;

ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS product_key text;

CREATE TABLE IF NOT EXISTS public.company_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'management_center',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, product_key)
);

GRANT SELECT ON public.company_products TO authenticated;
GRANT ALL ON public.company_products TO service_role;

ALTER TABLE public.company_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage company products"
  ON public.company_products FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Members read their company products"
  ON public.company_products FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER company_products_touch_updated_at
  BEFORE UPDATE ON public.company_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Mirror the backfilled products into the explicit product table.
INSERT INTO public.company_products (company_id, product_key, enabled, source)
SELECT c.id, p.product_key, true, 'backfill'
  FROM public.companies c
  CROSS JOIN LATERAL unnest(c.enabled_products) AS p(product_key)
ON CONFLICT (company_id, product_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS company_products_company_idx
  ON public.company_products (company_id) WHERE enabled;
CREATE INDEX IF NOT EXISTS licenses_product_key_idx
  ON public.licenses (product_key) WHERE product_key IS NOT NULL;