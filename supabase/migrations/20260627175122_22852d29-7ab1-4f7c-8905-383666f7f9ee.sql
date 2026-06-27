
CREATE OR REPLACE FUNCTION public.customer_health(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  -- Authorization is enforced by the calling server function
  -- (requireCustomerManagerAccess: Platform Owner / Platform Admin / Workspace Owner).
  SELECT jsonb_build_object(
    'workspaceHealth', COALESCE((SELECT (public.dashboard_health(p_company))->>'score')::int, 0),
    'knowledgeDocs', (SELECT count(*) FROM knowledge_documents WHERE company_id=p_company AND is_active),
    'criticalDocs', (SELECT count(*) FROM knowledge_documents WHERE company_id=p_company AND is_critical AND is_active),
    'faqs', (SELECT count(*) FROM faqs WHERE company_id=p_company),
    'openGaps', (SELECT count(*) FROM knowledge_gaps WHERE company_id=p_company AND status='open'),
    'mau', (SELECT count(DISTINCT user_id) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'questions30d', (SELECT count(*) FROM audit_log WHERE company_id=p_company AND created_at > now() - interval '30 days'),
    'academyCompletions', (SELECT count(*) FROM academy_certificates WHERE company_id=p_company),
    'supportOpen', (SELECT count(*) FROM support_conversations WHERE company_id=p_company AND status IN ('open','pending')),
    'docsGenerated', (SELECT count(*) FROM customer_documents WHERE company_id=p_company)
  ) INTO r;
  RETURN r;
END $$;

REVOKE EXECUTE ON FUNCTION public.customer_health(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_health(uuid) TO authenticated, service_role;
