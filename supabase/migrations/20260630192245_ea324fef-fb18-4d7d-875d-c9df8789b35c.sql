
-- ===== OPSQAI Internal: System Workspace foundations =====

-- 1. Mark companies as system
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Only one system company allowed
CREATE UNIQUE INDEX IF NOT EXISTS companies_one_system_uidx
  ON public.companies ((is_system)) WHERE is_system = true;

-- Block delete of the system company
CREATE OR REPLACE FUNCTION public.protect_system_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_system THEN
    RAISE EXCEPTION 'OPSQAI Internal workspace is immutable and cannot be deleted'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_system AND NEW.is_system = false THEN
    RAISE EXCEPTION 'OPSQAI Internal workspace flag cannot be cleared'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_system_company() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_system_company ON public.companies;
CREATE TRIGGER trg_protect_system_company
  BEFORE UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_company();

-- 2. Knowledge type on documents + chunks
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS knowledge_type text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS system_slug text;

ALTER TABLE public.knowledge_documents
  DROP CONSTRAINT IF EXISTS knowledge_documents_knowledge_type_check;
ALTER TABLE public.knowledge_documents
  ADD CONSTRAINT knowledge_documents_knowledge_type_check
  CHECK (knowledge_type IN ('company','system'));

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_documents_system_slug_uidx
  ON public.knowledge_documents (company_id, system_slug)
  WHERE system_slug IS NOT NULL;

-- Tighten RLS: system docs only visible to platform admins/owners,
-- regardless of which company they nominally belong to.
DROP POLICY IF EXISTS "company members read documents" ON public.knowledge_documents;
CREATE POLICY "company members read documents"
  ON public.knowledge_documents
  FOR SELECT TO authenticated
  USING (
    is_platform_admin()
    OR (knowledge_type = 'company' AND company_id = current_company_id())
  );

DROP POLICY IF EXISTS "company admins or managers manage documents" ON public.knowledge_documents;
CREATE POLICY "company admins or managers manage documents"
  ON public.knowledge_documents
  FOR ALL TO authenticated
  USING (
    is_platform_admin()
    OR (knowledge_type = 'company' AND company_id = current_company_id()
        AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')))
  )
  WITH CHECK (
    is_platform_admin()
    OR (knowledge_type = 'company' AND company_id = current_company_id()
        AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')))
  );

-- Chunks: rely on parent doc isolation but also block reads of system chunks
-- for non-platform users via knowledge_type lookup.
DROP POLICY IF EXISTS "company members read chunks" ON public.document_chunks;
CREATE POLICY "company members read chunks"
  ON public.document_chunks
  FOR SELECT TO authenticated
  USING (
    is_platform_admin()
    OR (
      company_id = current_company_id()
      AND EXISTS (
        SELECT 1 FROM public.knowledge_documents d
        WHERE d.id = document_chunks.document_id AND d.knowledge_type = 'company'
      )
    )
  );

-- 3. System doc catalog (source of truth for auto-generated docs)
CREATE TABLE IF NOT EXISTS public.system_doc_catalog (
  slug text PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL,
  body_hash text NOT NULL,
  related_slugs text[] NOT NULL DEFAULT '{}',
  feature_key text,
  document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_doc_catalog TO authenticated;
GRANT ALL ON public.system_doc_catalog TO service_role;

ALTER TABLE public.system_doc_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admins read system catalog"
  ON public.system_doc_catalog FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "platform admins manage system catalog"
  ON public.system_doc_catalog FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP TRIGGER IF EXISTS trg_system_doc_catalog_touch ON public.system_doc_catalog;
CREATE TRIGGER trg_system_doc_catalog_touch
  BEFORE UPDATE ON public.system_doc_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Helper: resolve the system company id
CREATE OR REPLACE FUNCTION public.system_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.companies WHERE is_system = true LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.system_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_company_id() TO authenticated;

-- 5. Seed the OPSQAI Internal workspace (idempotent)
INSERT INTO public.companies (name, is_system, subscription_status, subscription_plan, max_users, active, workspace_retention)
SELECT 'OPSQAI Internal', true, 'active', 'platform', 0, true, 'manual'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE is_system = true);
