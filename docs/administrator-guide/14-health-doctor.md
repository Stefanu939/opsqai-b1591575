# 14. Health check — `opsqai doctor`

Available in-app at `/app/platform/doctor` and as a CLI (`opsqai doctor`).

## Checks

- Database connectivity + extensions present.
- Object storage reachable, bucket policy correct.
- SMTP handshake.
- AI provider probe (latency + model listing).
- Installation License present, not expired, not revoked.
- Each active Module License valid.
- Signing keys freshness.
- CRL freshness (warn if > 30 days old on online installs).
- Migration state (all migrations applied, none pending).
- Disk headroom.
- Latest release manifest vs current `installer_version`.

## Exit codes

- `0` — all green.
- `1` — warnings only.
- `2` — one or more red checks — do NOT apply updates until resolved.

## Scheduling

Recommended: run `opsqai doctor` every 15 minutes from cron and forward exit-code-2 events to the customer's alerting.
