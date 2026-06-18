
-- Internal Requests
CREATE TABLE public.internal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  question text NOT NULL,
  context text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','answered','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  answer text,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  promoted_to_faq_id uuid REFERENCES public.faqs(id) ON DELETE SET NULL,
  promoted_to_kb_id uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_requests_company ON public.internal_requests(company_id, status, created_at DESC);
CREATE INDEX idx_internal_requests_user ON public.internal_requests(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_requests TO authenticated;
GRANT ALL ON public.internal_requests TO service_role;

ALTER TABLE public.internal_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: creator, or company staff (admin/manager/team_leader), or platform admin
CREATE POLICY "view own or staff in company"
  ON public.internal_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
        OR public.has_role(auth.uid(), 'team_leader')
      )
    )
    OR public.is_platform_admin()
  );

-- INSERT: any signed-in company member creates own request
CREATE POLICY "create own request in company"
  ON public.internal_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = public.current_company_id()
  );

-- UPDATE: creator can close their own; staff can answer/manage
CREATE POLICY "update own or staff in company"
  ON public.internal_requests FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND company_id = public.current_company_id())
    OR (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
        OR public.has_role(auth.uid(), 'team_leader')
      )
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (user_id = auth.uid() AND company_id = public.current_company_id())
    OR (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
        OR public.has_role(auth.uid(), 'team_leader')
      )
    )
    OR public.is_platform_admin()
  );

-- DELETE: admin/platform_admin
CREATE POLICY "delete by admin or platform"
  ON public.internal_requests FOR DELETE
  TO authenticated
  USING (
    (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
    OR public.is_platform_admin()
  );

CREATE TRIGGER touch_internal_requests
  BEFORE UPDATE ON public.internal_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Expand FAQ write access to include managers (in addition to admin and team_leader)
DROP POLICY IF EXISTS "company admins or team_leaders write faqs" ON public.faqs;
CREATE POLICY "company staff write faqs"
  ON public.faqs FOR ALL
  TO authenticated
  USING (
    (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
        OR public.has_role(auth.uid(), 'team_leader')
      )
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
        OR public.has_role(auth.uid(), 'team_leader')
      )
    )
    OR public.is_platform_admin()
  );

-- Expand KB document write access to admins and managers
DROP POLICY IF EXISTS "company admins manage documents" ON public.knowledge_documents;
CREATE POLICY "company admins or managers manage documents"
  ON public.knowledge_documents FOR ALL
  TO authenticated
  USING (
    (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
      )
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (
      company_id = public.current_company_id()
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
      )
    )
    OR public.is_platform_admin()
  );
