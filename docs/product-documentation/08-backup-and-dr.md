# 8. Backup and Disaster Recovery

## Backup

OPSQAI expects the customer to run backups against their own PostgreSQL and object storage. The Administrator Guide (chapter 10) documents the reference `pg_dump`/`pg_restore` wrapper and `mc mirror` for MinIO.

DB backups **must include** the `licenses.token` and `platform_config` rows — those anchor recovery.

## Two recovery paths

- **Online** — Management Center issues a **Bootstrap Recovery Token** to the customer, valid for a limited window and tied to `install_id`.
- **Offline** — Customer redeems the pre-generated **break-glass secret** stored securely offline.

Both paths trigger Recovery Mode, which is auditable and requires an explicit exit.

## Seven canonical DR scenarios

See `dr-scenarios.ts`: full DB restore, lost admin, expired license offline, revoked license mistake, storage loss, install-id drift, key rotation emergency.

Every scenario has a documented recovery path and is exercised in the DR-Verify runbook shipped with each release.
