-- Dynamic embedding dimension (Self-Hosted).
--
-- The local Ollama embedding model's ACTUAL returned vector length is the
-- source of truth for pgvector. 0010 created `document_chunks.embedding` as
-- vector(1536) because the Cloud Gateway model was 1536; a local install
-- using bge-m3 returns 1024, and a future model may return something else.
--
-- Nothing in the database layer may hard-code the dimension from here on.
-- The installer probes the model, then calls
-- `public.kb_apply_embedding_dim(<probed>)`, which:
--   * records the pinned dimension in `public.ai_engine_config`
--   * recreates the embedding column, HNSW index and the similarity
--     function at exactly that size
--   * REFUSES to change the dimension when embedded chunks already exist,
--     unless an explicit re-embedding is requested (`_force := true`, which
--     purges the vectors and marks the documents for re-ingestion).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_engine_config (
    key        text PRIMARY KEY,
    value      text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Returns the pinned dimension, or the live column dimension when nothing
-- has been pinned yet (fresh upgrade from 0010).
CREATE OR REPLACE FUNCTION public.kb_embedding_dim()
RETURNS integer
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_pinned text;
    v_live   integer;
BEGIN
    SELECT value INTO v_pinned FROM public.ai_engine_config WHERE key = 'embedding_dim';
    IF v_pinned IS NOT NULL AND v_pinned ~ '^[0-9]+$' THEN
        RETURN v_pinned::integer;
    END IF;

    SELECT a.atttypmod
      INTO v_live
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'document_chunks'
       AND a.attname = 'embedding';

    RETURN v_live;
END;
$$;

CREATE OR REPLACE FUNCTION public.kb_embedded_chunk_count()
RETURNS bigint
LANGUAGE sql STABLE
AS $$
    SELECT count(*) FROM public.document_chunks WHERE embedding IS NOT NULL;
$$;

-- Applies a probed embedding dimension to the vector column, its index and
-- the retrieval function. Idempotent when the dimension already matches.
CREATE OR REPLACE FUNCTION public.kb_apply_embedding_dim(
    _dim   integer,
    _force boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_current   integer;
    v_embedded  bigint;
BEGIN
    IF _dim IS NULL OR _dim < 1 OR _dim > 16000 THEN
        RAISE EXCEPTION 'invalid embedding dimension: %', _dim
            USING ERRCODE = '22023';
    END IF;

    SELECT a.atttypmod
      INTO v_current
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'document_chunks'
       AND a.attname = 'embedding';

    SELECT public.kb_embedded_chunk_count() INTO v_embedded;

    IF v_current IS DISTINCT FROM _dim AND v_embedded > 0 AND NOT _force THEN
        RAISE EXCEPTION
            'embedding dimension change refused: % chunk(s) are embedded at % dimensions, requested %. Run an explicit re-embedding to change models.',
            v_embedded, v_current, _dim
            USING ERRCODE = 'P0001';
    END IF;

    IF v_current IS DISTINCT FROM _dim THEN
        -- Vectors of a different length are not comparable: drop them and
        -- mark their documents so the app re-ingests them.
        IF v_embedded > 0 THEN
            UPDATE public.knowledge_documents d
               SET status = 'pending', chunk_count = 0, updated_at = now()
             WHERE EXISTS (SELECT 1 FROM public.document_chunks c WHERE c.document_id = d.id);
            DELETE FROM public.document_chunks;
        END IF;

        EXECUTE 'DROP INDEX IF EXISTS public.document_chunks_embedding_hnsw';
        EXECUTE format(
            'ALTER TABLE public.document_chunks ALTER COLUMN embedding TYPE vector(%s) USING NULL',
            _dim);
        EXECUTE format(
            'CREATE INDEX document_chunks_embedding_hnsw ON public.document_chunks USING hnsw (embedding vector_cosine_ops)');
    END IF;

    -- Recreate the retrieval functions at the exact dimension.
    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
            p_company_id uuid,
            p_query      vector(%1$s),
            p_limit      integer DEFAULT 8
        )
        RETURNS TABLE (document_id uuid, chunk_index integer, content text, similarity double precision)
        LANGUAGE sql STABLE
        AS $body$
            SELECT c.document_id, c.chunk_index, c.content,
                   1 - (c.embedding <=> p_query) AS similarity
              FROM public.document_chunks c
              JOIN public.knowledge_documents d ON d.id = c.document_id
             WHERE c.company_id = p_company_id
               AND d.is_active
               AND c.embedding IS NOT NULL
             ORDER BY c.embedding <=> p_query
             LIMIT p_limit;
        $body$;
    $fn$, _dim);

    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION public.match_document_chunks_for_company(
            query_embedding vector(%1$s),
            match_count     integer DEFAULT 8,
            min_similarity  double precision DEFAULT 0.12,
            _company_id     uuid DEFAULT NULL
        )
        RETURNS TABLE (
            chunk_id     uuid,
            document_id  uuid,
            doc_title    text,
            doc_code     text,
            doc_category text,
            chunk_index  integer,
            content      text,
            similarity   double precision
        )
        LANGUAGE sql STABLE
        AS $body$
            SELECT c.id, c.document_id, d.title, d.doc_code, d.category,
                   c.chunk_index, c.content,
                   1 - (c.embedding <=> query_embedding) AS similarity
              FROM public.document_chunks c
              JOIN public.knowledge_documents d ON d.id = c.document_id
             WHERE d.is_active
               AND c.embedding IS NOT NULL
               AND (_company_id IS NULL OR c.company_id = _company_id)
               AND 1 - (c.embedding <=> query_embedding) >= min_similarity
             ORDER BY c.embedding <=> query_embedding
             LIMIT match_count;
        $body$;
    $fn$, _dim);

    INSERT INTO public.ai_engine_config (key, value, updated_at)
         VALUES ('embedding_dim', _dim::text, now())
    ON CONFLICT (key) DO UPDATE
        SET value = excluded.value, updated_at = now();

    RETURN _dim;
END;
$$;

-- Bring the existing 1536-dim install up to the new shape without changing
-- its dimension (no-op when the column already matches what is pinned).
DO $$
DECLARE
    v_dim integer;
BEGIN
    SELECT public.kb_embedding_dim() INTO v_dim;
    IF v_dim IS NOT NULL AND v_dim > 0 THEN
        PERFORM public.kb_apply_embedding_dim(v_dim, false);
    END IF;
END;
$$;
