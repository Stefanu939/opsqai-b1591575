-- Knowledge lifecycle metadata (Self-Hosted).
--
-- Adds the freshness/ownership fields the Knowledge library and the AI
-- Audit use to reason about document age:
--   * information_updated_at — when the *content* was last refreshed
--     (distinct from updated_at, which any row touch bumps)
--   * last_reviewed_at       — last human review sign-off
--   * review_interval_days   — per-document review cadence override
--   * owner_id               — accountable owner (profile id)
--
-- All nullable / defaulted so existing rows stay valid.

ALTER TABLE public.knowledge_documents
    ADD COLUMN IF NOT EXISTS information_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_reviewed_at       timestamptz,
    ADD COLUMN IF NOT EXISTS review_interval_days   integer,
    ADD COLUMN IF NOT EXISTS owner_id               uuid;

UPDATE public.knowledge_documents
   SET information_updated_at = COALESCE(information_updated_at, created_at);

CREATE INDEX IF NOT EXISTS knowledge_documents_information_updated_idx
    ON public.knowledge_documents (company_id, information_updated_at DESC);
