-- Visual understanding for SOP/FAQ (Phase 5) — Cloud.
--
-- Embedded images extracted from uploaded knowledge documents during
-- processing. Images live in Supabase Storage (bucket `knowledge-images`);
-- this table keeps the pointer + chunk context so grounded chat answers can
-- cite and render the relevant approved visual inline. Company-scoped RLS
-- mirrors knowledge_documents.

CREATE TABLE IF NOT EXISTS public.knowledge_document_images (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    company_id    uuid NOT NULL,
    chunk_index   integer,
    storage_path  text NOT NULL,
    mime_type     text NOT NULL,
    caption       text,
    width         integer,
    height        integer,
    approved      boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_document_images_document_idx
    ON public.knowledge_document_images (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_document_images_company_idx
    ON public.knowledge_document_images (company_id);

ALTER TABLE public.knowledge_document_images ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_document_images TO authenticated;
GRANT ALL ON public.knowledge_document_images TO service_role;

DROP POLICY IF EXISTS "company members read document images" ON public.knowledge_document_images;
CREATE POLICY "company members read document images"
  ON public.knowledge_document_images FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR company_id = public.current_company_id()
  );

DROP POLICY IF EXISTS "admins manage document images" ON public.knowledge_document_images;
CREATE POLICY "admins manage document images"
  ON public.knowledge_document_images FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR (public.has_role(auth.uid(), 'admin') AND company_id = public.current_company_id())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (public.has_role(auth.uid(), 'admin') AND company_id = public.current_company_id())
  );

-- Storage policies for the knowledge-images bucket (company-scoped via JOIN,
-- mirrors knowledge-docs).
DROP POLICY IF EXISTS "company members read kb images" ON storage.objects;
CREATE POLICY "company members read kb images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-images'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.knowledge_document_images i
        WHERE i.storage_path = storage.objects.name
          AND i.company_id = public.current_company_id()
      )
    )
  );

DROP POLICY IF EXISTS "admins write kb images" ON storage.objects;
CREATE POLICY "admins write kb images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'knowledge-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'knowledge-images' AND public.has_role(auth.uid(), 'admin'));

-- Buckets `knowledge-images` and `chat-images` are created via the Storage API
-- (SQL writes to storage.buckets are not permitted).

DROP POLICY IF EXISTS "users read own chat images" ON storage.objects;
CREATE POLICY "users read own chat images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users write own chat images" ON storage.objects;
CREATE POLICY "users write own chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users delete own chat images" ON storage.objects;
CREATE POLICY "users delete own chat images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
