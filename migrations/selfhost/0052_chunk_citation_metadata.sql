-- Chunk-level citation metadata (Self-Hosted).
--
-- `document_chunks.section` / `page` already existed but were never written;
-- ingest now fills them from real page boundaries, and `page_end` records a
-- page range for chunks that straddle a page break. Citations are composed
-- from these columns, never from model output.

ALTER TABLE public.document_chunks
    ADD COLUMN IF NOT EXISTS page_end integer;

CREATE INDEX IF NOT EXISTS document_chunks_doc_index_idx
    ON public.document_chunks (document_id, chunk_index);
