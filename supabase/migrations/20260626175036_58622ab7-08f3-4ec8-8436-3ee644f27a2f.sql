CREATE OR REPLACE FUNCTION public.search_everywhere(p_company uuid, p_q text, p_limit integer DEFAULT 8)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r jsonb; pat text;
BEGIN
  IF NOT (is_platform_admin() OR p_company = current_company_id()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF coalesce(length(trim(p_q)),0) < 2 THEN RETURN '[]'::jsonb; END IF;
  pat := '%'||p_q||'%';

  WITH res AS (
    (SELECT 'sop'::text AS kind, id::text AS id, title AS label,
            COALESCE(doc_code, category) AS sub, updated_at AS ts
       FROM knowledge_documents
      WHERE company_id=p_company AND is_active
        AND (title ILIKE pat OR doc_code ILIKE pat OR category ILIKE pat OR section ILIKE pat)
      LIMIT p_limit)
    UNION ALL
    (SELECT 'faq', id::text,
            COALESCE(question_en, question_de, '(faq)'),
            category, updated_at
       FROM faqs
      WHERE company_id=p_company
        AND (question_en ILIKE pat OR question_de ILIKE pat
          OR answer_en ILIKE pat OR answer_de ILIKE pat OR category ILIKE pat)
      LIMIT p_limit)
    UNION ALL
    (SELECT 'gap', id::text,
            COALESCE(question_sample, question_normalized, '(gap)'),
            status, last_seen
       FROM knowledge_gaps
      WHERE company_id=p_company
        AND (question_sample ILIKE pat OR question_normalized ILIKE pat)
      LIMIT p_limit)
    UNION ALL
    (SELECT 'audit', id::text, question, NULL::text, created_at
       FROM audit_log
      WHERE company_id=p_company
        AND (question ILIKE pat OR answer_preview ILIKE pat)
      LIMIT p_limit)
    UNION ALL
    (SELECT 'ai_audit', id::text,
            'AI Audit · '||maturity||' ('||round(score)::text||'/100)',
            to_char(created_at,'YYYY-MM-DD'), created_at
       FROM ai_audits
      WHERE company_id=p_company
        AND (maturity ILIKE pat OR COALESCE(summary->>'executiveSummary','') ILIKE pat)
      LIMIT p_limit)
    UNION ALL
    (SELECT 'thread', id::text, COALESCE(title,'(conversation)'), NULL::text, updated_at
       FROM threads
      WHERE company_id=p_company AND title ILIKE pat
      LIMIT p_limit)
    UNION ALL
    (SELECT 'workspace', id::text, COALESCE(title,'(workspace)'), NULL::text, updated_at
       FROM workspace_sessions
      WHERE company_id=p_company AND title ILIKE pat
      LIMIT p_limit)
    UNION ALL
    (SELECT 'user', id::text,
            COALESCE(NULLIF(full_name,''), NULLIF(trim(coalesce(first_name,'')||' '||coalesce(last_name,'')),''), '(no name)'),
            position, created_at
       FROM profiles
      WHERE company_id=p_company
        AND (full_name ILIKE pat OR first_name ILIKE pat OR last_name ILIKE pat OR position ILIKE pat)
      LIMIT p_limit)
  )
  SELECT jsonb_agg(to_jsonb(res) ORDER BY ts DESC NULLS LAST) INTO r FROM res;
  RETURN COALESCE(r,'[]'::jsonb);
END $function$;

GRANT EXECUTE ON FUNCTION public.search_everywhere(uuid, text, integer) TO authenticated;