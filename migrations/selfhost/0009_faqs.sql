-- Wave C.3 — FAQs table for Self-Hosted.
--
-- Mirrors the Cloud schema (columns question_de/en, answer_de/en, category,
-- optional company_id). No RLS: Self-Hosted enforces tenancy at the
-- application layer via IFaqRepository + the requireAuth middleware.

BEGIN;

CREATE TABLE IF NOT EXISTS public.faqs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID,
  question_de  TEXT NOT NULL,
  question_en  TEXT NOT NULL,
  answer_de    TEXT NOT NULL,
  answer_en    TEXT NOT NULL,
  category     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faqs_company_idx ON public.faqs (company_id);
CREATE INDEX IF NOT EXISTS faqs_category_idx ON public.faqs (category);

-- Trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.faqs_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faqs_touch_updated_at ON public.faqs;
CREATE TRIGGER faqs_touch_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.faqs_touch_updated_at();

COMMIT;
