CREATE OR REPLACE FUNCTION public.cron_notify_outdated_installs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; total int := 0; latest text;
BEGIN
  SELECT version INTO latest
    FROM public.license_releases
   WHERE channel = 'stable' AND is_current = true
   ORDER BY published_at DESC
   LIMIT 1;

  IF latest IS NULL THEN
    SELECT version INTO latest
      FROM public.installer_releases
     WHERE is_active = true
     ORDER BY published_at DESC
     LIMIT 1;
  END IF;

  IF latest IS NULL THEN RETURN 0; END IF;

  FOR r IN
    SELECT i.install_id,
           i.organization_name,
           COALESCE(i.app_version, li.app_version, li.installer_version) AS current_version
      FROM public.selfhost_installations i
      LEFT JOIN public.license_installs li ON li.install_id = i.install_id
     WHERE COALESCE(i.app_version, li.app_version, li.installer_version) IS NOT NULL
       AND COALESCE(i.app_version, li.app_version, li.installer_version) <> latest
  LOOP
    total := total + public.notify_platform_staff('install.outdated',
      'Installation behind: ' || COALESCE(r.organization_name, r.install_id),
      'Runs v' || r.current_version || ' while v' || latest || ' is the current release.',
      '/management/installations','warning','health','installation',NULL,
      COALESCE(r.organization_name, r.install_id),
      'install.outdated:' || r.install_id || ':' || latest || ':' || to_char(now(),'YYYY-MM-DD'));
  END LOOP;
  RETURN total;
END $$;

REVOKE EXECUTE ON FUNCTION public.cron_notify_outdated_installs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_notify_outdated_installs() TO service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('opsqai_notify_outdated_installs') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'opsqai_notify_outdated_installs');
    PERFORM cron.schedule('opsqai_notify_outdated_installs','45 7 * * *',
      $cron$SELECT public.cron_notify_outdated_installs();$cron$);
  END IF;
END $$;