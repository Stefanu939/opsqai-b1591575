CREATE OR REPLACE FUNCTION public.purge_archived_audit_log()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_deleted int := 0;
BEGIN
  WITH del AS (
    DELETE FROM public.audit_log_terminated_archive
     WHERE archived_at < now() - interval '24 months'
     RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  RETURN jsonb_build_object('deleted', v_deleted, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.purge_archived_audit_log() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-archived-audit-log') THEN
    PERFORM cron.unschedule('purge-archived-audit-log');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-archived-audit-log',
  '45 3 * * *',
  $$ SELECT public.purge_archived_audit_log(); $$
);