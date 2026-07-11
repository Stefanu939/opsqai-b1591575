# 10. Logging & audit

## Audit log (`audit_log`)

Every governance-relevant action lands here with:

- `actor_id`, `actor_email`, `actor_role`
- `action` (canonical verb from a fixed enum)
- `resource_type` + `resource_id`
- `ip`, `user_agent`
- `before`, `after` (JSON diff for mutations)
- `mode` (`mc` | `selfhost`)
- `created_at`

## Coverage matrix (audit-coverage lint)

The build fails if a mutation on any of these tables lacks a corresponding audit entry: `licenses`, `platform_config`, `user_roles`, `dr_bootstrap_tokens`, `license_signing_keys`, `subscription_events`, `sso_configurations`, `platform_email_settings`.

## Retention

- Live table: 24 months.
- After 24 months, rows are moved to `audit_log_terminated_archive` with PII fields anonymized.
- Archive retention: 7 years (customer-configurable).

## Access

Audit log is read-only via the Admin → Audit UI. Only `platform_admin` and `admin` roles can read. Nobody, including OPSQAI, can write to the archive directly.

## SIEM export

Reference syslog + JSON export is available; the customer configures forwarding at Admin → Integrations → SIEM.
