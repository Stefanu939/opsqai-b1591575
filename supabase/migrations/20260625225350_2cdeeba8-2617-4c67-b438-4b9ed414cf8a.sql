
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS workspace_retention text NOT NULL DEFAULT 'immediate'
    CHECK (workspace_retention IN ('immediate','1h','24h','7d','manual'));

CREATE TABLE IF NOT EXISTS public.workspace_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New workspace',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_sessions TO authenticated;
GRANT ALL ON public.workspace_sessions TO service_role;
ALTER TABLE public.workspace_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_sessions_select ON public.workspace_sessions FOR SELECT TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY ws_sessions_insert ON public.workspace_sessions FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY ws_sessions_update ON public.workspace_sessions FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND user_id = auth.uid())
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY ws_sessions_delete ON public.workspace_sessions FOR DELETE TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE TRIGGER ws_sessions_touch BEFORE UPDATE ON public.workspace_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime text,
  size_bytes bigint,
  storage_path text NOT NULL,
  extracted_text text,
  status text NOT NULL DEFAULT 'ready',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_files TO authenticated;
GRANT ALL ON public.workspace_files TO service_role;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_files_select ON public.workspace_files FOR SELECT TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY ws_files_insert ON public.workspace_files FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY ws_files_delete ON public.workspace_files FOR DELETE TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE INDEX IF NOT EXISTS ws_files_session_idx ON public.workspace_files(session_id);
CREATE INDEX IF NOT EXISTS ws_files_expires_idx ON public.workspace_files(expires_at);

CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  parts jsonb,
  attachments jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_messages TO authenticated;
GRANT ALL ON public.workspace_messages TO service_role;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_msgs_select ON public.workspace_messages FOR SELECT TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY ws_msgs_insert ON public.workspace_messages FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE INDEX IF NOT EXISTS ws_msgs_session_idx ON public.workspace_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS public.workspace_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_artifacts TO authenticated;
GRANT ALL ON public.workspace_artifacts TO service_role;
ALTER TABLE public.workspace_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_arts_select ON public.workspace_artifacts FOR SELECT TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY ws_arts_insert ON public.workspace_artifacts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY ws_arts_delete ON public.workspace_artifacts FOR DELETE TO authenticated
  USING (company_id = public.current_company_id()
         AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE INDEX IF NOT EXISTS ws_arts_session_idx ON public.workspace_artifacts(session_id);
CREATE INDEX IF NOT EXISTS ws_arts_expires_idx ON public.workspace_artifacts(expires_at);

CREATE OR REPLACE FUNCTION public.workspace_cleanup_expired()
RETURNS TABLE(files_deleted int, artifacts_deleted int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE f int; a int;
BEGIN
  WITH d AS (DELETE FROM public.workspace_files WHERE expires_at IS NOT NULL AND expires_at < now() RETURNING 1)
  SELECT count(*) INTO f FROM d;
  WITH d AS (DELETE FROM public.workspace_artifacts WHERE expires_at IS NOT NULL AND expires_at < now() RETURNING 1)
  SELECT count(*) INTO a FROM d;
  RETURN QUERY SELECT f, a;
END $$;
REVOKE EXECUTE ON FUNCTION public.workspace_cleanup_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_cleanup_expired() TO service_role;

-- Storage policies on workspace-temp bucket (paths = company_id/session_id/filename)
CREATE POLICY ws_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'workspace-temp'
         AND (storage.foldername(name))[1] = public.current_company_id()::text
         AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY ws_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workspace-temp'
              AND (storage.foldername(name))[1] = public.current_company_id()::text
              AND owner = auth.uid());
CREATE POLICY ws_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'workspace-temp'
         AND (storage.foldername(name))[1] = public.current_company_id()::text
         AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));

SELECT cron.schedule('workspace-cleanup-expired','*/15 * * * *',$$SELECT public.workspace_cleanup_expired();$$);
