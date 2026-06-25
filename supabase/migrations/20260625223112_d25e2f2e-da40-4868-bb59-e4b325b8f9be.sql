
-- ============================================================
-- Sprint 2 — Enterprise Knowledge Management
-- ============================================================

-- ---------- 1. SOP VERSIONING ----------
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_notes text,
  ADD COLUMN IF NOT EXISTS replaced_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS page int,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_documents_active_code_uidx
  ON public.knowledge_documents (company_id, doc_code)
  WHERE is_active AND doc_code IS NOT NULL;

DROP TRIGGER IF EXISTS trg_knowledge_documents_touch ON public.knowledge_documents;
CREATE TRIGGER trg_knowledge_documents_touch
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- 2. CHUNK METADATA ----------
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS page int;

-- ---------- 3. COMPANIES: confidence threshold ----------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS min_confidence numeric(4,3) NOT NULL DEFAULT 0.55;

-- ---------- 4. MESSAGES: confidence ----------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS confidence numeric(4,3);

-- ---------- 5. DEPARTMENTS: escalation fields ----------
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS shift_pattern text;

-- ---------- 6. RETRIEVAL: prefer active versions ----------
CREATE OR REPLACE FUNCTION public.match_document_chunks_for_company(
  query_embedding vector,
  match_count integer DEFAULT 6,
  min_similarity double precision DEFAULT 0.3,
  _company_id uuid DEFAULT NULL::uuid
) RETURNS TABLE(
  chunk_id uuid, document_id uuid, doc_title text, doc_code text,
  doc_category text, chunk_index integer, content text, similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.document_id, d.title, d.doc_code, d.category, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.is_active
    AND c.company_id = COALESCE(_company_id, public.current_company_id())
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks_for_company(vector, integer, double precision, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks_for_company(vector, integer, double precision, uuid) TO authenticated, service_role;

-- ---------- 7. KNOWLEDGE GAPS ----------
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_normalized text NOT NULL,
  question_sample text NOT NULL,
  occurrences int NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','closed')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text CHECK (resolution IN ('sop','faq','dismissed')),
  resolved_document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  resolved_faq_id uuid REFERENCES public.faqs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, question_normalized)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_gaps TO authenticated;
GRANT ALL ON public.knowledge_gaps TO service_role;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kg_select" ON public.knowledge_gaps FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "kg_insert" ON public.knowledge_gaps FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "kg_update" ON public.knowledge_gaps FOR UPDATE TO authenticated
  USING ((company_id = public.current_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))) OR public.is_platform_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "kg_delete" ON public.knowledge_gaps FOR DELETE TO authenticated
  USING ((company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_platform_admin());

CREATE TRIGGER trg_knowledge_gaps_touch BEFORE UPDATE ON public.knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- 8. MESSAGE FEEDBACK ----------
CREATE TABLE IF NOT EXISTS public.message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_feedback TO authenticated;
GRANT ALL ON public.message_feedback TO service_role;
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_select" ON public.message_feedback FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "mf_insert" ON public.message_feedback FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY "mf_update" ON public.message_feedback FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "mf_delete" ON public.message_feedback FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_message_feedback_touch BEFORE UPDATE ON public.message_feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- 9. SOP ACKNOWLEDGEMENTS ----------
CREATE TABLE IF NOT EXISTS public.sop_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  document_version int NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, document_version, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.sop_acknowledgements TO authenticated;
GRANT ALL ON public.sop_acknowledgements TO service_role;
ALTER TABLE public.sop_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_select" ON public.sop_acknowledgements FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "sa_insert" ON public.sop_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY "sa_delete" ON public.sop_acknowledgements FOR DELETE TO authenticated
  USING ((company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin')) OR public.is_platform_admin());

-- ---------- 10. NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sop_outdated','faq_outdated','new_gap','low_confidence','quarterly_report','sop_critical')),
  title text NOT NULL,
  body text,
  link text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, read_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ---------- 11. AUTOMATION (pg_cron) ----------
-- Nightly outdated-knowledge sweep (3am UTC)
CREATE OR REPLACE FUNCTION public.cron_mark_outdated_knowledge()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  cutoff timestamptz := now() - interval '6 months';
BEGIN
  -- Outdated SOPs: notify admins+managers of that company once per doc per quarter.
  INSERT INTO public.notifications (company_id, user_id, kind, title, body, link, payload)
  SELECT d.company_id, ur.user_id, 'sop_outdated',
         'SOP needs review: ' || d.title,
         'This SOP has not been updated in over 6 months.',
         '/app/knowledge',
         jsonb_build_object('document_id', d.id, 'doc_code', d.doc_code)
  FROM public.knowledge_documents d
  JOIN public.user_roles ur
    ON ur.company_id = d.company_id
   AND ur.role IN ('admin','manager')
  WHERE d.is_active
    AND d.updated_at < cutoff
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = ur.user_id
        AND n.kind = 'sop_outdated'
        AND (n.payload->>'document_id')::uuid = d.id
        AND n.created_at > now() - interval '90 days'
    );

  INSERT INTO public.notifications (company_id, user_id, kind, title, body, link, payload)
  SELECT f.company_id, ur.user_id, 'faq_outdated',
         'FAQ needs review: ' || f.question,
         'This FAQ has not been updated in over 6 months.',
         '/app/faq',
         jsonb_build_object('faq_id', f.id)
  FROM public.faqs f
  JOIN public.user_roles ur
    ON ur.company_id = f.company_id
   AND ur.role IN ('admin','manager')
  WHERE f.updated_at < cutoff
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = ur.user_id
        AND n.kind = 'faq_outdated'
        AND (n.payload->>'faq_id')::uuid = f.id
        AND n.created_at > now() - interval '90 days'
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cron_mark_outdated_knowledge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_mark_outdated_knowledge() TO service_role;

-- Quarterly knowledge report (1st of Jan/Apr/Jul/Oct, 6am UTC)
CREATE OR REPLACE FUNCTION public.cron_quarterly_knowledge_report()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (company_id, user_id, kind, title, body, link, payload)
  SELECT c.id, ur.user_id, 'quarterly_report',
         'Quarterly knowledge report ready',
         'Your company knowledge analytics snapshot for the last quarter is ready.',
         '/app/admin/analytics',
         jsonb_build_object('quarter', to_char(now() - interval '1 day', 'YYYY-"Q"Q'))
  FROM public.companies c
  JOIN public.user_roles ur
    ON ur.company_id = c.id
   AND ur.role IN ('admin','manager');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cron_quarterly_knowledge_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_quarterly_knowledge_report() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('opsqai_outdated_knowledge') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='opsqai_outdated_knowledge');
    PERFORM cron.unschedule('opsqai_quarterly_report') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='opsqai_quarterly_report');
    PERFORM cron.schedule('opsqai_outdated_knowledge', '0 3 * * *', $cron$SELECT public.cron_mark_outdated_knowledge();$cron$);
    PERFORM cron.schedule('opsqai_quarterly_report',   '0 6 1 1,4,7,10 *', $cron$SELECT public.cron_quarterly_knowledge_report();$cron$);
  END IF;
END $$;
