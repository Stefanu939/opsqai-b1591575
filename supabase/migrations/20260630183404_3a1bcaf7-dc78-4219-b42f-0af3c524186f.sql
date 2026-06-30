
-- Drop global unique on name; replace with per-company unique (case-insensitive).
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS departments_company_name_uniq
  ON public.departments (company_id, lower(name));

-- Extend the manage policy so managers can also create/update departments in their own company.
DROP POLICY IF EXISTS "company admins manage departments" ON public.departments;
CREATE POLICY "company admins or managers manage departments"
ON public.departments
TO authenticated
USING (
  is_platform_admin()
  OR (
    company_id = current_company_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
)
WITH CHECK (
  is_platform_admin()
  OR (
    company_id = current_company_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);
