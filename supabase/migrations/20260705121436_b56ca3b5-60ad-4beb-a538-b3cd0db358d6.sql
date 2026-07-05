
-- 1. Termination fields on companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS termination_reason text;

CREATE INDEX IF NOT EXISTS companies_terminated_at_idx
  ON public.companies (terminated_at)
  WHERE terminated_at IS NOT NULL;

-- 2. Anonymized archive of audit_log (kept ~24 months per Privacy Policy).
CREATE TABLE IF NOT EXISTS public.audit_log_terminated_archive (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_label  text NOT NULL,        -- e.g. "terminated:<hash>" — never the company name
  module        text,
  action        text,
  resource      text,
  severity      text,
  success       boolean,
  event_at      timestamptz NOT NULL,
  archived_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log_terminated_archive TO authenticated;
GRANT ALL    ON public.audit_log_terminated_archive TO service_role;

ALTER TABLE public.audit_log_terminated_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_read_archive"
  ON public.audit_log_terminated_archive
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE INDEX IF NOT EXISTS audit_archive_event_at_idx
  ON public.audit_log_terminated_archive (event_at);

-- 3. Mark tenant terminated (platform admin only)
CREATE OR REPLACE FUNCTION public.mark_tenant_terminated(_company uuid, _reason text DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_when timestamptz := now();
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.companies
     SET terminated_at      = v_when,
         terminated_by      = auth.uid(),
         termination_reason = _reason,
         subscription_status = 'cancelled',
         cancelled_at       = COALESCE(cancelled_at, v_when),
         active             = false
   WHERE id = _company
     AND COALESCE(is_system, false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company not found or is a system tenant';
  END IF;

  INSERT INTO public.subscription_events (company_id, event_type, to_status, reason, actor_kind)
  VALUES (_company, 'tenant_terminated', 'cancelled', COALESCE(_reason, 'manual termination'), 'admin');

  RETURN v_when;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_tenant_terminated(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_tenant_terminated(uuid, text) TO authenticated;

-- 4. Restore during the 30-day grace window (platform admin only)
CREATE OR REPLACE FUNCTION public.restore_terminated_tenant(_company uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.companies
     SET terminated_at      = NULL,
         terminated_by      = NULL,
         termination_reason = NULL,
         cancelled_at       = NULL,
         active             = true,
         subscription_status = 'grace_period'
   WHERE id = _company
     AND terminated_at IS NOT NULL
     AND terminated_at > now() - interval '30 days';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_terminated_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_terminated_tenant(uuid) TO authenticated;

-- 5. Purge sweep: archive anonymized audit entries, then delete the company.
CREATE OR REPLACE FUNCTION public.purge_terminated_tenants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  v_label text;
  v_archived int := 0;
  v_deleted  int := 0;
BEGIN
  FOR r IN
    SELECT id
      FROM public.companies
     WHERE terminated_at IS NOT NULL
       AND terminated_at < now() - interval '30 days'
       AND COALESCE(is_system, false) = false
  LOOP
    v_label := 'terminated:' || encode(digest(r.id::text, 'sha256'), 'hex');

    WITH moved AS (
      INSERT INTO public.audit_log_terminated_archive
        (tenant_label, module, action, resource, severity, success, event_at)
      SELECT v_label, module, action, resource, severity, success, created_at
        FROM public.audit_log
       WHERE company_id = r.id
      RETURNING 1
    )
    SELECT v_archived + count(*) INTO v_archived FROM moved;

    DELETE FROM public.companies WHERE id = r.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'tenants_deleted', v_deleted,
    'audit_rows_archived', v_archived
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_terminated_tenants() FROM PUBLIC, anon, authenticated;

-- 6. Schedule daily at 03:15 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-terminated-tenants') THEN
    PERFORM cron.unschedule('purge-terminated-tenants');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-terminated-tenants',
  '15 3 * * *',
  $$ SELECT public.purge_terminated_tenants(); $$
);
