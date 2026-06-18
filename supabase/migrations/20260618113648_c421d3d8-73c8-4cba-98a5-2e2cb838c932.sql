
-- 1. Drop cross-tenant legacy policies
DROP POLICY IF EXISTS "auth read kb" ON public.knowledge_documents;
DROP POLICY IF EXISTS "admins manage kb" ON public.knowledge_documents;
DROP POLICY IF EXISTS "auth read faqs" ON public.faqs;
DROP POLICY IF EXISTS "team leaders insert faqs" ON public.faqs;
DROP POLICY IF EXISTS "auth read departments" ON public.departments;
DROP POLICY IF EXISTS "auth read chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "manage own threads" ON public.threads;
DROP POLICY IF EXISTS "manage own messages" ON public.messages;
DROP POLICY IF EXISTS "admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;

-- 2. Tighten has_role to be company-scoped (platform_admin remains global)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        role = 'platform_admin'
        OR company_id IS NOT DISTINCT FROM public.current_company_id()
      )
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Tighten profile insert: company admins can only insert profiles into their own company
DROP POLICY IF EXISTS "platform admins insert profiles" ON public.profiles;
CREATE POLICY "platform or company admins insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (has_role(auth.uid(), 'admin') AND company_id = public.current_company_id())
  );

-- 4. Rewrite storage policies for knowledge-docs to enforce company scope via JOIN
DROP POLICY IF EXISTS "auth read kb files" ON storage.objects;
DROP POLICY IF EXISTS "admins upload kb files" ON storage.objects;
DROP POLICY IF EXISTS "admins update knowledge-docs" ON storage.objects;
DROP POLICY IF EXISTS "admins delete kb files" ON storage.objects;

CREATE POLICY "company members read kb files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-docs'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.knowledge_documents d
        WHERE d.file_path = storage.objects.name
          AND d.company_id = public.current_company_id()
      )
    )
  );

CREATE POLICY "company admins upload kb files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-docs'
    AND (
      public.is_platform_admin()
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "company admins update kb files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'knowledge-docs'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.knowledge_documents d
        WHERE d.file_path = storage.objects.name
          AND d.company_id = public.current_company_id()
          AND has_role(auth.uid(), 'admin')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'knowledge-docs'
    AND (
      public.is_platform_admin()
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "company admins delete kb files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-docs'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.knowledge_documents d
        WHERE d.file_path = storage.objects.name
          AND d.company_id = public.current_company_id()
          AND has_role(auth.uid(), 'admin')
      )
    )
  );
