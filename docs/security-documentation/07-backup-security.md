# 7. Backup security

- Backups are the customer's responsibility.
- OPSQAI ships reference scripts; the customer is responsible for encryption before off-site.
- Restore-to-scratch drill: monthly, verified via `opsqai doctor --verify-backup`.
- Backups include license tokens — they must be treated as sensitive. Do NOT commit backup files to source control or unencrypted network shares.
- Off-site copy MUST be encrypted at rest and MUST NOT share compromise domain with the primary (different cloud provider or different keys).

## Config scope: `secrets.env`

The first-run wizard writes AI provider, SMTP, and backup credentials to
`/var/lib/opsqai/secrets.env` (mode 0600, owned by the container runtime
user). This file MUST be included in the Config backup scope alongside
PostgreSQL and object-storage dumps — without it a DR restore leaves the
new install unable to reach the AI provider, send email, or push future
backups without an operator re-entering every credential by hand.

Verification: the monthly `opsqai doctor --verify-backup` drill lists
`secrets.env` under "Config" and fails the drill if it is missing from
the archive. Encrypt the backup archive at rest as with any other
credential-bearing artifact.
