-- Scope message_feedback admin delete to current company
DROP POLICY IF EXISTS mf_delete ON public.message_feedback;
CREATE POLICY mf_delete ON public.message_feedback
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      AND company_id = public.current_company_id()
    )
  );

-- Document intentional immutability for workspace_files and workspace_artifacts
COMMENT ON TABLE public.workspace_files IS
  'Immutable by RLS: no UPDATE policy. Rows are written once at upload and only mutated by service_role during processing/cleanup. Clients must DELETE+INSERT instead of UPDATE.';
COMMENT ON TABLE public.workspace_artifacts IS
  'Immutable by RLS: no UPDATE policy. Generated artifacts are write-once; service_role handles any backend mutations and expiration cleanup.';
