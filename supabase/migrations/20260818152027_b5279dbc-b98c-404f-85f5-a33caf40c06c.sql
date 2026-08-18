ALTER TABLE public.knowledge_documents
    ADD COLUMN IF NOT EXISTS information_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_reviewed_at       timestamptz,
    ADD COLUMN IF NOT EXISTS review_interval_days   integer,
    ADD COLUMN IF NOT EXISTS owner_id               uuid;

UPDATE public.knowledge_documents
   SET information_updated_at = COALESCE(information_updated_at, created_at);

CREATE INDEX IF NOT EXISTS knowledge_documents_information_updated_idx
    ON public.knowledge_documents (company_id, information_updated_at DESC);