REVOKE EXECUTE ON FUNCTION public.tg_notify_company_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_license_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_time_off() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_release_published() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_notify_license_expiry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_notify_install_health() FROM PUBLIC, anon, authenticated;