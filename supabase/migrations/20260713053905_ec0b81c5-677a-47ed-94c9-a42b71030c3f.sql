
-- Force pending state on INSERT: no matter what the client sends, a new
-- academy_quiz_attempts row starts with score=0 and passed=false. Grading
-- can only happen via UPDATE from a privileged (service_role) context.
CREATE OR REPLACE FUNCTION public.academy_quiz_attempts_force_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses so admin/back-office backfills stay possible
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.score := 0;
  NEW.passed := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_quiz_attempts_force_pending ON public.academy_quiz_attempts;
CREATE TRIGGER trg_academy_quiz_attempts_force_pending
BEFORE INSERT ON public.academy_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.academy_quiz_attempts_force_pending();

-- Block non-privileged UPDATEs from altering score / passed. The submit
-- server function switches to the service-role client for that write.
CREATE OR REPLACE FUNCTION public.academy_quiz_attempts_guard_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.passed IS DISTINCT FROM OLD.passed THEN
    RAISE EXCEPTION 'academy_quiz_attempts: score/passed can only be set by the server-side grader'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_quiz_attempts_guard_grade ON public.academy_quiz_attempts;
CREATE TRIGGER trg_academy_quiz_attempts_guard_grade
BEFORE UPDATE ON public.academy_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.academy_quiz_attempts_guard_grade();
