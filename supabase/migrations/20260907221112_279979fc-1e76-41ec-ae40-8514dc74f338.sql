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
         'FAQ needs review: ' || COALESCE(f.question_en, f.question_de),
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
