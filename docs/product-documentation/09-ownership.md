# 9. Ownership model

Post-handover, responsibilities split cleanly.

| Area                                            | OPSQAI | Customer |
| ----------------------------------------------- | ------ | -------- |
| License issuance                                | ✅     | —        |
| Signed release manifests                        | ✅     | —        |
| Bootstrap Recovery Tokens                       | ✅     | —        |
| Docs, RC-tested reference install               | ✅     | —        |
| Hosting the install (compute, storage, network) | —      | ✅       |
| PostgreSQL / MinIO / SMTP / AI keys             | —      | ✅       |
| Backups, restore drills                         | —      | ✅       |
| End-user accounts, roles, content               | —      | ✅       |
| DPA, national data-residency choices            | —      | ✅       |
| Incident response inside the install            | —      | ✅       |

The customer's infrastructure is **not** a subprocessor of OPSQAI.
