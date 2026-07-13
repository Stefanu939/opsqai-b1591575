
-- 1) installer_releases: restrict SELECT to platform admins only.
--    All app reads go through supabaseAdmin server-side, so no legitimate
--    authenticated end-user path needs direct table access.
DROP POLICY IF EXISTS "Authenticated users can view releases" ON public.installer_releases;

CREATE POLICY "Platform admins can view releases"
ON public.installer_releases
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- 2) academy_quiz_attempts: tighten INSERT WITH CHECK so clients cannot
--    submit a pre-graded row. The existing triggers already force score=0/
--    passed=false, but express the invariant in the policy for clarity and
--    defense-in-depth.
DROP POLICY IF EXISTS academy_att_write ON public.academy_quiz_attempts;

CREATE POLICY academy_att_insert_pending
ON public.academy_quiz_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.academy_company_visible(company_id)
  AND COALESCE(score, 0) = 0
  AND COALESCE(passed, false) = false
);

-- 3) academy_lesson_progress: block clients from setting completion state.
--    Users may still upsert their own row for benign fields (notes,
--    last_activity_at, time_spent_seconds), but cannot flip status to
--    'completed', set completed_at, or write last_score. Server-side
--    grading path must use supabaseAdmin.
CREATE OR REPLACE FUNCTION public.academy_lesson_progress_guard_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Bypass for privileged callers (server-side grader / admin backfills).
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Also bypass when a workspace manager with academy.manage permission is
  -- writing on behalf of another user (existing academy_prog_write path).
  IF NEW.user_id IS DISTINCT FROM auth.uid()
     AND public.has_permission(auth.uid(), 'academy.manage') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, 'not_started') = 'completed'
       OR NEW.completed_at IS NOT NULL
       OR NEW.last_score IS NOT NULL THEN
      RAISE EXCEPTION 'academy_lesson_progress: completion/score can only be set by the server-side grader'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status = 'completed' THEN
      RAISE EXCEPTION 'academy_lesson_progress: status=completed can only be set by the server-side grader'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at
       AND NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'academy_lesson_progress: completed_at can only be set by the server-side grader'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.last_score IS DISTINCT FROM OLD.last_score THEN
      RAISE EXCEPTION 'academy_lesson_progress: last_score can only be set by the server-side grader'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_lesson_progress_guard_completion ON public.academy_lesson_progress;
CREATE TRIGGER academy_lesson_progress_guard_completion
BEFORE INSERT OR UPDATE ON public.academy_lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.academy_lesson_progress_guard_completion();
