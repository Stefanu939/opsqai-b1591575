
ALTER TABLE public.customer_documents
  ADD COLUMN IF NOT EXISTS category text;

UPDATE public.customer_documents SET category = CASE
  WHEN metadata->>'category' IN ('Customer Success') THEN 'Implementation'
  WHEN metadata->>'category' IN ('Legal') THEN 'Contracts'
  WHEN metadata->>'category' IN ('Compliance','Security','Technical','Commercial','Training','Marketing','Internal','Generated','Archive','Contracts','Implementation')
    THEN metadata->>'category'
  ELSE 'Generated'
END
WHERE category IS NULL;

ALTER TABLE public.customer_documents
  ALTER COLUMN category SET DEFAULT 'Generated',
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE public.customer_documents DROP CONSTRAINT IF EXISTS customer_documents_status_check;
ALTER TABLE public.customer_documents
  ADD CONSTRAINT customer_documents_status_check
  CHECK (status IN ('draft','ready','review','approved','sent','archived'));

ALTER TABLE public.customer_documents DROP CONSTRAINT IF EXISTS customer_documents_category_check;
ALTER TABLE public.customer_documents
  ADD CONSTRAINT customer_documents_category_check
  CHECK (category IN ('Commercial','Contracts','Implementation','Training','Security','Compliance','Technical','Marketing','Internal','Generated','Archive'));

CREATE INDEX IF NOT EXISTS idx_customer_documents_company_category
  ON public.customer_documents (company_id, category, updated_at DESC);
