
DO $$ BEGIN
  CREATE TYPE public.academy_enrollment_status AS ENUM ('assigned','in_progress','completed','overdue','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.academy_progress_status AS ENUM ('not_started','in_progress','completed','needs_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.academy_publish_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.academy_company_visible(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin() OR _company = public.current_company_id()
$$;
REVOKE ALL ON FUNCTION public.academy_company_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_company_visible(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.academy_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_departments TO authenticated;
GRANT ALL ON public.academy_departments TO service_role;
ALTER TABLE public.academy_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_dept_read" ON public.academy_departments FOR SELECT TO authenticated
  USING (public.academy_company_visible(company_id));
CREATE POLICY "academy_dept_write" ON public.academy_departments FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_dept_touch BEFORE UPDATE ON public.academy_departments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.academy_departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'en',
  target_role text,
  target_position text,
  experience_level text,
  employment_type text,
  mandatory boolean NOT NULL DEFAULT false,
  passing_score int NOT NULL DEFAULT 70,
  difficulty text NOT NULL DEFAULT 'standard',
  order_index int NOT NULL DEFAULT 0,
  publish_status public.academy_publish_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academy_paths_company_idx ON public.academy_learning_paths(company_id);
CREATE INDEX IF NOT EXISTS academy_paths_dept_idx ON public.academy_learning_paths(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_learning_paths TO authenticated;
GRANT ALL ON public.academy_learning_paths TO service_role;
ALTER TABLE public.academy_learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_paths_read" ON public.academy_learning_paths FOR SELECT TO authenticated
  USING (public.academy_company_visible(company_id));
CREATE POLICY "academy_paths_write" ON public.academy_learning_paths FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_paths_touch BEFORE UPDATE ON public.academy_learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academy_chapters_path_idx ON public.academy_chapters(path_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_chapters TO authenticated;
GRANT ALL ON public.academy_chapters TO service_role;
ALTER TABLE public.academy_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_chapters_read" ON public.academy_chapters FOR SELECT TO authenticated
  USING (public.academy_company_visible(company_id));
CREATE POLICY "academy_chapters_write" ON public.academy_chapters FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_chapters_touch BEFORE UPDATE ON public.academy_chapters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.academy_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  examples text,
  best_practices text,
  summary text,
  language text NOT NULL DEFAULT 'en',
  estimated_minutes int NOT NULL DEFAULT 10,
  source_document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  source_document_version int,
  version int NOT NULL DEFAULT 1,
  publish_status public.academy_publish_status NOT NULL DEFAULT 'draft',
  order_index int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academy_lessons_chapter_idx ON public.academy_lessons(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS academy_lessons_source_idx ON public.academy_lessons(source_document_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lessons TO authenticated;
GRANT ALL ON public.academy_lessons TO service_role;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_lessons_read" ON public.academy_lessons FOR SELECT TO authenticated
  USING (public.academy_company_visible(company_id));
CREATE POLICY "academy_lessons_write" ON public.academy_lessons FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_lessons_touch BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_lesson_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academy_lesson_versions_idx ON public.academy_lesson_versions(lesson_id, version DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lesson_versions TO authenticated;
GRANT ALL ON public.academy_lesson_versions TO service_role;
ALTER TABLE public.academy_lesson_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_lv_read" ON public.academy_lesson_versions FOR SELECT TO authenticated
  USING (public.academy_company_visible(company_id));
CREATE POLICY "academy_lv_write" ON public.academy_lesson_versions FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));

CREATE TABLE IF NOT EXISTS public.academy_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.academy_enrollment_status NOT NULL DEFAULT 'assigned',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mandatory boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, user_id)
);
CREATE INDEX IF NOT EXISTS academy_enroll_user_idx ON public.academy_enrollments(user_id);
CREATE INDEX IF NOT EXISTS academy_enroll_company_idx ON public.academy_enrollments(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_enrollments TO authenticated;
GRANT ALL ON public.academy_enrollments TO service_role;
ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_enroll_self_read" ON public.academy_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)));
CREATE POLICY "academy_enroll_self_upsert" ON public.academy_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND public.academy_company_visible(company_id))
    OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  );
CREATE POLICY "academy_enroll_self_update" ON public.academy_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)))
  WITH CHECK (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)));
CREATE POLICY "academy_enroll_manager_delete" ON public.academy_enrollments FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_enroll_touch BEFORE UPDATE ON public.academy_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.academy_progress_status NOT NULL DEFAULT 'not_started',
  attempts int NOT NULL DEFAULT 0,
  last_score numeric(5,2),
  time_spent_seconds int NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS academy_progress_user_idx ON public.academy_lesson_progress(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lesson_progress TO authenticated;
GRANT ALL ON public.academy_lesson_progress TO service_role;
ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_prog_read" ON public.academy_lesson_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)));
CREATE POLICY "academy_prog_write" ON public.academy_lesson_progress FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)))
  WITH CHECK (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)));
CREATE TRIGGER trg_academy_prog_touch BEFORE UPDATE ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL,
  score numeric(5,2) NOT NULL,
  passed boolean NOT NULL,
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academy_attempts_lesson_idx ON public.academy_quiz_attempts(lesson_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_quiz_attempts TO authenticated;
GRANT ALL ON public.academy_quiz_attempts TO service_role;
ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_att_read" ON public.academy_quiz_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)));
CREATE POLICY "academy_att_write" ON public.academy_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.academy_company_visible(company_id));

CREATE TABLE IF NOT EXISTS public.academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_code uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  final_score numeric(5,2) NOT NULL DEFAULT 0,
  pdf_path text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  qr_payload text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academy_cert_user_idx ON public.academy_certificates(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_certificates TO authenticated;
GRANT ALL ON public.academy_certificates TO service_role;
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_cert_read" ON public.academy_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id)));
CREATE POLICY "academy_cert_write" ON public.academy_certificates FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.certify') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.certify') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_cert_touch BEFORE UPDATE ON public.academy_certificates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_retraining_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  reason text NOT NULL,
  source_document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  affected_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_retraining_events TO authenticated;
GRANT ALL ON public.academy_retraining_events TO service_role;
ALTER TABLE public.academy_retraining_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_rt_read" ON public.academy_retraining_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE POLICY "academy_rt_write" ON public.academy_retraining_events FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));

CREATE TABLE IF NOT EXISTS public.academy_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  passing_score int NOT NULL DEFAULT 70,
  quiz_min int NOT NULL DEFAULT 3,
  quiz_max int NOT NULL DEFAULT 5,
  default_difficulty text NOT NULL DEFAULT 'standard',
  certificate_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  languages text[] NOT NULL DEFAULT ARRAY['en','de','ro'],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_settings TO authenticated;
GRANT ALL ON public.academy_settings TO service_role;
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_settings_read" ON public.academy_settings FOR SELECT TO authenticated
  USING (public.academy_company_visible(company_id));
CREATE POLICY "academy_settings_write" ON public.academy_settings FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id))
  WITH CHECK (public.has_permission(auth.uid(),'academy.manage') AND public.academy_company_visible(company_id));
CREATE TRIGGER trg_academy_settings_touch BEFORE UPDATE ON public.academy_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.role_permissions (role, permission) VALUES
  ('platform_owner','academy.manage'),
  ('platform_owner','academy.publish'),
  ('platform_owner','academy.certify'),
  ('platform_owner','academy.learn'),
  ('platform_admin','academy.manage'),
  ('platform_admin','academy.publish'),
  ('platform_admin','academy.certify'),
  ('platform_admin','academy.learn'),
  ('admin','academy.manage'),
  ('admin','academy.publish'),
  ('admin','academy.certify'),
  ('admin','academy.learn'),
  ('manager','academy.manage'),
  ('manager','academy.publish'),
  ('manager','academy.certify'),
  ('manager','academy.learn'),
  ('supervisor','academy.manage'),
  ('supervisor','academy.learn'),
  ('team_leader','academy.learn'),
  ('operator','academy.learn'),
  ('employee','academy.learn'),
  ('viewer','academy.learn')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.academy_on_sop_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.version IS DISTINCT FROM OLD.version)
     OR (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    FOR r IN
      SELECT l.id AS lesson_id, l.company_id
      FROM public.academy_lessons l
      WHERE l.source_document_id = NEW.id AND l.publish_status = 'published'
    LOOP
      INSERT INTO public.academy_retraining_events (company_id, lesson_id, reason, source_document_id, affected_count)
      VALUES (r.company_id, r.lesson_id, 'source_sop_updated', NEW.id,
        (SELECT count(*) FROM public.academy_lesson_progress p
         WHERE p.lesson_id = r.lesson_id AND p.status IN ('completed','in_progress')));
      UPDATE public.academy_lesson_progress
        SET status = 'needs_review', updated_at = now()
        WHERE lesson_id = r.lesson_id AND status = 'completed';
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_academy_on_sop_change ON public.knowledge_documents;
CREATE TRIGGER trg_academy_on_sop_change AFTER UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.academy_on_sop_change();

CREATE OR REPLACE FUNCTION public.academy_snapshot_lesson()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.explanation IS DISTINCT FROM OLD.explanation
          OR NEW.examples IS DISTINCT FROM OLD.examples
          OR NEW.best_practices IS DISTINCT FROM OLD.best_practices
          OR NEW.summary IS DISTINCT FROM OLD.summary
          OR NEW.objectives IS DISTINCT FROM OLD.objectives
          OR NEW.title IS DISTINCT FROM OLD.title) THEN
    INSERT INTO public.academy_lesson_versions (company_id, lesson_id, version, snapshot, created_by)
    VALUES (OLD.company_id, OLD.id, OLD.version,
      jsonb_build_object('title',OLD.title,'objectives',OLD.objectives,'explanation',OLD.explanation,
                         'examples',OLD.examples,'best_practices',OLD.best_practices,'summary',OLD.summary),
      auth.uid());
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_academy_snapshot_lesson ON public.academy_lessons;
CREATE TRIGGER trg_academy_snapshot_lesson BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.academy_snapshot_lesson();

CREATE OR REPLACE FUNCTION public.academy_kpis(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.academy_company_visible(p_company) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'departments', (SELECT count(*) FROM academy_departments WHERE company_id=p_company),
    'paths', (SELECT count(*) FROM academy_learning_paths WHERE company_id=p_company),
    'lessons', (SELECT count(*) FROM academy_lessons WHERE company_id=p_company),
    'enrollments', (SELECT count(*) FROM academy_enrollments WHERE company_id=p_company),
    'completed', (SELECT count(*) FROM academy_enrollments WHERE company_id=p_company AND status='completed'),
    'inProgress', (SELECT count(*) FROM academy_enrollments WHERE company_id=p_company AND status='in_progress'),
    'overdue', (SELECT count(*) FROM academy_enrollments WHERE company_id=p_company AND status='assigned' AND due_at IS NOT NULL AND due_at < now()),
    'avgScore', COALESCE((SELECT round(avg(score)::numeric,2) FROM academy_quiz_attempts WHERE company_id=p_company),0),
    'completionRate', COALESCE((SELECT round((count(*) FILTER (WHERE status='completed'))::numeric / NULLIF(count(*),0) * 100, 1)
      FROM academy_enrollments WHERE company_id=p_company),0),
    'certificates', (SELECT count(*) FROM academy_certificates WHERE company_id=p_company AND NOT revoked),
    'trainingHours', COALESCE((SELECT round((sum(time_spent_seconds)/3600.0)::numeric,1) FROM academy_lesson_progress WHERE company_id=p_company),0),
    'retrainingRequired', (SELECT count(*) FROM academy_lesson_progress WHERE company_id=p_company AND status='needs_review')
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.academy_heatmap(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.academy_company_visible(p_company) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x) INTO r FROM (
    SELECT l.id AS lesson_id, l.title,
      count(a.*) AS attempts,
      COALESCE(round(avg(a.score)::numeric,1),0) AS avg_score,
      COALESCE(round((count(*) FILTER (WHERE NOT a.passed))::numeric / NULLIF(count(*),0) * 100,1),0) AS failure_rate,
      COALESCE((SELECT round((avg(p.time_spent_seconds)/60.0)::numeric,1)
                FROM academy_lesson_progress p WHERE p.lesson_id=l.id),0) AS avg_minutes
    FROM academy_lessons l
    LEFT JOIN academy_quiz_attempts a ON a.lesson_id=l.id
    WHERE l.company_id=p_company
    GROUP BY l.id, l.title
    ORDER BY failure_rate DESC, attempts DESC
    LIMIT 30
  ) x;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.academy_department_performance(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.academy_company_visible(p_company) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(x) INTO r FROM (
    SELECT d.id, d.name,
      count(DISTINCT e.user_id) AS learners,
      count(*) FILTER (WHERE e.status='completed') AS completed,
      COALESCE(round((count(*) FILTER (WHERE e.status='completed'))::numeric / NULLIF(count(*),0) * 100,1),0) AS completion_rate
    FROM academy_departments d
    LEFT JOIN academy_learning_paths p ON p.department_id=d.id
    LEFT JOIN academy_enrollments e ON e.path_id=p.id
    WHERE d.company_id=p_company
    GROUP BY d.id, d.name
    ORDER BY d.name
  ) x;
  RETURN COALESCE(r,'[]'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION public.academy_kpis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_heatmap(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_department_performance(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.academy_verify_certificate(_code uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'valid', NOT COALESCE(c.revoked, true),
    'issuedAt', c.issued_at,
    'score', c.final_score,
    'pathTitle', p.title,
    'company', co.name,
    'recipient', COALESCE(pr.full_name, ''),
    'certificateCode', c.certificate_code
  )
  FROM public.academy_certificates c
  JOIN public.academy_learning_paths p ON p.id = c.path_id
  JOIN public.companies co ON co.id = c.company_id
  LEFT JOIN public.profiles pr ON pr.id = c.user_id
  WHERE c.certificate_code = _code
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.academy_verify_certificate(uuid) TO anon, authenticated;
