CREATE OR REPLACE FUNCTION public.customer_health(p_company uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb;
  v_docs int;
  v_critical int;
  v_gaps int;
  v_conf numeric;
  v_audit_score numeric;
  v_faqs int;
  v_workspace_health int;
BEGIN
  -- Authorization is enforced by the calling server function
  -- (requireCustomerManagerAccess: Platform Owner / Platform Admin / Workspace Owner).
  SELECT count(*) INTO v_docs FROM knowledge_documents WHERE company_id = p_company AND is_active;
  SELECT count(*) INTO v_critical FROM knowledge_documents WHERE company_id = p_company AND is_critical AND is_active;
  SELECT count(*) INTO v_gaps FROM knowledge_gaps WHERE company_id = p_company AND status = 'open';
  SELECT count(*) INTO v_faqs FROM faqs WHERE company_id = p_company;

  SELECT COALESCE(avg(m.confidence)::numeric, 0.7) INTO v_conf
  FROM messages m
  JOIN threads t ON t.id = m.thread_id
  WHERE t.company_id = p_company
    AND m.role = 'assistant'
    AND m.confidence IS NOT NULL
    AND m.created_at > now() - interval '30 days';

  SELECT COALESCE((SELECT score FROM ai_audits WHERE company_id = p_company ORDER BY created_at DESC LIMIT 1), 70) INTO v_audit_score;

  v_workspace_health := round(
    LEAST(100, v_docs * 5) * 0.20
    + LEAST(100, v_critical * 20) * 0.10
    + GREATEST(0, 100 - v_gaps * 8) * 0.15
    + LEAST(100, v_conf * 100) * 0.25
    + LEAST(100, v_faqs * 10) * 0.10
    + v_audit_score * 0.20
  )::int;

  SELECT jsonb_build_object(
    'workspaceHealth', COALESCE(v_workspace_health, 0),
    'knowledgeDocs', v_docs,
    'criticalDocs', v_critical,
    'faqs', v_faqs,
    'openGaps', v_gaps,
    'mau', (SELECT count(DISTINCT user_id) FROM audit_log WHERE company_id = p_company AND created_at > now() - interval '30 days'),
    'questions30d', (SELECT count(*) FROM audit_log WHERE company_id = p_company AND created_at > now() - interval '30 days'),
    'academyCompletions', (SELECT count(*) FROM academy_certificates WHERE company_id = p_company),
    'supportOpen', (SELECT count(*) FROM support_conversations WHERE company_id = p_company AND status IN ('open', 'pending')),
    'docsGenerated', (SELECT count(*) FROM customer_documents WHERE company_id = p_company)
  ) INTO r;

  RETURN r;
END
$function$;

REVOKE EXECUTE ON FUNCTION public.customer_health(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_health(uuid) TO authenticated, service_role;