-- Knowledge Base with pgvector support (Self-Hosted).
--
-- Single-tenant: there is no `public.companies` table on Self-Hosted
-- (that is a Cloud-only relic). `company_id` here is a plain UUID
-- filled by the app layer with `OPSQAI_INSTALL_ID`, matching the
-- convention already used by 0006/0007/0008/0009. No FK to companies.
--
-- pgvector 0.8.x (vector.dll + control/SQL) is bundled by the Windows
-- installer under vendor\pgsql\lib\ / share\extension\; `CREATE EXTENSION`
-- below activates it.
--
-- Embeddings default to 1536 dims (openai/text-embedding-3-small via the
-- Lovable AI Gateway), which fits pgvector's HNSW cap directly with no
-- halfvec cast.


CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL,
    title               text NOT NULL,
    category            text NOT NULL DEFAULT 'general',
    doc_code            text,
    file_path           text,
    file_type           text,
    content_text        text NOT NULL DEFAULT '',
    status              text NOT NULL DEFAULT 'ready',
    error               text,
    chunk_count         integer NOT NULL DEFAULT 0,
    version             integer NOT NULL DEFAULT 1,
    is_active           boolean NOT NULL DEFAULT true,
    parent_document_id  uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
    change_notes        text,
    replaced_at         timestamptz,
    section             text,
    page                integer,
    department_id       uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    is_critical         boolean NOT NULL DEFAULT false,
    knowledge_type      text NOT NULL DEFAULT 'company',
    system_slug         text,
    uploaded_by         uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_company_idx
    ON public.knowledge_documents (company_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_active_idx
    ON public.knowledge_documents (company_id, is_active);
CREATE INDEX IF NOT EXISTS knowledge_documents_doc_code_idx
    ON public.knowledge_documents (company_id, doc_code)
    WHERE doc_code IS NOT NULL;

CREATE TRIGGER trg_knowledge_documents_updated_at
    BEFORE UPDATE ON public.knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chunk_index  integer NOT NULL,
    content      text NOT NULL,
    token_count  integer,
    embedding    vector(1536),
    section      text,
    page         integer,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chunks_document_idx
    ON public.document_chunks (document_id);
CREATE INDEX IF NOT EXISTS document_chunks_company_idx
    ON public.document_chunks (company_id);
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
    ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

-- Similarity search helper used by RAG/chat surfaces.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    p_company_id  uuid,
    p_query       vector(1536),
    p_limit       integer DEFAULT 8
)
RETURNS TABLE (
    document_id  uuid,
    chunk_index  integer,
    content      text,
    similarity   double precision
)
LANGUAGE sql STABLE
AS $$
    SELECT c.document_id,
           c.chunk_index,
           c.content,
           1 - (c.embedding <=> p_query) AS similarity
      FROM public.document_chunks c
      JOIN public.knowledge_documents d ON d.id = c.document_id
     WHERE c.company_id = p_company_id
       AND d.is_active
     ORDER BY c.embedding <=> p_query
     LIMIT p_limit;
$$;
