# 11. Restore

## Full DB restore

```bash
docker compose stop app
docker compose exec -T postgres pg_restore \
  --clean --if-exists --no-owner --no-privileges \
  --dbname="$POSTGRES_URL" /backups/opsqai-2026-07-11.dump
docker compose start app
docker compose exec app opsqai doctor
```

## After restore — expected outcomes

- `install_id` MUST be identical to the pre-loss value. If not, you are restoring into a different install — stop and read chapter 15.
- Installation License and all Module Licenses re-verify without user action.
- CRL freshness may be behind — trigger a heartbeat or re-import the activation bundle.

## Recovery Mode

If the restored DB is missing `platform_config` or the Installation License is missing/expired, the app boots in **Recovery Mode**. Follow chapter 15 (or the DR-Verify runbook) to exit.
