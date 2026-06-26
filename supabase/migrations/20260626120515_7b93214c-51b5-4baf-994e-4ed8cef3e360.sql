
CREATE TABLE IF NOT EXISTS public.ai_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  score numeric NOT NULL DEFAULT 0,
  maturity text NOT NULL DEFAULT 'unknown',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_path text,
  passed integer NOT NULL DEFAULT 0,
  warnings integer NOT NULL DEFAULT 0,
  critical integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_audits TO authenticated;
GRANT ALL ON public.ai_audits TO service_role;
ALTER TABLE public.ai_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company members view ai_audits" ON public.ai_audits;
CREATE POLICY "company members view ai_audits" ON public.ai_audits FOR SELECT TO authenticated
  USING (company_id = current_company_id() OR is_platform_admin());
DROP POLICY IF EXISTS "managers insert ai_audits" ON public.ai_audits;
CREATE POLICY "managers insert ai_audits" ON public.ai_audits FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR is_platform_admin()));
CREATE INDEX IF NOT EXISTS ai_audits_company_idx ON public.ai_audits(company_id, created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dashboard_layout jsonb;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind = ANY (ARRAY[
    'sop_outdated','faq_outdated','new_gap','low_confidence','quarterly_report',
    'sop_critical','sop_approved','audit_completed','doc_review','template_published',
    'critical_sop_missing','ai_sop_generated','workspace_audit_ready'
  ]));

CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'questionsAnswered', (SELECT count(*) FROM audit_log WHERE company_id=p_company),
    'questions30d', (SELECT count(*) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'questionsToday', (SELECT count(*) FROM audit_log WHERE company_id=p_company AND created_at::date = current_date),
    'avgConfidence', COALESCE((
      SELECT round(avg((m.metadata->>'confidence')::numeric)::numeric, 2)
      FROM messages m JOIN threads t ON t.id=m.thread_id
      WHERE t.company_id=p_company AND m.role='assistant' AND (m.metadata->>'confidence') IS NOT NULL
        AND m.created_at > now() - interval '30 days'
    ), 0),
    'openGaps', (SELECT count(*) FROM knowledge_gaps WHERE company_id=p_company AND status='open'),
    'criticalSops', (SELECT count(*) FROM knowledge_documents WHERE company_id=p_company AND is_critical AND is_active),
    'documents', (SELECT count(*) FROM knowledge_documents WHERE company_id=p_company AND is_active),
    'faqs', (SELECT count(*) FROM faqs WHERE company_id=p_company),
    'templates', 0,
    'aiAudits', (SELECT count(*) FROM ai_audits WHERE company_id=p_company),
    'auditEvents', (SELECT count(*) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'activeUsers', (SELECT count(DISTINCT user_id) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'workspaces', (SELECT count(*) FROM workspace_sessions WHERE company_id=p_company)
  ) INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_kpis(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_kpis(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_health(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_docs int; v_critical int; v_gaps int; v_conf numeric; v_audit_score numeric; v_faqs int; v_score numeric;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_docs FROM knowledge_documents WHERE company_id=p_company AND is_active;
  SELECT count(*) INTO v_critical FROM knowledge_documents WHERE company_id=p_company AND is_critical AND is_active;
  SELECT count(*) INTO v_gaps FROM knowledge_gaps WHERE company_id=p_company AND status='open';
  SELECT COALESCE(avg((m.metadata->>'confidence')::numeric),0.7) INTO v_conf
    FROM messages m JOIN threads t ON t.id=m.thread_id
    WHERE t.company_id=p_company AND m.role='assistant' AND (m.metadata->>'confidence') IS NOT NULL
      AND m.created_at > now() - interval '30 days';
  SELECT count(*) INTO v_faqs FROM faqs WHERE company_id=p_company;
  SELECT COALESCE((SELECT score FROM ai_audits WHERE company_id=p_company ORDER BY created_at DESC LIMIT 1),70) INTO v_audit_score;
  v_score := LEAST(100, v_docs*5)*0.20 + LEAST(100,v_critical*20)*0.10 + GREATEST(0,100-v_gaps*8)*0.15 + LEAST(100,v_conf*100)*0.25 + LEAST(100,v_faqs*10)*0.10 + v_audit_score*0.20;
  RETURN jsonb_build_object(
    'score', round(v_score)::int,
    'label', CASE WHEN v_score>=85 THEN 'Excellent' WHEN v_score>=70 THEN 'Good' WHEN v_score>=50 THEN 'Fair' ELSE 'Needs attention' END,
    'breakdown', jsonb_build_object('documents',v_docs,'criticalSops',v_critical,'openGaps',v_gaps,'avgConfidence',round(v_conf,2),'faqs',v_faqs,'lastAuditScore',round(v_audit_score))
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_health(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_health(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_activity(p_company uuid, p_from timestamptz, p_to timestamptz, p_bucket text DEFAULT 'day')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; v_bucket interval;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_bucket := CASE p_bucket WHEN 'hour' THEN interval '1 hour' WHEN 'week' THEN interval '1 week' ELSE interval '1 day' END;
  WITH series AS (
    SELECT generate_series(date_trunc(p_bucket, p_from), date_trunc(p_bucket, p_to), v_bucket) AS bucket
  ), questions AS (
    SELECT date_trunc(p_bucket, created_at) AS bucket, count(*) AS c, count(DISTINCT user_id) AS u
    FROM audit_log WHERE company_id=p_company AND created_at BETWEEN p_from AND p_to GROUP BY 1
  ), convos AS (
    SELECT date_trunc(p_bucket, created_at) AS bucket, count(*) AS c
    FROM threads WHERE company_id=p_company AND created_at BETWEEN p_from AND p_to GROUP BY 1
  ), responses AS (
    SELECT date_trunc(p_bucket, m.created_at) AS bucket, count(*) AS c
    FROM messages m JOIN threads t ON t.id=m.thread_id
    WHERE t.company_id=p_company AND m.role='assistant' AND m.created_at BETWEEN p_from AND p_to GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'bucket', s.bucket,'questions', COALESCE(q.c,0),'conversations', COALESCE(c.c,0),
    'users', COALESCE(q.u,0),'aiResponses', COALESCE(r2.c,0)
  ) ORDER BY s.bucket) INTO r
  FROM series s LEFT JOIN questions q ON q.bucket=s.bucket LEFT JOIN convos c ON c.bucket=s.bucket LEFT JOIN responses r2 ON r2.bucket=s.bucket;
  RETURN COALESCE(r, '[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_activity(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_activity(uuid, timestamptz, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_knowledge_status(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_complete int; v_progress int; v_missing int;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_complete FROM knowledge_documents WHERE company_id=p_company AND is_active AND status='ready' AND chunk_count > 0;
  SELECT count(*) INTO v_progress FROM knowledge_documents WHERE company_id=p_company AND is_active AND status IN ('processing','pending','ingesting');
  SELECT count(*) INTO v_missing FROM knowledge_gaps WHERE company_id=p_company AND status='open';
  RETURN jsonb_build_object('complete', v_complete, 'inProgress', v_progress, 'missing', v_missing);
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_knowledge_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_knowledge_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_top_sops(p_company uuid, p_limit int DEFAULT 5)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH usage AS (
    SELECT s->>'code' AS code, s->>'title' AS title, count(*) AS hits
    FROM audit_log, jsonb_array_elements(COALESCE(sources,'[]'::jsonb)) s
    WHERE company_id=p_company AND created_at > now() - interval '30 days' AND s->>'type'='document'
    GROUP BY 1,2 ORDER BY hits DESC LIMIT p_limit
  )
  SELECT jsonb_agg(jsonb_build_object('code', u.code, 'title', u.title, 'usage', u.hits, 'updatedAt', d.updated_at)) INTO r
  FROM usage u LEFT JOIN knowledge_documents d ON d.company_id=p_company AND d.doc_code=u.code AND d.is_active;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_top_sops(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_top_sops(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_critical_sops(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'title', title, 'code', doc_code, 'version', version, 'updatedAt', updated_at,
    'reason', CASE
      WHEN updated_at < now() - interval '180 days' THEN 'Outdated'
      WHEN doc_code IS NULL OR section IS NULL THEN 'Missing metadata'
      WHEN chunk_count = 0 THEN 'Needs Review'
      ELSE 'Critical SOP'
    END
  )) INTO r FROM (
    SELECT * FROM knowledge_documents
    WHERE company_id=p_company AND is_active AND (is_critical OR updated_at < now() - interval '180 days' OR doc_code IS NULL)
    ORDER BY updated_at ASC LIMIT 8
  ) x;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_critical_sops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_critical_sops(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_last_ai_audit(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT to_jsonb(a) INTO r FROM (
    SELECT id, score, maturity, passed, warnings, critical, created_at
    FROM ai_audits WHERE company_id=p_company ORDER BY created_at DESC LIMIT 1
  ) a;
  RETURN COALESCE(r,'null'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_last_ai_audit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_last_ai_audit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_everywhere(p_company uuid, p_q text, p_limit int DEFAULT 8)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(length(trim(p_q)),0) < 2 THEN RETURN '[]'::jsonb; END IF;
  WITH res AS (
    (SELECT 'sop'::text AS kind, id::text AS id, title AS label, doc_code AS sub, updated_at AS ts
     FROM knowledge_documents WHERE company_id=p_company AND is_active AND title ILIKE '%'||p_q||'%' LIMIT p_limit)
    UNION ALL
    (SELECT 'faq', id::text, question, category, updated_at
     FROM faqs WHERE company_id=p_company AND (question ILIKE '%'||p_q||'%' OR answer ILIKE '%'||p_q||'%') LIMIT p_limit)
    UNION ALL
    (SELECT 'audit', id::text, question, NULL, created_at
     FROM audit_log WHERE company_id=p_company AND question ILIKE '%'||p_q||'%' LIMIT p_limit)
    UNION ALL
    (SELECT 'user', id::text, COALESCE(full_name,'(no name)'), NULL, created_at
     FROM profiles WHERE company_id=p_company AND full_name ILIKE '%'||p_q||'%' LIMIT p_limit)
  )
  SELECT jsonb_agg(to_jsonb(res) ORDER BY ts DESC) INTO r FROM res;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.search_everywhere(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_everywhere(uuid, text, int) TO authenticated;

INSERT INTO public.role_permissions (role, permission) VALUES
  ('manager','sop.generate'),('admin','sop.generate'),('platform_admin','sop.generate'),('platform_owner','sop.generate'),
  ('manager','ai_audit.run'),('admin','ai_audit.run'),('platform_admin','ai_audit.run'),('platform_owner','ai_audit.run')
ON CONFLICT DO NOTHING;
