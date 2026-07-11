# 10. Background jobs

Scheduled via `pg_cron`. Definitions in `supabase/migrations/*` marked with `-- @cron`.

| Job | Schedule | Purpose |
|---|---|---|
| `heartbeat_license` | */15 min | Refresh CRL freshness (online installs) |
| `purge_expired_artifacts` | daily | Remove `workspace_artifacts` older than 30 d |
| `archive_audit_log` | weekly | Move rows > 24 months into `audit_log_terminated_archive` |
| `retention_email_send_state` | daily | GC old delivery state |
| `warn_bundle_expiry` | daily | Notify portal when activation bundle nears 90-day expiry |
| `warn_maintenance_expiry` | daily | Notify Installation License holder 30/14/7 days before expiry |
| `doctor_snapshot` | hourly | Persist doctor result for the Admin UI |

All jobs are idempotent and safe to skip.
