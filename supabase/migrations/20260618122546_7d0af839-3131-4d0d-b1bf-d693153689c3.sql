
-- 1) audit_log: remove weaker insert policy
DROP POLICY IF EXISTS "users insert own audit" ON public.audit_log;

-- 2) profiles: prevent users from self-inserting with arbitrary company_id.
-- Drop weak self-insert policy; keep admin-managed insert policy.
-- Profile rows for new signups are created by the handle_new_user() SECURITY DEFINER trigger,
-- which bypasses RLS, so removing self-insert does not break signup.
DROP POLICY IF EXISTS "insert own profile" ON public.profiles;

-- 3) storage: enforce company-scoped path prefix on knowledge-docs uploads/updates.
-- Convention: object name must start with "{company_id}/...".
DROP POLICY IF EXISTS "company admins upload kb files" ON storage.objects;
DROP POLICY IF EXISTS "company admins update kb files" ON storage.objects;
DROP POLICY IF EXISTS "company admins delete kb files" ON storage.objects;
DROP POLICY IF EXISTS "company members read kb files" ON storage.objects;

CREATE POLICY "company admins upload kb files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-docs'
  AND (
    public.is_platform_admin()
    OR (
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_leader'))
      AND (storage.foldername(name))[1] = public.current_company_id()::text
    )
  )
);

CREATE POLICY "company admins update kb files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-docs'
  AND (
    public.is_platform_admin()
    OR (
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_leader'))
      AND (storage.foldername(name))[1] = public.current_company_id()::text
    )
  )
)
WITH CHECK (
  bucket_id = 'knowledge-docs'
  AND (
    public.is_platform_admin()
    OR (
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_leader'))
      AND (storage.foldername(name))[1] = public.current_company_id()::text
    )
  )
);

CREATE POLICY "company admins delete kb files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-docs'
  AND (
    public.is_platform_admin()
    OR (
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_leader'))
      AND (storage.foldername(name))[1] = public.current_company_id()::text
    )
  )
);

CREATE POLICY "company members read kb files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'knowledge-docs'
  AND (
    public.is_platform_admin()
    OR (storage.foldername(name))[1] = public.current_company_id()::text
  )
);
