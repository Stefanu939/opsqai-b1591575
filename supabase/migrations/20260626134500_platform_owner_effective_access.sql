-- Critical Authorization Fix: make Platform Owner permissions permanent and effective in SQL/RLS.

-- Re-assert immutable owner assignment on every deployment.
SELECT public.ensure_platform_owner();

-- Permission hierarchy: Platform Owner => everything; Platform Admin => all company roles;
-- Admin => Manager => Supervisor => Operator => Viewer. Legacy team_leader/employee are preserved.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH direct AS (
    SELECT ur.role, ur.company_id
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role IN ('platform_owner','platform_admin')
        OR ur.company_id IS NOT DISTINCT FROM public.current_company_id()
      )
  ), effective(role) AS (
    SELECT 'platform_owner'::public.app_role WHERE public.is_platform_owner(_user_id)
    UNION SELECT 'platform_admin'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin'))
    UNION SELECT 'admin'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin'))
    UNION SELECT 'manager'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin','manager'))
    UNION SELECT 'supervisor'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin','manager','supervisor','team_leader'))
    UNION SELECT 'team_leader'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin','manager','supervisor','team_leader'))
    UNION SELECT 'operator'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin','manager','supervisor','team_leader','operator','employee'))
    UNION SELECT 'employee'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin','manager','supervisor','team_leader','operator','employee'))
    UNION SELECT 'viewer'::public.app_role WHERE EXISTS (SELECT 1 FROM direct WHERE role IN ('platform_owner','platform_admin','admin','manager','supervisor','team_leader','operator','employee','viewer'))
  )
  SELECT public.is_platform_owner(_user_id)
    OR EXISTS (
      SELECT 1 FROM effective e
      JOIN public.role_permissions rp ON rp.role = e.role
      WHERE rp.permission = _permission OR rp.permission = '*'
    )
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS TABLE(permission text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT '*'::text WHERE public.is_platform_owner(auth.uid())
  UNION
  SELECT DISTINCT rp.permission
  FROM public.role_permissions rp
  WHERE public.has_permission(auth.uid(), rp.permission)
$$;
REVOKE ALL ON FUNCTION public.my_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_permissions() TO authenticated, service_role;

-- Seed explicit high-value permissions so future role-permission edits cannot strand Platform Admins.
INSERT INTO public.role_permissions (role, permission) VALUES
  ('platform_owner','*'),
  ('platform_admin','knowledge.manage'), ('platform_admin','sop.create'), ('platform_admin','sop.edit'), ('platform_admin','sop.delete'), ('platform_admin','sop.publish'), ('platform_admin','sop.generate'),
  ('platform_admin','faq.create'), ('platform_admin','faq.edit'), ('platform_admin','faq.delete'),
  ('platform_admin','template.manage'), ('platform_admin','workspace.manage'), ('platform_admin','workspace.use'),
  ('platform_admin','ai_audit.run'), ('platform_admin','audit.view'), ('platform_admin','audit.create'), ('platform_admin','audit.update'), ('platform_admin','audit.close'),
  ('platform_admin','company.manage'), ('platform_admin','user.create'), ('platform_admin','user.update'), ('platform_admin','user.delete'),
  ('platform_admin','dashboard.view'), ('platform_admin','analytics.view'), ('platform_admin','chat.use')
ON CONFLICT (role, permission) DO NOTHING;

-- Dashboard/RPC helpers must trust Platform Owner via is_platform_admin(), not profile company_id.
CREATE OR REPLACE FUNCTION public._can_access_company(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR p_company = public.current_company_id()
$$;
REVOKE ALL ON FUNCTION public._can_access_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_access_company(uuid) TO authenticated, service_role;

-- Fix ai_audits INSERT precedence bug that previously required company_id=current_company_id even for Platform Owner.
DROP POLICY IF EXISTS "company members view ai_audits" ON public.ai_audits;
CREATE POLICY "company members view ai_audits" ON public.ai_audits FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
DROP POLICY IF EXISTS "managers insert ai_audits" ON public.ai_audits;
CREATE POLICY "managers insert ai_audits" ON public.ai_audits FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'ai_audit.run'))
  );

-- Knowledge Base / SOP / FAQ RLS: platform users bypass current_company_id(), company users stay tenant-scoped.
DROP POLICY IF EXISTS "company members read documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "company admins manage documents" ON public.knowledge_documents;
CREATE POLICY "company members read documents" ON public.knowledge_documents FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR company_id = public.current_company_id());
CREATE POLICY "company admins manage documents" ON public.knowledge_documents FOR ALL TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'knowledge.manage')))
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'knowledge.manage')));

DROP POLICY IF EXISTS "company members read chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "company admins manage chunks" ON public.document_chunks;
CREATE POLICY "company members read chunks" ON public.document_chunks FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR company_id = public.current_company_id());
CREATE POLICY "company admins manage chunks" ON public.document_chunks FOR ALL TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'knowledge.manage')))
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'knowledge.manage')));

DROP POLICY IF EXISTS "company members read faqs" ON public.faqs;
DROP POLICY IF EXISTS "company admins or team_leaders write faqs" ON public.faqs;
CREATE POLICY "company members read faqs" ON public.faqs FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR company_id = public.current_company_id());
CREATE POLICY "company admins or team_leaders write faqs" ON public.faqs FOR ALL TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'faq.edit')))
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND (public.has_permission(auth.uid(), 'faq.create') OR public.has_permission(auth.uid(), 'faq.edit'))));

-- Audit logs: Platform Owner can view/manage globally; admins/managers remain company-scoped.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO authenticated;
DROP POLICY IF EXISTS "users insert own audit in company" ON public.audit_log;
DROP POLICY IF EXISTS "company admins or managers view audit" ON public.audit_log;
CREATE POLICY "users insert own audit in company" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR (user_id = auth.uid() AND company_id = public.current_company_id()));
CREATE POLICY "company admins or managers view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'audit.view')));
DROP POLICY IF EXISTS "audit_logs_manage" ON public.audit_log;
CREATE POLICY "audit_logs_manage" ON public.audit_log FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'audit.update')))
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'audit.update')));
DROP POLICY IF EXISTS "audit_logs_delete" ON public.audit_log;
CREATE POLICY "audit_logs_delete" ON public.audit_log FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'audit.close')));

-- Workspace RLS: root cause of "Forbidden" was current_company_id() being NULL for Platform Owner.
DROP POLICY IF EXISTS ws_sessions_select ON public.workspace_sessions;
DROP POLICY IF EXISTS ws_sessions_insert ON public.workspace_sessions;
DROP POLICY IF EXISTS ws_sessions_update ON public.workspace_sessions;
DROP POLICY IF EXISTS ws_sessions_delete ON public.workspace_sessions;
CREATE POLICY ws_sessions_select ON public.workspace_sessions FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));
CREATE POLICY ws_sessions_insert ON public.workspace_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND user_id = auth.uid()));
CREATE POLICY ws_sessions_update ON public.workspace_sessions FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))))
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));
CREATE POLICY ws_sessions_delete ON public.workspace_sessions FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));

DROP POLICY IF EXISTS ws_files_select ON public.workspace_files;
DROP POLICY IF EXISTS ws_files_insert ON public.workspace_files;
DROP POLICY IF EXISTS ws_files_delete ON public.workspace_files;
CREATE POLICY ws_files_select ON public.workspace_files FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));
CREATE POLICY ws_files_insert ON public.workspace_files FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND user_id = auth.uid()));
CREATE POLICY ws_files_delete ON public.workspace_files FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));

DROP POLICY IF EXISTS ws_msgs_select ON public.workspace_messages;
DROP POLICY IF EXISTS ws_msgs_insert ON public.workspace_messages;
CREATE POLICY ws_msgs_select ON public.workspace_messages FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));
CREATE POLICY ws_msgs_insert ON public.workspace_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND user_id = auth.uid()));

DROP POLICY IF EXISTS ws_arts_select ON public.workspace_artifacts;
DROP POLICY IF EXISTS ws_arts_insert ON public.workspace_artifacts;
DROP POLICY IF EXISTS ws_arts_delete ON public.workspace_artifacts;
CREATE POLICY ws_arts_select ON public.workspace_artifacts FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));
CREATE POLICY ws_arts_insert ON public.workspace_artifacts FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR (company_id = public.current_company_id() AND user_id = auth.uid()));
CREATE POLICY ws_arts_delete ON public.workspace_artifacts FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR (company_id = public.current_company_id() AND (user_id = auth.uid() OR public.has_permission(auth.uid(),'workspace.manage'))));

-- Storage policies for KB and workspace temp buckets.
DROP POLICY IF EXISTS "company admins upload kb files" ON storage.objects;
DROP POLICY IF EXISTS "company admins update kb files" ON storage.objects;
DROP POLICY IF EXISTS "company admins delete kb files" ON storage.objects;
DROP POLICY IF EXISTS "company members read kb files" ON storage.objects;
CREATE POLICY "company admins upload kb files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='knowledge-docs' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND public.has_permission(auth.uid(),'knowledge.manage'))));
CREATE POLICY "company admins update kb files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='knowledge-docs' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND public.has_permission(auth.uid(),'knowledge.manage'))))
  WITH CHECK (bucket_id='knowledge-docs' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND public.has_permission(auth.uid(),'knowledge.manage'))));
CREATE POLICY "company admins delete kb files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='knowledge-docs' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND public.has_permission(auth.uid(),'knowledge.manage'))));
CREATE POLICY "company members read kb files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='knowledge-docs' AND (public.is_platform_admin() OR (storage.foldername(name))[1]=public.current_company_id()::text));

DROP POLICY IF EXISTS ws_storage_select ON storage.objects;
DROP POLICY IF EXISTS ws_storage_insert ON storage.objects;
DROP POLICY IF EXISTS ws_storage_delete ON storage.objects;
CREATE POLICY ws_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='workspace-temp' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND (owner=auth.uid() OR public.has_permission(auth.uid(),'workspace.manage')))));
CREATE POLICY ws_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='workspace-temp' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND owner=auth.uid())));
CREATE POLICY ws_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='workspace-temp' AND (public.is_platform_admin() OR ((storage.foldername(name))[1]=public.current_company_id()::text AND (owner=auth.uid() OR public.has_permission(auth.uid(),'workspace.manage')))));

-- Preserve permanent owner after the policy/function rewrites too.
SELECT public.ensure_platform_owner();
