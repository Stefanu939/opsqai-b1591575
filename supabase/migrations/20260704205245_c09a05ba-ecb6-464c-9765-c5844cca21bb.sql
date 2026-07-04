
-- =====================================================================
-- Academy LMS — Batch A: schema, permissions, notifications, triggers
-- =====================================================================

-- 1. Enrollment: priority + reminder-guard column
ALTER TABLE public.academy_enrollments
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS notified_stages text[] NOT NULL DEFAULT '{}'::text[];

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academy_enrollments_priority_check') THEN
    ALTER TABLE public.academy_enrollments
      ADD CONSTRAINT academy_enrollments_priority_check
      CHECK (priority IN ('low','normal','high'));
  END IF;
END $$;

-- 2. Lesson progress: personal notes
ALTER TABLE public.academy_lesson_progress
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. New RBAC permission: academy.assign (managers + admins + platform admins)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin','academy.assign'),
  ('manager','academy.assign'),
  ('supervisor','academy.assign'),
  ('platform_admin','academy.assign'),
  ('platform_owner','academy.assign'),
  ('workspace_owner','academy.assign')
ON CONFLICT (role, permission) DO NOTHING;

-- 4. Notifications: allow new Academy kinds
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
    'sop_outdated','faq_outdated','new_gap','low_confidence','quarterly_report',
    'sop_critical','sop_approved','audit_completed','doc_review','template_published',
    'critical_sop_missing','ai_sop_generated','workspace_audit_ready',
    'academy.course_assigned','academy.course_due_soon','academy.course_overdue',
    'academy.quiz_available','academy.certificate_earned','academy.path_completed'
  ]));

-- 5. Helper: resolve assignment targets → distinct user_ids for a company
CREATE OR REPLACE FUNCTION public.academy_resolve_targets(
  _company_id uuid,
  _user_ids uuid[],
  _department_ids uuid[],
  _roles app_role[],
  _entire_company boolean
) RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id AS user_id
  FROM public.profiles p
  WHERE p.company_id = _company_id
    AND (
      _entire_company IS TRUE
      OR p.id = ANY (COALESCE(_user_ids, ARRAY[]::uuid[]))
      OR p.department_id = ANY (COALESCE(_department_ids, ARRAY[]::uuid[]))
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id
          AND ur.role = ANY (COALESCE(_roles, ARRAY[]::app_role[]))
      )
    )
$$;

REVOKE ALL ON FUNCTION public.academy_resolve_targets(uuid, uuid[], uuid[], app_role[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_resolve_targets(uuid, uuid[], uuid[], app_role[], boolean) TO authenticated, service_role;

-- 6. Trigger: on enrollment completion, issue certificate + notify learner
CREATE OR REPLACE FUNCTION public.academy_on_enrollment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path_title text;
  v_final_score numeric(5,2);
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- Compute a rough final score from lesson quiz attempts
    SELECT COALESCE(AVG(last_score), 0)
      INTO v_final_score
      FROM public.academy_lesson_progress
     WHERE enrollment_id = NEW.id AND last_score IS NOT NULL;

    -- Issue certificate (idempotent: unique on enrollment_id)
    INSERT INTO public.academy_certificates (
      company_id, enrollment_id, path_id, user_id, final_score
    )
    VALUES (NEW.company_id, NEW.id, NEW.path_id, NEW.user_id, v_final_score)
    ON CONFLICT (enrollment_id) DO NOTHING;

    -- Notify: path completed + certificate earned
    SELECT title INTO v_path_title FROM public.academy_learning_paths WHERE id = NEW.path_id;

    INSERT INTO public.notifications (company_id, user_id, kind, title, body, link, payload)
    VALUES
      (NEW.company_id, NEW.user_id, 'academy.path_completed',
       'Course completed: ' || COALESCE(v_path_title,'Course'),
       'Great work — your progress has been recorded.',
       '/app/academy/certificates',
       jsonb_build_object('path_id', NEW.path_id, 'enrollment_id', NEW.id)),
      (NEW.company_id, NEW.user_id, 'academy.certificate_earned',
       'Certificate earned: ' || COALESCE(v_path_title,'Course'),
       'Your certificate is ready to download.',
       '/app/academy/certificates',
       jsonb_build_object('path_id', NEW.path_id, 'enrollment_id', NEW.id));

    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_enrollment_completed_trg ON public.academy_enrollments;
CREATE TRIGGER academy_enrollment_completed_trg
  BEFORE UPDATE ON public.academy_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.academy_on_enrollment_completed();

-- 7. Nightly reminder cron: due-soon (<=3d) and overdue
CREATE OR REPLACE FUNCTION public.academy_send_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent integer := 0;
  r RECORD;
  v_title text;
BEGIN
  -- Due soon: within next 3 days, not yet notified as 'due_soon'
  FOR r IN
    SELECT e.*, p.title AS path_title
      FROM public.academy_enrollments e
      JOIN public.academy_learning_paths p ON p.id = e.path_id
     WHERE e.status IN ('assigned','in_progress')
       AND e.due_at IS NOT NULL
       AND e.due_at > now()
       AND e.due_at <= now() + interval '3 days'
       AND NOT ('due_soon' = ANY (e.notified_stages))
  LOOP
    INSERT INTO public.notifications (company_id, user_id, kind, title, body, link, payload)
    VALUES (r.company_id, r.user_id, 'academy.course_due_soon',
      'Training due soon: ' || r.path_title,
      'This mandatory training is due within 3 days.',
      '/app/academy',
      jsonb_build_object('path_id', r.path_id, 'enrollment_id', r.id, 'due_at', r.due_at));

    UPDATE public.academy_enrollments
       SET notified_stages = array_append(notified_stages, 'due_soon')
     WHERE id = r.id;
    v_sent := v_sent + 1;
  END LOOP;

  -- Overdue
  FOR r IN
    SELECT e.*, p.title AS path_title
      FROM public.academy_enrollments e
      JOIN public.academy_learning_paths p ON p.id = e.path_id
     WHERE e.status IN ('assigned','in_progress')
       AND e.due_at IS NOT NULL
       AND e.due_at < now()
       AND NOT ('overdue' = ANY (e.notified_stages))
  LOOP
    INSERT INTO public.notifications (company_id, user_id, kind, title, body, link, payload)
    VALUES (r.company_id, r.user_id, 'academy.course_overdue',
      'Training overdue: ' || r.path_title,
      'This training is past its due date. Please complete it.',
      '/app/academy',
      jsonb_build_object('path_id', r.path_id, 'enrollment_id', r.id, 'due_at', r.due_at));

    UPDATE public.academy_enrollments
       SET notified_stages = array_append(notified_stages, 'overdue'),
           status = 'overdue'
     WHERE id = r.id;
    v_sent := v_sent + 1;
  END LOOP;

  RETURN v_sent;
END;
$$;

REVOKE ALL ON FUNCTION public.academy_send_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_send_reminders() TO service_role;

-- Schedule nightly at 07:00 UTC
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('academy_send_reminders_daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'academy_send_reminders_daily');
    PERFORM cron.schedule(
      'academy_send_reminders_daily',
      '0 7 * * *',
      $cron$SELECT public.academy_send_reminders();$cron$
    );
  END IF;
END $$;
