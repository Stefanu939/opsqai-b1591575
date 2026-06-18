
-- Drop the overly broad policy. The company-scoped policy already grants
-- admins/managers access within their own company.
DROP POLICY IF EXISTS "admins view all audit" ON public.audit_log;

-- Tighten storage read policy: require a matching knowledge_documents row.
DROP POLICY IF EXISTS "company members read kb files" ON storage.objects;
CREATE POLICY "company members read kb files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'knowledge-docs'
    AND EXISTS (
      SELECT 1 FROM public.knowledge_documents d
      WHERE d.file_path = storage.objects.name
        AND (d.company_id = public.current_company_id() OR public.is_platform_admin())
    )
  );
