
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS eula_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_provider_config jsonb,
  ADD COLUMN IF NOT EXISTS backup_config jsonb;

-- Atomic first-run admin bootstrap.
--
-- Called by the public first-run wizard AFTER a Supabase Auth user has been
-- created via the Admin API. Uses a transaction-scoped advisory lock so that
-- two simultaneous requests can never both promote a user to platform_owner
-- (see Phase 5 review, race-condition mitigation).
--
-- Returns TRUE if this call promoted the given user; FALSE if setup was
-- already completed (caller should delete the just-created auth user).
CREATE OR REPLACE FUNCTION public.first_run_bootstrap_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing int;
BEGIN
  -- Serialize all concurrent first-run bootstrap attempts.
  PERFORM pg_advisory_xact_lock(hashtext('opsqai:first-run-admin'));

  SELECT count(*) INTO _existing
  FROM public.user_roles
  WHERE role IN ('platform_owner', 'platform_admin');

  IF _existing > 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'platform_owner');

  UPDATE public.platform_config
  SET setup_completed_at = COALESCE(setup_completed_at, now())
  WHERE id = true;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.first_run_bootstrap_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.first_run_bootstrap_admin(uuid) TO service_role;
