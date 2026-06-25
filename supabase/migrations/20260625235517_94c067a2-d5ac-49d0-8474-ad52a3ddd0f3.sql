
-- Knowledge Gaps lifecycle upgrade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Extend table
ALTER TABLE public.knowledge_gaps
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS source_thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS resolution_date timestamptz;

-- 2) Migrate legacy status values (open/assigned/closed) -> spec values (open/in_progress/resolved/ignored)
UPDATE public.knowledge_gaps SET status = 'in_progress' WHERE status = 'assigned';
UPDATE public.knowledge_gaps SET status = 'ignored'
  WHERE status = 'closed' AND (resolution = 'dismissed' OR resolution IS NULL);
UPDATE public.knowledge_gaps SET status = 'resolved'
  WHERE status = 'closed' AND resolution IN ('sop','faq');
UPDATE public.knowledge_gaps SET resolution_date = updated_at
  WHERE status = 'resolved' AND resolution_date IS NULL;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS kg_company_status_idx
  ON public.knowledge_gaps (company_id, status, last_seen DESC);
CREATE INDEX IF NOT EXISTS kg_question_trgm_idx
  ON public.knowledge_gaps USING gin (question_sample gin_trgm_ops);
CREATE INDEX IF NOT EXISTS kg_embedding_idx
  ON public.knowledge_gaps USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- 4) updated_at trigger
DROP TRIGGER IF EXISTS kg_touch_updated_at ON public.knowledge_gaps;
CREATE TRIGGER kg_touch_updated_at
  BEFORE UPDATE ON public.knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) RPC: find duplicate gap by semantic similarity (+ trigram fallback)
CREATE OR REPLACE FUNCTION public.match_knowledge_gap(
  _company_id uuid,
  _question text,
  _question_normalized text,
  _embedding vector,
  _threshold double precision DEFAULT 0.82
) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid;
BEGIN
  -- exact normalized match first (cheap)
  SELECT id INTO gid FROM public.knowledge_gaps
  WHERE company_id = _company_id
    AND question_normalized = _question_normalized
  LIMIT 1;
  IF gid IS NOT NULL THEN RETURN gid; END IF;

  -- semantic dedup using embedding
  IF _embedding IS NOT NULL THEN
    SELECT id INTO gid FROM public.knowledge_gaps
    WHERE company_id = _company_id
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> _embedding) >= _threshold
    ORDER BY embedding <=> _embedding
    LIMIT 1;
    IF gid IS NOT NULL THEN RETURN gid; END IF;
  END IF;

  -- trigram fallback
  IF _question IS NOT NULL AND length(_question) > 0 THEN
    SELECT id INTO gid FROM public.knowledge_gaps
    WHERE company_id = _company_id
      AND similarity(question_sample, _question) >= 0.55
    ORDER BY similarity(question_sample, _question) DESC
    LIMIT 1;
  END IF;
  RETURN gid;
END $$;

REVOKE EXECUTE ON FUNCTION public.match_knowledge_gap(uuid, text, text, vector, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_knowledge_gap(uuid, text, text, vector, double precision) TO authenticated, service_role;

-- 6) Auto-resolve open gaps when admins add a new SOP / FAQ that matches them.
CREATE OR REPLACE FUNCTION public.kg_auto_resolve_from_doc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE blob text;
BEGIN
  IF NOT COALESCE(NEW.is_active, true) THEN RETURN NEW; END IF;
  blob := concat_ws(' ', NEW.doc_code, NEW.title, NEW.section, NEW.category);
  IF blob IS NULL OR length(blob) < 3 THEN RETURN NEW; END IF;
  UPDATE public.knowledge_gaps g
     SET status = 'resolved',
         resolution = 'sop',
         resolved_document_id = NEW.id,
         resolution_date = now(),
         last_seen = now()
   WHERE g.company_id = NEW.company_id
     AND g.status IN ('open','in_progress')
     AND similarity(g.question_sample, blob) >= 0.45;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS kg_auto_resolve_doc_ins ON public.knowledge_documents;
CREATE TRIGGER kg_auto_resolve_doc_ins
  AFTER INSERT ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.kg_auto_resolve_from_doc();

DROP TRIGGER IF EXISTS kg_auto_resolve_doc_upd ON public.knowledge_documents;
CREATE TRIGGER kg_auto_resolve_doc_upd
  AFTER UPDATE OF is_active ON public.knowledge_documents
  FOR EACH ROW WHEN (NEW.is_active = true AND (OLD.is_active IS DISTINCT FROM NEW.is_active))
  EXECUTE FUNCTION public.kg_auto_resolve_from_doc();

CREATE OR REPLACE FUNCTION public.kg_auto_resolve_from_faq() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE blob text;
BEGIN
  blob := concat_ws(' ', NEW.question_en, NEW.question_de, NEW.answer_en, NEW.answer_de, NEW.category);
  IF blob IS NULL OR length(blob) < 3 THEN RETURN NEW; END IF;
  UPDATE public.knowledge_gaps g
     SET status = 'resolved',
         resolution = 'faq',
         resolved_faq_id = NEW.id,
         resolution_date = now(),
         last_seen = now()
   WHERE g.company_id = NEW.company_id
     AND g.status IN ('open','in_progress')
     AND similarity(g.question_sample, blob) >= 0.45;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS kg_auto_resolve_faq_ins ON public.faqs;
CREATE TRIGGER kg_auto_resolve_faq_ins
  AFTER INSERT ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.kg_auto_resolve_from_faq();
