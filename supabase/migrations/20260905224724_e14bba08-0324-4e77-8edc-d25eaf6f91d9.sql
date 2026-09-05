-- 1. Columns for the activity centre
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS entity_label text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_key text,
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_severity_check;
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check CHECK (kind ~ '^[a-z0-9_.]{3,64}$'),
  ADD CONSTRAINT notifications_severity_check CHECK (severity IN ('info','warning','critical')),
  ADD CONSTRAINT notifications_category_check CHECK (category IN ('general','knowledge','academy','customers','licenses','timeoff','releases','health','support','billing'));

CREATE INDEX IF NOT EXISTS notifications_assigned_open_idx ON public.notifications (assigned_to, resolved_at);
CREATE INDEX IF NOT EXISTS notifications_category_created_idx ON public.notifications (category, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_group_idx ON public.notifications (group_key, created_at DESC);

-- 2. Triage rights for platform staff
DROP POLICY IF EXISTS notif_update_platform ON public.notifications;
CREATE POLICY notif_update_platform ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS notif_delete_platform ON public.notifications;
CREATE POLICY notif_delete_platform ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- 3. Emit helper (dedupes on group_key within 12h)
CREATE OR REPLACE FUNCTION public.notify_emit(
  _user_ids uuid[],
  _company uuid,
  _kind text,
  _title text,
  _body text,
  _link text,
  _severity text DEFAULT 'info',
  _category text DEFAULT 'general',
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _entity_label text DEFAULT NULL,
  _group_key text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
  company uuid := COALESCE(_company, public.system_company_id());
  inserted int := 0;
BEGIN
  IF company IS NULL THEN RETURN 0; END IF;
  FOREACH target IN ARRAY COALESCE(_user_ids, ARRAY[]::uuid[]) LOOP
    IF target IS NULL THEN CONTINUE; END IF;
    IF _group_key IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = target AND n.group_key = _group_key
        AND n.created_at > now() - interval '12 hours'
    ) THEN CONTINUE; END IF;
    INSERT INTO public.notifications
      (company_id, user_id, kind, title, body, link, severity, category,
       entity_type, entity_id, entity_label, group_key, payload)
    VALUES (company, target, _kind, _title, _body, _link, _severity, _category,
            _entity_type, _entity_id, _entity_label, _group_key, COALESCE(_payload,'{}'::jsonb));
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_emit(uuid[],uuid,text,text,text,text,text,text,text,uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_platform_staff(
  _kind text, _title text, _body text, _link text,
  _severity text DEFAULT 'info', _category text DEFAULT 'general',
  _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL,
  _entity_label text DEFAULT NULL, _group_key text DEFAULT NULL,
  _extra_users uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT u FROM (
      SELECT ur.user_id AS u FROM public.user_roles ur
       WHERE ur.role IN ('platform_admin','platform_owner')
      UNION SELECT x FROM unnest(COALESCE(_extra_users, ARRAY[]::uuid[])) x
    ) s WHERE u IS NOT NULL
  ) INTO ids;
  RETURN public.notify_emit(ids, public.system_company_id(), _kind, _title, _body, _link,
    _severity, _category, _entity_type, _entity_id, _entity_label, _group_key);
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_platform_staff(text,text,text,text,text,text,text,uuid,text,text,uuid[]) FROM PUBLIC, anon, authenticated;

-- 4. Customers
CREATE OR REPLACE FUNCTION public.tg_notify_company_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_system,false) OR COALESCE(NEW.is_demo_tenant,false) THEN RETURN NEW; END IF;
  PERFORM public.notify_platform_staff(
    'customer.created',
    'New customer: ' || COALESCE(NEW.display_name, NEW.name),
    'A customer workspace was created. Set the profile and enable products.',
    '/management/companies/' || NEW.id::text,
    'info','customers','company',NEW.id,COALESCE(NEW.display_name,NEW.name),
    'customer.created:' || NEW.id::text,
    CASE WHEN NEW.owner_user_id IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[NEW.owner_user_id] END
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_company_created ON public.companies;
CREATE TRIGGER notify_company_created AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_company_created();

-- 5. Licenses
CREATE OR REPLACE FUNCTION public.tg_notify_license_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_ids uuid[]; company uuid;
BEGIN
  SELECT c.id, ARRAY_REMOVE(ARRAY[c.owner_user_id],NULL) INTO company, owner_ids
    FROM public.companies c WHERE c.install_id = NEW.install_id LIMIT 1;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_platform_staff('license.issued',
      'Licence issued: ' || COALESCE(NEW.company_name,'customer'),
      'Tier ' || COALESCE(NEW.tier,'-') || ' · expires ' || COALESCE(NEW.expires_at::date::text,'never'),
      '/management/licenses','info','licenses','license',NEW.id,NEW.company_name,
      'license.issued:' || NEW.id::text, COALESCE(owner_ids,ARRAY[]::uuid[]));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.revoked AND NOT COALESCE(OLD.revoked,false) THEN
      PERFORM public.notify_platform_staff('license.revoked',
        'Licence revoked: ' || COALESCE(NEW.company_name,'customer'),
        COALESCE(NEW.revoked_reason,'No reason recorded.'),
        '/management/licenses','critical','licenses','license',NEW.id,NEW.company_name,
        'license.revoked:' || NEW.id::text, COALESCE(owner_ids,ARRAY[]::uuid[]));
    ELSIF COALESCE(NEW.suspended,false) AND NOT COALESCE(OLD.suspended,false) THEN
      PERFORM public.notify_platform_staff('license.suspended',
        'Licence suspended: ' || COALESCE(NEW.company_name,'customer'),
        COALESCE(NEW.suspended_reason,'No reason recorded.'),
        '/management/licenses','warning','licenses','license',NEW.id,NEW.company_name,
        'license.suspended:' || NEW.id::text, COALESCE(owner_ids,ARRAY[]::uuid[]));
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_license_insert ON public.licenses;
CREATE TRIGGER notify_license_insert AFTER INSERT ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_license_change();
DROP TRIGGER IF EXISTS notify_license_update ON public.licenses;
CREATE TRIGGER notify_license_update AFTER UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_license_change();

-- 6. Time off
CREATE OR REPLACE FUNCTION public.tg_notify_time_off()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE approvers uuid[]; who text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')),''), p.full_name, 'A colleague')
    INTO who FROM public.profiles p WHERE p.id = NEW.user_id;
  IF TG_OP = 'INSERT' THEN
    SELECT ARRAY(SELECT DISTINCT ur.user_id FROM public.user_roles ur
                  WHERE ur.role IN ('platform_admin','platform_owner','superadmin','admin')
                    AND (ur.company_id IS NULL OR ur.company_id = NEW.company_id)
                    AND ur.user_id <> NEW.user_id)
      INTO approvers;
    PERFORM public.notify_emit(approvers, NEW.company_id, 'timeoff.requested',
      'Time off request: ' || COALESCE(who,'colleague'),
      COALESCE(who,'A colleague') || ' requested ' || NEW.starts_on || ' → ' || NEW.ends_on || '.',
      '/management/calendar','info','timeoff','time_off',NEW.id,who,
      'timeoff.requested:' || NEW.id::text);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('approved','rejected','cancelled') THEN
    PERFORM public.notify_emit(ARRAY[NEW.user_id], NEW.company_id, 'timeoff.' || NEW.status,
      'Time off ' || NEW.status,
      'Your request ' || NEW.starts_on || ' → ' || NEW.ends_on || ' was ' || NEW.status || '.'
        || COALESCE(' ' || NEW.decision_note, ''),
      '/management/calendar',
      CASE WHEN NEW.status = 'approved' THEN 'info' ELSE 'warning' END,
      'timeoff','time_off',NEW.id,who,'timeoff.' || NEW.status || ':' || NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_time_off_insert ON public.time_off_requests;
CREATE TRIGGER notify_time_off_insert AFTER INSERT ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_time_off();
DROP TRIGGER IF EXISTS notify_time_off_update ON public.time_off_requests;
CREATE TRIGGER notify_time_off_update AFTER UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_time_off();

-- 7. Releases
CREATE OR REPLACE FUNCTION public.tg_notify_release_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_platform_staff('release.published',
    'Installer ' || NEW.version || ' published',
    'A new Windows Self-Hosted installer release is available for customers.',
    '/management/releases','info','releases','release',NEW.id,NEW.version,
    'release.published:' || NEW.id::text);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_release_published ON public.installer_releases;
CREATE TRIGGER notify_release_published AFTER INSERT ON public.installer_releases
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_release_published();

-- 8. Daily sweeps: expiring licences + silent installations
CREATE OR REPLACE FUNCTION public.cron_notify_license_expiry()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; total int := 0;
BEGIN
  FOR r IN
    SELECT l.id, l.company_name, l.expires_at
      FROM public.licenses l
     WHERE NOT COALESCE(l.revoked,false)
       AND l.expires_at IS NOT NULL
       AND l.expires_at > now()
       AND l.expires_at < now() + interval '30 days'
  LOOP
    total := total + public.notify_platform_staff('license.expiring',
      'Licence expires soon: ' || COALESCE(r.company_name,'customer'),
      'Expires on ' || r.expires_at::date || '. Reissue before that date.',
      '/management/licenses','warning','licenses','license',r.id,r.company_name,
      'license.expiring:' || r.id::text || ':' || r.expires_at::date::text);
  END LOOP;
  RETURN total;
END $$;

CREATE OR REPLACE FUNCTION public.cron_notify_install_health()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; total int := 0;
BEGIN
  FOR r IN
    SELECT i.install_id, i.organization_name, i.last_heartbeat_at
      FROM public.selfhost_installations i
     WHERE i.last_heartbeat_at IS NOT NULL
       AND i.last_heartbeat_at < now() - interval '48 hours'
  LOOP
    total := total + public.notify_platform_staff('install.silent',
      'Installation offline: ' || COALESCE(r.organization_name, r.install_id),
      'No heartbeat since ' || to_char(r.last_heartbeat_at, 'YYYY-MM-DD HH24:MI') || ' UTC.',
      '/management/installations','critical','health','installation',NULL,
      COALESCE(r.organization_name, r.install_id),
      'install.silent:' || r.install_id || ':' || to_char(now(),'YYYY-MM-DD'));
  END LOOP;
  RETURN total;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('opsqai_notify_license_expiry') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'opsqai_notify_license_expiry');
    PERFORM cron.unschedule('opsqai_notify_install_health') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'opsqai_notify_install_health');
    PERFORM cron.schedule('opsqai_notify_license_expiry','0 7 * * *',
      $cron$SELECT public.cron_notify_license_expiry();$cron$);
    PERFORM cron.schedule('opsqai_notify_install_health','30 7 * * *',
      $cron$SELECT public.cron_notify_install_health();$cron$);
  END IF;
END $$;