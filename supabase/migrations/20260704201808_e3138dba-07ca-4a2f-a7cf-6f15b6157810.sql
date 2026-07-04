
-- =========================================================
-- Interactive Demo schema foundation
-- =========================================================

-- 1. Company flags
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_demo_tenant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_only_one_demo
  ON public.companies ((is_demo_tenant))
  WHERE is_demo_tenant = true;

-- 2. Ephemeral markers on chat + audit
ALTER TABLE public.threads     ADD COLUMN IF NOT EXISTS is_demo_ephemeral boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages    ADD COLUMN IF NOT EXISTS is_demo_ephemeral boolean NOT NULL DEFAULT false;
ALTER TABLE public.audit_log   ADD COLUMN IF NOT EXISTS is_demo_ephemeral boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS threads_demo_ephemeral_idx  ON public.threads(is_demo_ephemeral) WHERE is_demo_ephemeral;
CREATE INDEX IF NOT EXISTS messages_demo_ephemeral_idx ON public.messages(is_demo_ephemeral) WHERE is_demo_ephemeral;
CREATE INDEX IF NOT EXISTS audit_demo_ephemeral_idx    ON public.audit_log(is_demo_ephemeral) WHERE is_demo_ephemeral;

-- 3. Anonymous demo sessions (server-managed; no anon grant)
CREATE TABLE IF NOT EXISTS public.demo_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text NOT NULL UNIQUE,
  started_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.demo_sessions TO service_role;
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only" ON public.demo_sessions;
CREATE POLICY "service role only" ON public.demo_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS demo_sessions_expires_idx ON public.demo_sessions(expires_at);

-- 4. Helper
CREATE OR REPLACE FUNCTION public.is_demo_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE id = _company_id AND is_demo_tenant = true)
$$;

-- 5. Anonymous read policies — one per table, all gated on is_demo_company
--    Grants are additive; each depends on the existing table already existing.

-- Companies
GRANT SELECT ON public.companies TO anon;
DROP POLICY IF EXISTS "demo anon read companies" ON public.companies;
CREATE POLICY "demo anon read companies" ON public.companies
  FOR SELECT TO anon USING (is_demo_tenant = true);

-- Departments
GRANT SELECT ON public.departments TO anon;
DROP POLICY IF EXISTS "demo anon read departments" ON public.departments;
CREATE POLICY "demo anon read departments" ON public.departments
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

-- Profiles (columns filtered client-side; policy just gates the row)
GRANT SELECT ON public.profiles TO anon;
DROP POLICY IF EXISTS "demo anon read profiles" ON public.profiles;
CREATE POLICY "demo anon read profiles" ON public.profiles
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

-- User roles
GRANT SELECT ON public.user_roles TO anon;
DROP POLICY IF EXISTS "demo anon read user_roles" ON public.user_roles;
CREATE POLICY "demo anon read user_roles" ON public.user_roles
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

-- Knowledge base
GRANT SELECT ON public.knowledge_documents TO anon;
DROP POLICY IF EXISTS "demo anon read knowledge_documents" ON public.knowledge_documents;
CREATE POLICY "demo anon read knowledge_documents" ON public.knowledge_documents
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

GRANT SELECT ON public.document_chunks TO anon;
DROP POLICY IF EXISTS "demo anon read document_chunks" ON public.document_chunks;
CREATE POLICY "demo anon read document_chunks" ON public.document_chunks
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

GRANT SELECT ON public.faqs TO anon;
DROP POLICY IF EXISTS "demo anon read faqs" ON public.faqs;
CREATE POLICY "demo anon read faqs" ON public.faqs
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

GRANT SELECT ON public.knowledge_gaps TO anon;
DROP POLICY IF EXISTS "demo anon read knowledge_gaps" ON public.knowledge_gaps;
CREATE POLICY "demo anon read knowledge_gaps" ON public.knowledge_gaps
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

-- Academy
GRANT SELECT ON public.academy_departments   TO anon;
GRANT SELECT ON public.academy_learning_paths TO anon;
GRANT SELECT ON public.academy_chapters      TO anon;
GRANT SELECT ON public.academy_lessons       TO anon;
GRANT SELECT ON public.academy_enrollments   TO anon;
GRANT SELECT ON public.academy_lesson_progress TO anon;
GRANT SELECT ON public.academy_quiz_attempts TO anon;
GRANT SELECT ON public.academy_certificates  TO anon;
GRANT SELECT ON public.academy_settings      TO anon;

DROP POLICY IF EXISTS "demo anon read academy_departments" ON public.academy_departments;
CREATE POLICY "demo anon read academy_departments" ON public.academy_departments
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_learning_paths" ON public.academy_learning_paths;
CREATE POLICY "demo anon read academy_learning_paths" ON public.academy_learning_paths
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_chapters" ON public.academy_chapters;
CREATE POLICY "demo anon read academy_chapters" ON public.academy_chapters
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.academy_learning_paths p
      WHERE p.id = academy_chapters.path_id AND public.is_demo_company(p.company_id)
    )
  );

DROP POLICY IF EXISTS "demo anon read academy_lessons" ON public.academy_lessons;
CREATE POLICY "demo anon read academy_lessons" ON public.academy_lessons
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_enrollments" ON public.academy_enrollments;
CREATE POLICY "demo anon read academy_enrollments" ON public.academy_enrollments
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_lesson_progress" ON public.academy_lesson_progress;
CREATE POLICY "demo anon read academy_lesson_progress" ON public.academy_lesson_progress
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_quiz_attempts" ON public.academy_quiz_attempts;
CREATE POLICY "demo anon read academy_quiz_attempts" ON public.academy_quiz_attempts
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_certificates" ON public.academy_certificates;
CREATE POLICY "demo anon read academy_certificates" ON public.academy_certificates
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read academy_settings" ON public.academy_settings;
CREATE POLICY "demo anon read academy_settings" ON public.academy_settings
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

-- Chat + audit + audits
GRANT SELECT ON public.threads   TO anon;
GRANT SELECT ON public.messages  TO anon;
GRANT SELECT ON public.audit_log TO anon;
GRANT SELECT ON public.ai_audits TO anon;
GRANT SELECT ON public.notifications TO anon;

DROP POLICY IF EXISTS "demo anon read threads" ON public.threads;
CREATE POLICY "demo anon read threads" ON public.threads
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read messages" ON public.messages;
CREATE POLICY "demo anon read messages" ON public.messages
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.threads t
            WHERE t.id = messages.thread_id AND public.is_demo_company(t.company_id))
  );

DROP POLICY IF EXISTS "demo anon read audit_log" ON public.audit_log;
CREATE POLICY "demo anon read audit_log" ON public.audit_log
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read ai_audits" ON public.ai_audits;
CREATE POLICY "demo anon read ai_audits" ON public.ai_audits
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

DROP POLICY IF EXISTS "demo anon read notifications" ON public.notifications;
CREATE POLICY "demo anon read notifications" ON public.notifications
  FOR SELECT TO anon USING (public.is_demo_company(company_id));

-- 6. Nightly cleanup routine
CREATE OR REPLACE FUNCTION public.demo_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.demo_sessions WHERE expires_at < now();
  DELETE FROM public.messages   WHERE is_demo_ephemeral = true;
  DELETE FROM public.threads    WHERE is_demo_ephemeral = true;
  DELETE FROM public.audit_log  WHERE is_demo_ephemeral = true;
END $$;

-- Schedule via pg_cron (extension already installed on Supabase)
DO $$
BEGIN
  PERFORM cron.unschedule('demo_reset_nightly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('demo_reset_nightly', '0 3 * * *', $$SELECT public.demo_cleanup()$$);
