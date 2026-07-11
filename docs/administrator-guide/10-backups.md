# 10. Backups

Backups are a **customer responsibility**. OPSQAI ships reference tooling; the customer runs it, monitors it, and verifies restores.

## Reference PostgreSQL backup

```bash
# Nightly full dump
docker compose exec -T postgres pg_dump \
  --format=custom --no-owner --no-privileges \
  --file=/backups/opsqai-$(date +%F).dump \
  "$POSTGRES_URL"
```

Include `licenses.token`, `platform_config`, and `license_signing_keys` — those anchor DR.

## Object storage

Use `mc mirror` (MinIO client) or `aws s3 sync` to replicate `opsqai-documents` and `opsqai-brand` to an off-site bucket. `opsqai-artifacts` is regenerable — no need to back up.

## Verify

Every backup should be restored to a scratch environment at least monthly. Use `opsqai doctor --verify-backup <dump-file>` to run the smoke suite against the restored DB.

## Retention

- Daily for 14 days.
- Weekly for 12 weeks.
- Monthly for 12 months.
- Off-site copy at all times.

## Encryption

Encrypt at rest (`age` or `gpg`) before shipping to off-site. Never store the encryption key on the same host as the backup.
