# 7. Backup security

- Backups are the customer's responsibility.
- OPSQAI ships reference scripts; the customer is responsible for encryption before off-site.
- Restore-to-scratch drill: monthly, verified via `opsqai doctor --verify-backup`.
- Backups include license tokens — they must be treated as sensitive. Do NOT commit backup files to source control or unencrypted network shares.
- Off-site copy MUST be encrypted at rest and MUST NOT share compromise domain with the primary (different cloud provider or different keys).
