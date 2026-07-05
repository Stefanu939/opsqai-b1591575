-- Column-level anon restrictions. Row policies remain unchanged (they still
-- gate rows to the demo tenant via is_demo_company / is_demo_tenant).

-- audit_log: exclude ip, user_agent, old_value, new_value, thread_id, sources, is_demo_ephemeral
REVOKE SELECT ON public.audit_log FROM anon;
GRANT SELECT (
  id, company_id, user_id, module, action, resource,
  question, answer_preview, severity, success, created_at
) ON public.audit_log TO anon;

-- companies: exclude internal_notes, billing_override, suspension_reason,
-- subscription_status/plan, financials, grace/trial/renewal/suspension timestamps,
-- max_users, min_confidence, workspace_retention, active, is_system.
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, name, display_name, is_demo_tenant, created_at
) ON public.companies TO anon;
