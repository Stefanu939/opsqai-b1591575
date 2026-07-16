
CREATE POLICY "portal buckets: authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('portal-news-images','portal-download-modules'));

CREATE POLICY "portal buckets: staff insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('portal-news-images','portal-download-modules')
    AND (
      public.has_role(auth.uid(), 'platform_owner'::app_role)
      OR public.has_role(auth.uid(), 'platform_admin'::app_role)
    )
  );

CREATE POLICY "portal buckets: staff update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('portal-news-images','portal-download-modules')
    AND (
      public.has_role(auth.uid(), 'platform_owner'::app_role)
      OR public.has_role(auth.uid(), 'platform_admin'::app_role)
    )
  );

CREATE POLICY "portal buckets: staff delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('portal-news-images','portal-download-modules')
    AND (
      public.has_role(auth.uid(), 'platform_owner'::app_role)
      OR public.has_role(auth.uid(), 'platform_admin'::app_role)
    )
  );
