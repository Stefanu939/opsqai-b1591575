ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS page integer,
  ADD COLUMN IF NOT EXISTS page_end integer;

CREATE INDEX IF NOT EXISTS document_chunks_doc_index_idx
  ON public.document_chunks (document_id, chunk_index);