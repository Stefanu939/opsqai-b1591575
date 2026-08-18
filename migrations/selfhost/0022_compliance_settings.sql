-- Country & compliance intelligence — org-level settings (Phase 3).
--
-- Single-tenant Self-Hosted: one row per synthetic company_id (the same
-- tenant key used by knowledge_documents/faqs — see 0010_kb_pgvector.sql).
-- Stores the jurisdiction, primary language, the subset of frameworks from
-- compliance-registry.ts the org has selected, and review-interval-days
-- overrides (per framework key, plus "default"). All advisory data — this
-- table never asserts legal compliance, only records what the org opted in.

CREATE TABLE IF NOT EXISTS public.compliance_settings (
    company_id            uuid PRIMARY KEY,
    country_code          text NOT NULL DEFAULT 'OTHER_EU',
    primary_language      text NOT NULL DEFAULT 'en',
    framework_keys        text[] NOT NULL DEFAULT ARRAY[]::text[],
    review_interval_days  jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by            uuid,
    updated_at            timestamptz NOT NULL DEFAULT now(),
    created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.compliance_settings IS
  'Advisory-only org compliance configuration (country, language, selected frameworks, review cadence). Never asserts legal compliance.';
