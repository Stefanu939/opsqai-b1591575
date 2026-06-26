-- Re-grant EXECUTE on user-callable helpers that were over-revoked.
-- These are SECURITY DEFINER and contain their own tenant/role checks.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.has_permission(uuid, text)',
    'public.has_role(uuid, app_role)',
    'public.is_platform_admin()',
    'public.is_platform_owner(uuid)',
    'public.current_company_id()',
    'public.user_belongs_to_company(uuid)',
    'public.my_permissions()',
    'public.search_everywhere(uuid, text, integer)',
    'public.dashboard_kpis(uuid)',
    'public.dashboard_health(uuid)',
    'public.dashboard_knowledge_status(uuid)',
    'public.dashboard_top_sops(uuid, integer)',
    'public.dashboard_critical_sops(uuid)',
    'public.dashboard_last_ai_audit(uuid)',
    'public.dashboard_activity(uuid, timestamptz, timestamptz, text)',
    'public.match_document_chunks(vector, double precision, integer)',
    'public.match_document_chunks_for_company(uuid, vector, double precision, integer)',
    'public.match_knowledge_gap(uuid, vector, double precision)',
    'public.ensure_platform_owner()'
  ]
  LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      -- skip overloads that don't match exactly; harmless
      NULL;
    END;
  END LOOP;
END $$;

-- Belt-and-braces: re-assert platform owner immutable flags on every deploy.
SELECT public.ensure_platform_owner();