
-- 1. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_status text NOT NULL DEFAULT 'active',
  subscription_plan text NOT NULL DEFAULT 'free',
  max_users integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER companies_touch_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Add platform_admin enum value (must be committed before usage)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

-- 3. Default company
INSERT INTO public.companies (id, name, subscription_status, subscription_plan, max_users, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Company', 'active', 'enterprise', 1000, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Add company_id everywhere
ALTER TABLE public.profiles            ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles          ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.threads             ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.messages            ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.faqs                ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.audit_log           ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.document_chunks     ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.departments         ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Backfill into default company
UPDATE public.profiles            SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.user_roles          SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.threads             SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.messages            SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.knowledge_documents SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.faqs                SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.audit_log           SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.document_chunks     SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.departments         SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 6. NOT NULL where applicable (user_roles stays nullable for platform_admin rows)
ALTER TABLE public.profiles            ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.threads             ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.messages            ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.knowledge_documents ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.faqs                ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.audit_log           ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.document_chunks     ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.departments         ALTER COLUMN company_id SET NOT NULL;

-- 7. Indexes for tenant filtering
CREATE INDEX IF NOT EXISTS idx_profiles_company            ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company          ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_threads_company             ON public.threads(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_company            ON public.messages(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_company ON public.knowledge_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_faqs_company                ON public.faqs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company           ON public.audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_company     ON public.document_chunks(company_id);

-- 8. Add language preference values are already free text; ensure column accepts en/de/ro
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_language_pref_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_pref_check
  CHECK (language_pref IN ('en', 'de', 'ro'));
