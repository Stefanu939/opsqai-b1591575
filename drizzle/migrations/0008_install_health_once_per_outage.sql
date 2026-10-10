CREATE OR REPLACE FUNCTION public.cron_notify_install_health()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record; total int := 0;
BEGIN
  -- Only licensed, active installations; one alert per outage (keyed on last heartbeat), not daily.
  FOR r IN
    SELECT i.install_id, i.organization_name, i.last_heartbeat_at
      FROM public.selfhost_installations i
     WHERE i.last_heartbeat_at IS NOT NULL
       AND i.last_heartbeat_at < now() - interval '48 hours'
       AND i.last_heartbeat_at > now() - interval '30 days'
       AND EXISTS (SELECT 1 FROM public.licenses l
                    WHERE l.install_id = i.install_id
                      AND COALESCE(l.revoked,false) = false
                      AND (l.expires_at IS NULL OR l.expires_at > now()))
  LOOP
    total := total + public.notify_platform_staff('install.silent',
      'Installation offline: ' || COALESCE(r.organization_name, r.install_id),
      'No heartbeat since ' || to_char(r.last_heartbeat_at, 'YYYY-MM-DD HH24:MI') || ' UTC.',
      '/management/installations','critical','health','installation',NULL,
      COALESCE(r.organization_name, r.install_id),
      'install.silent:' || r.install_id || ':' || to_char(r.last_heartbeat_at,'YYYY-MM-DD"T"HH24:MI'));
  END LOOP;
  RETURN total;
END $function$;