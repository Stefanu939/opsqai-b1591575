
-- Enterprise Customer Workspace Manager: 7 tables, RLS = platform admins only

-- 1) Per-company structured profile (1:1 with companies)
CREATE TABLE public.customer_profiles (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  account_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contract_status text NOT NULL DEFAULT 'prospect',
  renewal_date date,
  onboarding_pct int NOT NULL DEFAULT 0 CHECK (onboarding_pct BETWEEN 0 AND 100),
  general jsonb NOT NULL DEFAULT '{}'::jsonb,
  commercial jsonb NOT NULL DEFAULT '{}'::jsonb,
  implementation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sla jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles TO authenticated;
GRANT ALL ON public.customer_profiles TO service_role;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_platform_all" ON public.customer_profiles FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER trg_cp_touch BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Feature matrix per company
CREATE TABLE public.customer_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  state text NOT NULL DEFAULT 'enabled'
    CHECK (state IN ('enabled','disabled','beta','enterprise','coming_soon')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, feature_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_features TO authenticated;
GRANT ALL ON public.customer_features TO service_role;
ALTER TABLE public.customer_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cf_platform_all" ON public.customer_features FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER trg_cf_touch BEFORE UPDATE ON public.customer_features
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Compliance rows
CREATE TABLE public.customer_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  area text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('not_applicable','pending','in_progress','met','exceeded')),
  evidence text,
  notes text,
  owner text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_compliance TO authenticated;
GRANT ALL ON public.customer_compliance TO service_role;
ALTER TABLE public.customer_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_platform_all" ON public.customer_compliance FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER trg_cc_touch BEFORE UPDATE ON public.customer_compliance
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) Security overview rows
CREATE TABLE public.customer_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  area text NOT NULL,
  summary text,
  controls jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_security TO authenticated;
GRANT ALL ON public.customer_security TO service_role;
ALTER TABLE public.customer_security ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_platform_all" ON public.customer_security FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER trg_cs_touch BEFORE UPDATE ON public.customer_security
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Documents
CREATE TABLE public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','sent','archived')),
  markdown text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cd_platform_all" ON public.customer_documents FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE INDEX idx_customer_documents_company ON public.customer_documents(company_id, updated_at DESC);
CREATE TRIGGER trg_cd_touch BEFORE UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) Document versions (snapshots)
CREATE TABLE public.customer_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.customer_documents(id) ON DELETE CASCADE,
  version int NOT NULL,
  title text NOT NULL,
  markdown text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_document_versions TO authenticated;
GRANT ALL ON public.customer_document_versions TO service_role;
ALTER TABLE public.customer_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cdv_platform_all" ON public.customer_document_versions FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Snapshot trigger on customer_documents
CREATE OR REPLACE FUNCTION public.customer_documents_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.markdown IS DISTINCT FROM OLD.markdown OR
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    INSERT INTO public.customer_document_versions
      (document_id, version, title, markdown, metadata, created_by)
    VALUES (OLD.id, OLD.version, OLD.title, OLD.markdown, OLD.metadata, auth.uid());
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.customer_documents_snapshot() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_customer_documents_snapshot BEFORE UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.customer_documents_snapshot();

-- 7) Timeline events
CREATE TABLE public.customer_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_timeline TO authenticated;
GRANT ALL ON public.customer_timeline TO service_role;
ALTER TABLE public.customer_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_platform_all" ON public.customer_timeline FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE INDEX idx_customer_timeline_company ON public.customer_timeline(company_id, occurred_at DESC);

-- Auto timeline event on document insert / status change
CREATE OR REPLACE FUNCTION public.customer_documents_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_timeline(company_id, event_type, title, payload, created_by)
    VALUES (NEW.company_id, 'document_created',
      'Document created: '||NEW.title,
      jsonb_build_object('document_id', NEW.id, 'doc_type', NEW.doc_type),
      NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.customer_timeline(company_id, event_type, title, payload, created_by)
    VALUES (NEW.company_id, 'document_'||NEW.status,
      'Document '||NEW.status||': '||NEW.title,
      jsonb_build_object('document_id', NEW.id, 'doc_type', NEW.doc_type, 'from', OLD.status, 'to', NEW.status),
      auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.customer_documents_timeline() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_customer_documents_timeline_ins AFTER INSERT ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.customer_documents_timeline();
CREATE TRIGGER trg_customer_documents_timeline_upd AFTER UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.customer_documents_timeline();

-- Customer health RPC
CREATE OR REPLACE FUNCTION public.customer_health(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'workspaceHealth', COALESCE((SELECT (public.dashboard_health(p_company))->>'score')::int, 0),
    'knowledgeDocs', (SELECT count(*) FROM knowledge_documents WHERE company_id=p_company AND is_active),
    'criticalDocs', (SELECT count(*) FROM knowledge_documents WHERE company_id=p_company AND is_critical AND is_active),
    'faqs', (SELECT count(*) FROM faqs WHERE company_id=p_company),
    'openGaps', (SELECT count(*) FROM knowledge_gaps WHERE company_id=p_company AND status='open'),
    'mau', (SELECT count(DISTINCT user_id) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'questions30d', (SELECT count(*) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'academyCompletions', (SELECT count(*) FROM academy_certificates WHERE company_id=p_company),
    'supportOpen', (SELECT count(*) FROM support_conversations WHERE company_id=p_company AND status IN ('open','pending')),
    'docsGenerated', (SELECT count(*) FROM customer_documents WHERE company_id=p_company)
  ) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.customer_health(uuid) TO authenticated;
