-- OPSQAI Self-Hosted — 0015 Academy (learning paths / chapters / lessons /
-- enrollments / progress / quizzes / certificates / retraining / settings).
--
-- Mirrors the Cloud academy_* table shapes consumed by IAcademyRepository.
-- Self-Hosted is single-tenant: company_id is the synthetic
-- OPSQAI_INSTALL_ID value supplied by the app layer. No RLS, no FKs to
-- Cloud-only tables (public.companies / public.profiles); enums are TEXT.

BEGIN;

CREATE TABLE IF NOT EXISTS public.academy_learning_paths (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  department_id     UUID,
  title             TEXT NOT NULL,
  description       TEXT,
  language          TEXT NOT NULL DEFAULT 'en',
  target_role       TEXT,
  target_position   TEXT,
  experience_level  TEXT,
  employment_type   TEXT,
  mandatory         BOOLEAN NOT NULL DEFAULT FALSE,
  passing_score     INTEGER NOT NULL DEFAULT 80,
  difficulty        TEXT NOT NULL DEFAULT 'beginner',
  publish_status    TEXT NOT NULL DEFAULT 'draft',
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.academy_learning_paths_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_learning_paths_touch_updated_at ON public.academy_learning_paths;
CREATE TRIGGER academy_learning_paths_touch_updated_at
  BEFORE UPDATE ON public.academy_learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.academy_learning_paths_touch_updated_at();

CREATE INDEX IF NOT EXISTS academy_learning_paths_company_idx ON public.academy_learning_paths(company_id);
CREATE INDEX IF NOT EXISTS academy_learning_paths_department_idx ON public.academy_learning_paths(department_id);

CREATE TABLE IF NOT EXISTS public.academy_chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  path_id     UUID NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  summary     TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_chapters_path_idx ON public.academy_chapters(path_id, order_index);

CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID NOT NULL,
  chapter_id               UUID NOT NULL REFERENCES public.academy_chapters(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  objectives               JSONB NOT NULL DEFAULT '[]'::JSONB,
  explanation              TEXT,
  examples                 TEXT,
  best_practices           TEXT,
  summary                  TEXT,
  language                 TEXT NOT NULL DEFAULT 'en',
  estimated_minutes        INTEGER NOT NULL DEFAULT 10,
  source_document_id       UUID,
  source_document_version  INTEGER,
  publish_status           TEXT NOT NULL DEFAULT 'draft',
  order_index              INTEGER NOT NULL DEFAULT 0,
  version                  INTEGER NOT NULL DEFAULT 1,
  created_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.academy_lessons_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_lessons_touch_updated_at ON public.academy_lessons;
CREATE TRIGGER academy_lessons_touch_updated_at
  BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.academy_lessons_touch_updated_at();

CREATE INDEX IF NOT EXISTS academy_lessons_chapter_idx ON public.academy_lessons(chapter_id, order_index);

CREATE TABLE IF NOT EXISTS public.academy_lesson_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  snapshot    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_lesson_versions_lesson_idx ON public.academy_lesson_versions(lesson_id, version DESC);

-- Snapshot the pre-update lesson row into academy_lesson_versions so
-- restoreLessonVersion() and listLessonVersions() have history, mirroring
-- Cloud's version-on-write behaviour.
CREATE OR REPLACE FUNCTION public.academy_lessons_snapshot_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.academy_lesson_versions (lesson_id, version, snapshot)
  VALUES (
    OLD.id,
    OLD.version,
    jsonb_build_object(
      'title', OLD.title,
      'objectives', OLD.objectives,
      'explanation', OLD.explanation,
      'examples', OLD.examples,
      'best_practices', OLD.best_practices,
      'summary', OLD.summary
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_lessons_snapshot_version ON public.academy_lessons;
CREATE TRIGGER academy_lessons_snapshot_version
  BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.academy_lessons_snapshot_version();

CREATE TABLE IF NOT EXISTS public.academy_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  path_id       UUID NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'assigned',
  mandatory     BOOLEAN NOT NULL DEFAULT FALSE,
  priority      TEXT NOT NULL DEFAULT 'normal',
  due_at        TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  assigned_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (path_id, user_id)
);

CREATE INDEX IF NOT EXISTS academy_enrollments_user_idx ON public.academy_enrollments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS academy_enrollments_path_idx ON public.academy_enrollments(path_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.academy_lesson_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL,
  enrollment_id       UUID NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  lesson_id           UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'not_started',
  attempts            INTEGER NOT NULL DEFAULT 0,
  last_score          INTEGER,
  time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
  notes               TEXT,
  completed_at        TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ,
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS academy_lesson_progress_enrollment_idx ON public.academy_lesson_progress(enrollment_id);

CREATE TABLE IF NOT EXISTS public.academy_quiz_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID,
  lesson_id         UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  questions         JSONB NOT NULL DEFAULT '[]'::JSONB,
  answers           JSONB NOT NULL DEFAULT '[]'::JSONB,
  score             INTEGER NOT NULL DEFAULT 0,
  passed            BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds  INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_quiz_attempts_lesson_idx ON public.academy_quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS academy_quiz_attempts_user_idx ON public.academy_quiz_attempts(user_id);

CREATE TABLE IF NOT EXISTS public.academy_certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL,
  enrollment_id    UUID NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  path_id          UUID NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  final_score      INTEGER NOT NULL DEFAULT 0,
  pdf_path         TEXT,
  qr_payload       TEXT,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at       TIMESTAMPTZ,
  UNIQUE (enrollment_id),
  UNIQUE (certificate_code)
);

CREATE INDEX IF NOT EXISTS academy_certificates_user_idx ON public.academy_certificates(user_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS public.academy_retraining_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  path_id       UUID NOT NULL REFERENCES public.academy_learning_paths(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  triggered_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_retraining_events_company_idx ON public.academy_retraining_events(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.academy_settings (
  company_id            UUID PRIMARY KEY,
  passing_score         INTEGER NOT NULL DEFAULT 80,
  quiz_min              INTEGER NOT NULL DEFAULT 5,
  quiz_max              INTEGER NOT NULL DEFAULT 10,
  default_difficulty    TEXT NOT NULL DEFAULT 'beginner',
  certificate_template  JSONB NOT NULL DEFAULT '{}'::JSONB,
  languages             JSONB NOT NULL DEFAULT '["en"]'::JSONB
);

COMMIT;
