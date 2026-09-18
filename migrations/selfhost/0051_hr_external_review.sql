-- 0051_hr_external_review.sql
-- OPSQAI HR — external (outside counsel) verification of generated documents.
--
--  * a document can be marked as verified by an external lawyer / consultant,
--    with name, firm, date, optional reference and an uploaded opinion; that
--    counts as the verification step, so approval is no longer blocked;
--  * a time-limited review link lets a person outside the company open exactly
--    one document and send back "verified" or "changes requested" — no account,
--    no other access.

BEGIN;

ALTER TABLE public.hr_documents
  ADD COLUMN IF NOT EXISTS external_reviewer_name text,
  ADD COLUMN IF NOT EXISTS external_reviewer_org text,
  ADD COLUMN IF NOT EXISTS external_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS external_evidence_id uuid;

CREATE TABLE IF NOT EXISTS public.hr_document_review_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.hr_documents(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  reviewer_name text,
  reviewer_org text,
  expires_at timestamptz NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  used_at timestamptz,
  verdict text,
  notes text,
  revoked_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS hr_document_review_links_doc_idx
  ON public.hr_document_review_links(company_id, document_id, created_at DESC);

INSERT INTO public.permissions (key, label, category, description)
VALUES ('hr.legal_review','Verify HR documents','HR','Record the verification of a generated HR document, internally or by external counsel')
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description;

COMMIT;
