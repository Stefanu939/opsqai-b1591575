-- 1) Knowledge images: writes must stay inside the admin's own company scope.
DROP POLICY IF EXISTS "admins write kb images" ON storage.objects;

CREATE POLICY "admins write kb images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (
    is_platform_admin()
    OR (current_company_id() IS NOT NULL AND name LIKE current_company_id()::text || '/%')
    OR EXISTS (
      SELECT 1 FROM public.knowledge_document_images i
      WHERE i.storage_path = storage.objects.name
        AND i.company_id = current_company_id()
    )
  )
);

CREATE POLICY "admins update kb images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (
    is_platform_admin()
    OR (current_company_id() IS NOT NULL AND name LIKE current_company_id()::text || '/%')
    OR EXISTS (
      SELECT 1 FROM public.knowledge_document_images i
      WHERE i.storage_path = storage.objects.name
        AND i.company_id = current_company_id()
    )
  )
)
WITH CHECK (
  bucket_id = 'knowledge-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (
    is_platform_admin()
    OR (current_company_id() IS NOT NULL AND name LIKE current_company_id()::text || '/%')
    OR EXISTS (
      SELECT 1 FROM public.knowledge_document_images i
      WHERE i.storage_path = storage.objects.name
        AND i.company_id = current_company_id()
    )
  )
);

CREATE POLICY "admins delete kb images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (
    is_platform_admin()
    OR (current_company_id() IS NOT NULL AND name LIKE current_company_id()::text || '/%')
    OR EXISTS (
      SELECT 1 FROM public.knowledge_document_images i
      WHERE i.storage_path = storage.objects.name
        AND i.company_id = current_company_id()
    )
  )
);

-- 2) Portal buckets: only published items are readable by regular authenticated users.
DROP POLICY IF EXISTS "portal buckets: authenticated read" ON storage.objects;

CREATE POLICY "portal buckets: authenticated read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = ANY (ARRAY['portal-news-images'::text, 'portal-download-modules'::text])
  AND (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_admin'::app_role)
    OR (
      bucket_id = 'portal-download-modules'
      AND EXISTS (
        SELECT 1 FROM public.portal_download_modules d
        WHERE d.status = 'published'
          AND d.file_url LIKE '%' || storage.objects.name
      )
    )
    OR (
      bucket_id = 'portal-news-images'
      AND EXISTS (
        SELECT 1 FROM public.portal_announcements a
        WHERE a.status = 'published'
          AND a.cover_image_url LIKE '%' || storage.objects.name
      )
    )
  )
);