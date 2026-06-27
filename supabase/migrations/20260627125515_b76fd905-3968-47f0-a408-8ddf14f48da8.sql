
-- Storage policies for support-attachments. Path layout: {company_id}/{conversation_id}/{file}
CREATE POLICY support_attach_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(),'platform_admin')
      OR public.has_role(auth.uid(),'platform_owner')
      OR (split_part(name,'/',1))::uuid = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY support_attach_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(),'platform_admin')
      OR public.has_role(auth.uid(),'platform_owner')
      OR (
        (split_part(name,'/',1))::uuid = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (
          public.has_role(auth.uid(),'workspace_owner')
          OR public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'manager')
        )
      )
    )
  );

CREATE POLICY support_attach_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(),'platform_admin')
      OR public.has_role(auth.uid(),'platform_owner')
      OR owner = auth.uid()
    )
  );
