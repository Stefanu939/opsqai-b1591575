
CREATE OR REPLACE FUNCTION public.dashboard_health(p_company uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_docs int; v_critical int; v_gaps int; v_conf numeric; v_audit_score numeric; v_faqs int; v_score numeric;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_docs FROM knowledge_documents WHERE company_id=p_company AND is_active;
  SELECT count(*) INTO v_critical FROM knowledge_documents WHERE company_id=p_company AND is_critical AND is_active;
  SELECT count(*) INTO v_gaps FROM knowledge_gaps WHERE company_id=p_company AND status='open';
  SELECT COALESCE(avg(m.confidence)::numeric, 0.7) INTO v_conf
    FROM messages m JOIN threads t ON t.id=m.thread_id
    WHERE t.company_id=p_company AND m.role='assistant' AND m.confidence IS NOT NULL
      AND m.created_at > now() - interval '30 days';
  SELECT count(*) INTO v_faqs FROM faqs WHERE company_id=p_company;
  SELECT COALESCE((SELECT score FROM ai_audits WHERE company_id=p_company ORDER BY created_at DESC LIMIT 1),70) INTO v_audit_score;
  v_score := LEAST(100, v_docs*5)*0.20 + LEAST(100,v_critical*20)*0.10 + GREATEST(0,100-v_gaps*8)*0.15 + LEAST(100,v_conf*100)*0.25 + LEAST(100,v_faqs*10)*0.10 + v_audit_score*0.20;
  RETURN jsonb_build_object(
    'score', round(v_score)::int,
    'label', CASE WHEN v_score>=85 THEN 'Excellent' WHEN v_score>=70 THEN 'Good' WHEN v_score>=50 THEN 'Fair' ELSE 'Needs attention' END,
    'breakdown', jsonb_build_object('documents',v_docs,'criticalSops',v_critical,'openGaps',v_gaps,'avgConfidence',round(v_conf,2),'faqs',v_faqs,'lastAuditScore',round(v_audit_score))
  );
END $function$;
