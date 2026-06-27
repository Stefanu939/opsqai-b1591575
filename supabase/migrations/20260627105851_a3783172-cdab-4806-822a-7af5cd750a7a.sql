
-- 1. Extend audit_log
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS resource text,
  ADD COLUMN IF NOT EXISTS old_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS success boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS idx_audit_log_company_user_created
  ON public.audit_log (company_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON public.audit_log (module);

-- 2. Exports table
CREATE TABLE IF NOT EXISTS public.exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('kb','faq','workspace')),
  mode text NOT NULL CHECK (mode IN ('only','migrate','delete')),
  format text NOT NULL DEFAULT 'zip' CHECK (format IN ('zip','json','csv','markdown')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  progress integer NOT NULL DEFAULT 0,
  storage_path text,
  sha256 text,
  bytes bigint,
  file_count integer,
  manifest jsonb,
  error text,
  deletion_status text,
  deletion_typed text,
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

GRANT SELECT, INSERT, UPDATE ON public.exports TO authenticated;
GRANT ALL ON public.exports TO service_role;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exports_select_company ON public.exports;
DROP POLICY IF EXISTS exports_insert_self ON public.exports;
DROP POLICY IF EXISTS exports_update_admin ON public.exports;

CREATE POLICY exports_select_company ON public.exports FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR company_id = public.current_company_id());
CREATE POLICY exports_insert_self ON public.exports FOR INSERT TO authenticated
  WITH CHECK ((public.is_platform_admin() OR company_id = public.current_company_id())
              AND created_by = auth.uid());
CREATE POLICY exports_update_admin ON public.exports FOR UPDATE TO authenticated
  USING (public.is_platform_admin()
         OR (company_id = public.current_company_id()
             AND (public.has_role(auth.uid(),'admin')
                  OR public.has_role(auth.uid(),'workspace_owner'))));

CREATE INDEX IF NOT EXISTS idx_exports_company_created ON public.exports (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_status ON public.exports (status);

CREATE OR REPLACE FUNCTION public.exports_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN NEW.completed_at = now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_exports_touch ON public.exports;
CREATE TRIGGER trg_exports_touch BEFORE UPDATE ON public.exports
  FOR EACH ROW EXECUTE FUNCTION public.exports_touch();

-- 3. Role permissions (now safe — new enum values are committed)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('workspace_owner','workspace.manage'),
  ('workspace_owner','workspace.use'),
  ('workspace_owner','knowledge.manage'),
  ('workspace_owner','sop.create'),('workspace_owner','sop.edit'),('workspace_owner','sop.delete'),
  ('workspace_owner','sop.publish'),('workspace_owner','sop.generate'),
  ('workspace_owner','faq.create'),('workspace_owner','faq.edit'),('workspace_owner','faq.delete'),
  ('workspace_owner','user.create'),('workspace_owner','user.update'),('workspace_owner','user.delete'),
  ('workspace_owner','department.manage'),('workspace_owner','company.manage'),
  ('workspace_owner','dashboard.view'),('workspace_owner','analytics.view'),
  ('workspace_owner','audit.view'),('workspace_owner','audit.create'),('workspace_owner','audit.update'),('workspace_owner','audit.close'),
  ('workspace_owner','ai_audit.run'),('workspace_owner','reports.export'),
  ('workspace_owner','notifications.manage'),('workspace_owner','template.manage'),
  ('workspace_owner','academy.manage'),('workspace_owner','academy.publish'),('workspace_owner','academy.certify'),('workspace_owner','academy.learn'),
  ('workspace_owner','chat.use'),
  ('workspace_owner','exports.read'),('workspace_owner','exports.delete'),
  ('workspace_owner','gaps.view'),('workspace_owner','gap.create'),
  ('champion','chat.use'),('champion','workspace.use'),
  ('champion','sop.read'),('champion','sop.suggest'),('champion','sop.acknowledge'),
  ('champion','faq.read'),('champion','faq.suggest'),
  ('champion','gap.create'),('champion','gaps.view'),
  ('champion','feedback.submit'),
  ('champion','dashboard.view'),('champion','reports.export'),
  ('champion','audit.create'),('champion','audit.update'),
  ('champion','academy.learn'),
  ('admin','exports.read'),('admin','gaps.view'),
  ('manager','exports.read'),('manager','gaps.view'),
  ('platform_admin','exports.read'),('platform_admin','exports.delete'),('platform_admin','gaps.view'),
  ('platform_admin','audit.create'),('platform_admin','audit.update'),('platform_admin','audit.close')
ON CONFLICT (role, permission) DO NOTHING;

-- 4. RPCs

CREATE OR REPLACE FUNCTION public.gap_companies()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x ORDER BY x->>'name') INTO r FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'name', c.name, 'active', c.active,
      'users', (SELECT count(*) FROM public.profiles p WHERE p.company_id=c.id),
      'openGaps', (SELECT count(*) FROM public.knowledge_gaps g WHERE g.company_id=c.id AND g.status='open'),
      'totalGaps', (SELECT count(*) FROM public.knowledge_gaps g WHERE g.company_id=c.id),
      'resolvedGaps', (SELECT count(*) FROM public.knowledge_gaps g WHERE g.company_id=c.id AND g.status IN ('resolved','closed')),
      'lastActivity', (SELECT max(g.last_seen) FROM public.knowledge_gaps g WHERE g.company_id=c.id),
      'documents', (SELECT count(*) FROM public.knowledge_documents d WHERE d.company_id=c.id AND d.is_active),
      'lastUpdate', (SELECT max(d.updated_at) FROM public.knowledge_documents d WHERE d.company_id=c.id AND d.is_active)
    ) AS x
    FROM public.companies c WHERE c.active
  ) y;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.gap_users(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.is_platform_admin() OR p_company = public.current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x ORDER BY (x->>'openGaps')::int DESC, x->>'name') INTO r FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'name', COALESCE(NULLIF(p.full_name,''), NULLIF(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), '(no name)'),
      'firstName', p.first_name, 'lastName', p.last_name,
      'department', d.name, 'position', p.position,
      'role', (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id=p.id AND (ur.company_id=p_company OR ur.role IN ('platform_admin','platform_owner')) ORDER BY ur.role LIMIT 1),
      'openGaps', (SELECT count(*) FROM public.knowledge_gaps g WHERE g.company_id=p_company AND g.created_by=p.id AND g.status='open'),
      'totalGaps', (SELECT count(*) FROM public.knowledge_gaps g WHERE g.company_id=p_company AND g.created_by=p.id),
      'lastActivity', (SELECT max(g.last_seen) FROM public.knowledge_gaps g WHERE g.company_id=p_company AND g.created_by=p.id)
    ) AS x
    FROM public.profiles p
    LEFT JOIN public.departments d ON d.id=p.department_id
    WHERE p.company_id = p_company AND COALESCE(p.is_active, true)
  ) y;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.gap_user_questions(
  p_company uuid, p_user uuid,
  p_status text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL,
  p_department uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.is_platform_admin() OR p_company = public.current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x ORDER BY (x->>'lastSeen') DESC) INTO r FROM (
    SELECT jsonb_build_object(
      'id', g.id,
      'question', g.question_sample,
      'normalized', g.question_normalized,
      'status', g.status,
      'occurrences', g.occurrences,
      'firstSeen', g.first_seen,
      'lastSeen', g.last_seen,
      'confidence', g.confidence,
      'department', dep.name,
      'assignee', COALESCE(asn.full_name,''),
      'resolvedAt', g.resolution_date,
      'resolution', g.resolution,
      'resolvedDocumentId', g.resolved_document_id,
      'resolvedFaqId', g.resolved_faq_id,
      'sourceThreadId', g.source_thread_id,
      'sourceMessageId', g.source_message_id,
      'aiAnswer', (SELECT m.content FROM public.messages m WHERE m.id=g.source_message_id LIMIT 1),
      'suggestedDoc', (
        SELECT jsonb_build_object('id', d.id, 'title', d.title, 'code', d.doc_code)
        FROM public.knowledge_documents d
        WHERE d.company_id=p_company AND d.is_active
          AND similarity(d.title, COALESCE(g.question_sample,'')) > 0.25
        ORDER BY similarity(d.title, COALESCE(g.question_sample,'')) DESC LIMIT 1
      ),
      'suggestedFaq', (
        SELECT jsonb_build_object('id', f.id, 'question', COALESCE(f.question_en,f.question_de))
        FROM public.faqs f
        WHERE f.company_id=p_company
          AND similarity(COALESCE(f.question_en,f.question_de,''), COALESCE(g.question_sample,'')) > 0.25
        ORDER BY similarity(COALESCE(f.question_en,f.question_de,''), COALESCE(g.question_sample,'')) DESC LIMIT 1
      )
    ) AS x
    FROM public.knowledge_gaps g
    LEFT JOIN public.departments dep ON dep.id=g.department_id
    LEFT JOIN public.profiles asn ON asn.id=g.assignee_id
    WHERE g.company_id = p_company
      AND g.created_by = p_user
      AND (p_status IS NULL OR g.status = p_status)
      AND (p_from IS NULL OR g.last_seen >= p_from)
      AND (p_to IS NULL OR g.last_seen <= p_to)
      AND (p_department IS NULL OR g.department_id = p_department)
  ) y;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.knowledge_health(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_open int; v_resolved int; v_repeat int; v_avg numeric;
  v_total int; v_docs int; v_last_update timestamptz; v_score numeric;
BEGIN
  IF NOT (public.is_platform_admin() OR p_company = public.current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) FILTER (WHERE status='open'),
         count(*) FILTER (WHERE status IN ('resolved','closed')),
         count(*) FILTER (WHERE occurrences > 1),
         COALESCE(round(avg(EXTRACT(EPOCH FROM (resolution_date - first_seen))/3600.0) FILTER (WHERE resolution_date IS NOT NULL)::numeric, 1), 0),
         count(*)
    INTO v_open, v_resolved, v_repeat, v_avg, v_total
    FROM public.knowledge_gaps WHERE company_id = p_company;
  SELECT count(*), max(updated_at) INTO v_docs, v_last_update
    FROM public.knowledge_documents WHERE company_id=p_company AND is_active;
  v_score := GREATEST(0, LEAST(100, round(
    100
    - LEAST(40, v_open * 2.0)
    - LEAST(20, v_repeat * 3.0)
    + LEAST(20, v_resolved * 0.5)
    - CASE WHEN v_last_update IS NULL OR v_last_update < now() - interval '180 days' THEN 10 ELSE 0 END
  )));
  RETURN jsonb_build_object(
    'score', v_score,
    'openGaps', v_open,
    'resolvedGaps', v_resolved,
    'repeatedQuestions', v_repeat,
    'totalGaps', v_total,
    'avgResolutionHours', v_avg,
    'documents', v_docs,
    'lastKnowledgeUpdate', v_last_update
  );
END $$;

CREATE OR REPLACE FUNCTION public.audit_companies()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x ORDER BY x->>'name') INTO r FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'name', c.name,
      'users', (SELECT count(*) FROM public.profiles p WHERE p.company_id=c.id),
      'entries', (SELECT count(*) FROM public.audit_log a WHERE a.company_id=c.id),
      'last7d', (SELECT count(*) FROM public.audit_log a WHERE a.company_id=c.id AND a.created_at > now() - interval '7 days'),
      'lastActivity', (SELECT max(a.created_at) FROM public.audit_log a WHERE a.company_id=c.id)
    ) AS x
    FROM public.companies c WHERE c.active
  ) y;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.audit_users(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.is_platform_admin() OR p_company = public.current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x ORDER BY (x->>'entries')::int DESC NULLS LAST) INTO r FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'name', COALESCE(NULLIF(p.full_name,''), NULLIF(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), '(no name)'),
      'department', d.name,
      'position', p.position,
      'entries', (SELECT count(*) FROM public.audit_log a WHERE a.company_id=p_company AND a.user_id=p.id),
      'lastActivity', (SELECT max(a.created_at) FROM public.audit_log a WHERE a.company_id=p_company AND a.user_id=p.id)
    ) AS x
    FROM public.profiles p
    LEFT JOIN public.departments d ON d.id=p.department_id
    WHERE p.company_id = p_company
  ) y;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.audit_entries(
  p_company uuid, p_user uuid,
  p_module text DEFAULT NULL, p_action text DEFAULT NULL, p_severity text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 200
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.is_platform_admin() OR p_company = public.current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x ORDER BY (x->>'createdAt') DESC) INTO r FROM (
    SELECT jsonb_build_object(
      'id', a.id, 'createdAt', a.created_at,
      'module', COALESCE(a.module,'chat'),
      'action', COALESCE(a.action,'ask'),
      'resource', a.resource,
      'oldValue', a.old_value, 'newValue', a.new_value,
      'severity', a.severity, 'success', a.success,
      'ip', a.ip, 'userAgent', a.user_agent,
      'question', a.question, 'answerPreview', a.answer_preview,
      'sources', a.sources
    ) AS x
    FROM public.audit_log a
    WHERE a.company_id = p_company AND a.user_id = p_user
      AND (p_module IS NULL OR a.module = p_module)
      AND (p_action IS NULL OR a.action = p_action)
      AND (p_severity IS NULL OR a.severity = p_severity)
      AND (p_from IS NULL OR a.created_at >= p_from)
      AND (p_to IS NULL OR a.created_at <= p_to)
    ORDER BY a.created_at DESC
    LIMIT GREATEST(1, LEAST(1000, p_limit))
  ) y;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.audit_write(
  p_company uuid, p_user uuid,
  p_module text, p_action text, p_resource text,
  p_old jsonb, p_new jsonb,
  p_severity text, p_success boolean,
  p_ip text, p_ua text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.audit_log (
    company_id, user_id, module, action, resource,
    old_value, new_value, severity, success, ip, user_agent,
    question, answer_preview
  ) VALUES (
    p_company, p_user, p_module, p_action, p_resource,
    p_old, p_new, COALESCE(p_severity,'info'), COALESCE(p_success,true), p_ip, p_ua,
    p_action, COALESCE(p_new->>'summary', NULL)
  ) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.gap_companies() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gap_users(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gap_user_questions(uuid,uuid,text,timestamptz,timestamptz,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.knowledge_health(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.audit_companies() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.audit_users(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.audit_entries(uuid,uuid,text,text,text,timestamptz,timestamptz,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.audit_write(uuid,uuid,text,text,text,jsonb,jsonb,text,boolean,text,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.gap_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gap_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gap_user_questions(uuid,uuid,text,timestamptz,timestamptz,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.knowledge_health(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_entries(uuid,uuid,text,text,text,timestamptz,timestamptz,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_write(uuid,uuid,text,text,text,jsonb,jsonb,text,boolean,text,text) TO authenticated;
