-- Visual understanding for SOP/FAQ (Phase 5) — Self-Hosted.
--
-- Embedded images extracted from uploaded knowledge documents during
-- processing (currently DOCX; other formats extract text only). Images are
-- stored via the storage provider (bucket `knowledge-images`); this table
-- keeps only the pointer + chunk context so grounded chat answers can cite
-- and render the relevant approved visual inline.

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

COMMENT ON TABLE public.knowledge_document_images IS
  'Embedded images extracted from knowledge documents, linked to their source chunk for grounded citation.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_document_images TO opsqai;
