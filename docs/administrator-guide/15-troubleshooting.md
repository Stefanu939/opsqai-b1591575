# 15. Troubleshooting

## Error codes

OPSQAI installer and bootstrap failures are tagged with a stable
`OPSQAI-E****` code. Quote this code when contacting support — the
underlying SQL/OS message may change between versions, but the code and
its meaning are stable.

| Code | Category | Meaning | Typical action |
|---|---|---|---|
| **OPSQAI-E1001** | migrate | Database migration failed. The wizard log shows the exact `.sql` file, line, and SQLSTATE. | Read the failure card in the wizard. If the same error repeats after **Retry**, use **Reset embedded database & retry**. |
| **OPSQAI-E1002** | migrate | Migrations reported success but the post-run health probe failed (missing table, empty `schema_migrations`). | Reset embedded database & retry. |
| **OPSQAI-E1101** | database | Cannot reach the database (embedded not started, wrong host/port, wrong credentials for external DB). | Check `OpsqaiDatabase` service or the external DB reachability. Reset is **not** offered — this is not corruption. |
| **OPSQAI-E1102** | database | Embedded PostgreSQL failed to start on the local port. | Check port `55432` is free; review `%ProgramData%\OPSQAI\logs\OpsqaiDatabase*.log`. |
| **OPSQAI-E1201** | seed | The first administrator account could not be created after migrations. | Retry. If it persists, reset embedded database & retry. |
| **OPSQAI-E1301** | services | One or more OPSQAI services (Platform/Worker/Caddy) failed to start. | Check port `443`, review each service log via `opsqai logs <ServiceName>`. |
| **OPSQAI-E1901** | unknown | Uncategorised bootstrap failure. | Open **View Log** and contact support with the log file. |

### Per-install log file

Each bootstrap run writes a unique log at:

```
%ProgramData%\OPSQAI\logs\bootstrap-YYYYMMDD-HHMMSS.log
```

The failing wizard step exposes an **Open Log** button that points at
this exact file — attach it to any support ticket.

### Reset embedded database

The **Reset embedded database & retry** button (visible only for embedded
mode) does the following, atomically:

1. Stops `OpsqaiDatabase`.
2. Moves `%ProgramData%\OPSQAI\data\pgsql` → `pgsql.failed-YYYYMMDD-HHMMSS`.
3. Prunes old failed folders: at most **3 most recent** are kept, and
   any older than **14 days** are removed.
4. Starts `OpsqaiDatabase` again and re-runs migrations exactly once.

External PostgreSQL installations are never touched. The reset button is
hidden when the wizard is configured against an external database.

The same routine is available from the CLI:

```
opsqai db reset --yes
```

It refuses to run against a successfully completed install unless
`--force` is provided.
