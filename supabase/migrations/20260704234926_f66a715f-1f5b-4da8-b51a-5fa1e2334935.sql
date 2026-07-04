
-- Webhook endpoints subscribed per company
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL CHECK (url ~ '^https://'),
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own webhooks"
  ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = webhook_endpoints.company_id)
    )
  );

CREATE POLICY "Admins manage own webhooks"
  ON public.webhook_endpoints FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = webhook_endpoints.company_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = webhook_endpoints.company_id)
    )
  );

CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_company ON public.webhook_endpoints(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON public.webhook_endpoints(active) WHERE active = true;

-- Delivery audit log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  status_code INT,
  ok BOOLEAN NOT NULL DEFAULT false,
  response_body TEXT,
  error TEXT,
  latency_ms INT,
  attempt INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own deliveries"
  ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'platform_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = webhook_deliveries.company_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_company ON public.webhook_deliveries(company_id, created_at DESC);
