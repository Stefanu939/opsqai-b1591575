
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon, authenticated;

INSERT INTO public.user_roles (user_id, role, company_id)
SELECT DISTINCT user_id, 'platform_admin'::public.app_role, NULL::uuid
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.match_document_chunks_for_company(
  query_embedding vector,
  match_count integer DEFAULT 6,
  min_similarity double precision DEFAULT 0.3,
  _company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid, document_id uuid, doc_title text, doc_code text,
  doc_category text, chunk_index integer, content text, similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.document_id, d.title, d.doc_code, d.category, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND c.company_id = COALESCE(_company_id, public.current_company_id())
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks_for_company(vector, integer, double precision, uuid) FROM PUBLIC, anon, authenticated;

-- companies
DROP POLICY IF EXISTS "platform admins manage companies" ON public.companies;
CREATE POLICY "platform admins manage companies" ON public.companies FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS "members read own company" ON public.companies;
CREATE POLICY "members read own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());

-- profiles
DROP POLICY IF EXISTS "admins view profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins update profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "members view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "company admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "platform admins insert profiles" ON public.profiles;
CREATE POLICY "members view company profiles" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin() OR id = auth.uid());
CREATE POLICY "company admins manage profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (
    (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
    OR public.is_platform_admin() OR id = auth.uid()
  )
  WITH CHECK (
    (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
    OR public.is_platform_admin() OR id = auth.uid()
  );
CREATE POLICY "platform admins insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "block non-admin role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "members view roles in company" ON public.user_roles;
DROP POLICY IF EXISTS "company admins manage company roles" ON public.user_roles;
DROP POLICY IF EXISTS "only platform admins create platform_admin" ON public.user_roles;
CREATE POLICY "members view roles in company" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
    OR public.is_platform_admin()
  );
CREATE POLICY "company admins manage company roles" ON public.user_roles FOR ALL TO authenticated
  USING (
    (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin') AND role <> 'platform_admin')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin') AND role <> 'platform_admin')
    OR public.is_platform_admin()
  );
CREATE POLICY "only platform admins create platform_admin" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (role <> 'platform_admin' OR public.is_platform_admin());

-- threads
DROP POLICY IF EXISTS "users manage own threads" ON public.threads;
DROP POLICY IF EXISTS "users access own threads in company" ON public.threads;
CREATE POLICY "users access own threads in company" ON public.threads FOR ALL TO authenticated
  USING (
    (user_id = auth.uid() AND company_id = public.current_company_id())
    OR public.is_platform_admin()
    OR (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    (user_id = auth.uid() AND company_id = public.current_company_id())
    OR public.is_platform_admin()
  );

-- messages
DROP POLICY IF EXISTS "users manage own messages" ON public.messages;
DROP POLICY IF EXISTS "users access own messages in company" ON public.messages;
CREATE POLICY "users access own messages in company" ON public.messages FOR ALL TO authenticated
  USING (
    (user_id = auth.uid() AND company_id = public.current_company_id())
    OR public.is_platform_admin()
    OR (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    (user_id = auth.uid() AND company_id = public.current_company_id())
    OR public.is_platform_admin()
  );

-- knowledge_documents
DROP POLICY IF EXISTS "members read documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "admins manage documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "company members read documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "company admins manage documents" ON public.knowledge_documents;
CREATE POLICY "company members read documents" ON public.knowledge_documents FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "company admins manage documents" ON public.knowledge_documents FOR ALL TO authenticated
  USING ((company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_platform_admin())
  WITH CHECK ((company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_platform_admin());

-- document_chunks
DROP POLICY IF EXISTS "members read chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "admins manage chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "company members read chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "company admins manage chunks" ON public.document_chunks;
CREATE POLICY "company members read chunks" ON public.document_chunks FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "company admins manage chunks" ON public.document_chunks FOR ALL TO authenticated
  USING ((company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_platform_admin())
  WITH CHECK ((company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_platform_admin());

-- faqs
DROP POLICY IF EXISTS "members read faqs" ON public.faqs;
DROP POLICY IF EXISTS "admins or team leaders manage faqs" ON public.faqs;
DROP POLICY IF EXISTS "admins manage faqs" ON public.faqs;
DROP POLICY IF EXISTS "company members read faqs" ON public.faqs;
DROP POLICY IF EXISTS "company admins or team_leaders write faqs" ON public.faqs;
CREATE POLICY "company members read faqs" ON public.faqs FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "company admins or team_leaders write faqs" ON public.faqs FOR ALL TO authenticated
  USING (
    (company_id = public.current_company_id()
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_leader')))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (company_id = public.current_company_id()
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_leader')))
    OR public.is_platform_admin()
  );

-- audit_log
DROP POLICY IF EXISTS "users insert their own audit rows" ON public.audit_log;
DROP POLICY IF EXISTS "admins view audit" ON public.audit_log;
DROP POLICY IF EXISTS "managers view audit" ON public.audit_log;
DROP POLICY IF EXISTS "users insert own audit in company" ON public.audit_log;
DROP POLICY IF EXISTS "company admins or managers view audit" ON public.audit_log;
CREATE POLICY "users insert own audit in company" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND company_id = public.current_company_id());
CREATE POLICY "company admins or managers view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (
    (company_id = public.current_company_id()
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
    OR public.is_platform_admin()
  );

-- departments
DROP POLICY IF EXISTS "members read departments" ON public.departments;
DROP POLICY IF EXISTS "admins manage departments" ON public.departments;
DROP POLICY IF EXISTS "company members read departments" ON public.departments;
DROP POLICY IF EXISTS "company admins manage departments" ON public.departments;
CREATE POLICY "company members read departments" ON public.departments FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_platform_admin());
CREATE POLICY "company admins manage departments" ON public.departments FOR ALL TO authenticated
  USING ((company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_platform_admin())
  WITH CHECK ((company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')) OR public.is_platform_admin());

-- Updated new-user handler honors invited company_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta jsonb;
  fn text; ln text; full_n text; combined text;
  invited_company uuid; invited_role public.app_role;
  user_count int;
  default_company uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  combined := COALESCE(meta->>'full_name', meta->>'name', '');
  fn := COALESCE(meta->>'first_name', NULLIF(split_part(combined, ' ', 1), ''));
  ln := COALESCE(meta->>'last_name',
                 NULLIF(substring(combined FROM nullif(position(' ' IN combined), 0) + 1), ''));
  full_n := COALESCE(NULLIF(combined, ''), NULLIF(trim(concat_ws(' ', fn, ln)), ''), split_part(NEW.email, '@', 1));

  invited_company := NULLIF(meta->>'company_id', '')::uuid;
  invited_role := COALESCE(NULLIF(meta->>'role', ''), 'employee')::public.app_role;

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF invited_company IS NULL THEN
    invited_company := default_company;
    IF user_count = 0 THEN
      invited_role := 'admin';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, language_pref, company_id)
  VALUES (NEW.id, full_n, fn, ln, COALESCE(meta->>'language_pref', 'en'), invited_company)
  ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id;

  IF invited_role <> 'platform_admin' THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, invited_role, invited_company)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, 'platform_admin', NULL::uuid)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;
