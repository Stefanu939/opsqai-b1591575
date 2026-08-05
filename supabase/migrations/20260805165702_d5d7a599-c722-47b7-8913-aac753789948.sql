DROP POLICY IF EXISTS "managers insert ai_audits" ON public.ai_audits;
CREATE POLICY "managers insert ai_audits" ON public.ai_audits
FOR INSERT TO authenticated
WITH CHECK (
  is_platform_admin()
  OR (
    company_id = current_company_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);