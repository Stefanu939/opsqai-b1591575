# 12. Updates

## Preconditions

- `maintenance_expires_at` on Installation License is in the future.
- Backup + verified restore in the last 24 h.
- `opsqai doctor` green.

## Update procedure

```bash
# 1. Fetch signed manifest
opsqai update fetch

# 2. Verify signature + prerequisites
opsqai update verify

# 3. Apply (pulls Docker image, runs migrations, restarts app)
opsqai update apply

# 4. Post-check
opsqai doctor
```

## Rollback

If the post-check fails:

```bash
opsqai update rollback
```

The previous image + a schema snapshot from immediately before the update are kept for 7 days.

## Security-relevant releases

Release manifests carry `security_relevant: true` on releases that address CVEs or hardening issues. These SHOULD be applied within the SLA agreed in the customer's contract.
