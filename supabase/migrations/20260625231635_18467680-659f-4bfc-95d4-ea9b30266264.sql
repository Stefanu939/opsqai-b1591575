-- Tighten notifications policies
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_company_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS notif_delete ON public.notifications;
CREATE POLICY notif_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (
    company_id = public.current_company_id()
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Allow users to delete their own workspace messages (scoped to their session/company)
CREATE POLICY workspace_messages_delete_own ON public.workspace_messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND company_id = public.current_company_id()
  );
