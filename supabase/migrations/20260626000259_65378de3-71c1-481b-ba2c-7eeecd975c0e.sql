-- Lock down SECURITY DEFINER functions: no anonymous/public EXECUTE.
-- Grant only to roles that actually need them.

-- Helpers used by RLS policies (need authenticated)
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- RAG matchers (called by authenticated app code)
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks_for_company(vector, integer, double precision, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_gap(uuid, text, text, vector, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_document_chunks_for_company(vector, integer, double precision, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_gap(uuid, text, text, vector, double precision) TO authenticated, service_role;

-- Email queue helpers (server-only)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- Cron / maintenance (server-only)
REVOKE EXECUTE ON FUNCTION public.cron_quarterly_knowledge_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_mark_outdated_knowledge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.workspace_cleanup_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_quarterly_knowledge_report() TO service_role;
GRANT EXECUTE ON FUNCTION public.cron_mark_outdated_knowledge() TO service_role;
GRANT EXECUTE ON FUNCTION public.workspace_cleanup_expired() TO service_role;

-- Trigger functions (only the trigger system needs to call them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kg_auto_resolve_from_doc() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kg_auto_resolve_from_faq() FROM PUBLIC, anon, authenticated;
