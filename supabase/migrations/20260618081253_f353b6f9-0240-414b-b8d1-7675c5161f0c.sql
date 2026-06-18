CREATE EXTENSION IF NOT EXISTS vector;

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.departments (name) VALUES
  ('Warehouse'), ('Transport'), ('Dispatch'), ('Administration'), ('Operations'), ('Other')
  ON CONFLICT (name) DO NOTHING;

-- Expand profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;
CREATE POLICY "admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins insert any profile" ON public.profiles;
CREATE POLICY "admins insert any profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Knowledge docs processing fields
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS chunk_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doc_code text;

-- Vector store
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  token_count int,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read chunks" ON public.document_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage chunks" ON public.document_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS document_chunks_doc_idx ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 6,
  min_similarity float DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  doc_title text,
  doc_code text,
  doc_category text,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.document_id, d.title, d.doc_code, d.category, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Messages: citations
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sources jsonb;

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid,
  question text NOT NULL,
  answer_preview text,
  sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own audit" ON public.audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admins view all audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON public.audit_log(user_id);

-- Team leaders can insert FAQs
DROP POLICY IF EXISTS "team leaders insert faqs" ON public.faqs;
CREATE POLICY "team leaders insert faqs" ON public.faqs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team_leader') OR public.has_role(auth.uid(), 'admin'));

-- Updated signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_count INT;
  assigned_role app_role;
  meta jsonb;
  fn text;
  ln text;
  full_n text;
  combined text;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  combined := COALESCE(meta->>'full_name', meta->>'name', '');
  fn := COALESCE(meta->>'first_name', NULLIF(split_part(combined, ' ', 1), ''));
  ln := COALESCE(meta->>'last_name',
                 NULLIF(substring(combined FROM nullif(position(' ' IN combined), 0) + 1), ''));
  full_n := COALESCE(NULLIF(combined, ''), NULLIF(trim(concat_ws(' ', fn, ln)), ''), split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name, first_name, last_name, language_pref)
  VALUES (NEW.id, full_n, fn, ln, 'de')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'employee';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $function$;