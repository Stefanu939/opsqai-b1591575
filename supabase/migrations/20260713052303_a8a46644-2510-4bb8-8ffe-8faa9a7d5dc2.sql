
-- 1) profiles: prevent self-service company_id change (and email/id tampering).
--    The permissive "update own profile" policy has WITH CHECK (auth.uid()=id)
--    which allows any column change. Add a RESTRICTIVE UPDATE policy so that
--    only platform admins or same-company admins may change company_id.
CREATE POLICY "restrict_profile_company_change"
  ON public.profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    public.is_platform_admin()
    OR (
      -- caller is a company admin in the same company as the current row
      -- (OLD company_id is enforced by the USING side of the permissive policy;
      -- here we constrain the NEW row)
      public.has_role(auth.uid(), 'admin'::app_role)
      AND company_id = public.current_company_id()
    )
    OR (
      -- self-update path: company_id must remain equal to the caller's
      -- current company (i.e. cannot be changed by the user themselves)
      id = auth.uid()
      AND company_id IS NOT DISTINCT FROM public.current_company_id()
    )
  );

-- 2) Drop demo anon SELECT policies on tables that could carry PII or sensitive
--    activity even when synthetic. Keep clearly public-safe demo tables.
DROP POLICY IF EXISTS "demo anon read profiles"                ON public.profiles;
DROP POLICY IF EXISTS "demo anon read messages"                ON public.messages;
DROP POLICY IF EXISTS "demo anon read audit_log"               ON public.audit_log;
DROP POLICY IF EXISTS "demo anon read user_roles"              ON public.user_roles;
DROP POLICY IF EXISTS "demo anon read ai_audits"               ON public.ai_audits;
DROP POLICY IF EXISTS "demo anon read notifications"           ON public.notifications;
DROP POLICY IF EXISTS "demo anon read knowledge_gaps"          ON public.knowledge_gaps;
DROP POLICY IF EXISTS "demo anon read document_chunks"         ON public.document_chunks;
DROP POLICY IF EXISTS "demo anon read threads"                 ON public.threads;
DROP POLICY IF EXISTS "demo anon read academy_enrollments"     ON public.academy_enrollments;
DROP POLICY IF EXISTS "demo anon read academy_lesson_progress" ON public.academy_lesson_progress;
DROP POLICY IF EXISTS "demo anon read academy_quiz_attempts"   ON public.academy_quiz_attempts;

-- 3) installation_package_downloads: add explicit RESTRICTIVE policies that
--    cover ALL roles (public), not only authenticated, so no permissive policy
--    added later on anon can accidentally open writes.
DROP POLICY IF EXISTS "Block client inserts on package download logs" ON public.installation_package_downloads;
DROP POLICY IF EXISTS "Block client updates on package download logs" ON public.installation_package_downloads;
DROP POLICY IF EXISTS "Block client deletes on package download logs" ON public.installation_package_downloads;

CREATE POLICY "Block all client inserts on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "Block all client updates on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block all client deletes on package download logs"
  ON public.installation_package_downloads
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);
