## Plan

### 1. Fix the failing migration (root cause)

`migrations/selfhost/0001_bootstrap.sql`:
- Remove `CREATE EXTENSION citext`; `email CITEXT UNIQUE` → `email TEXT`.
- Add `CREATE UNIQUE INDEX users_email_lower_idx ON public.users (lower(email));` for case-insensitive uniqueness.

### 2. `installation_state` — scoped to bootstrap only

New table, deliberately narrow. Documented in the migration as **bootstrap-only**; upgrade / backup / license state stay in their own tables and never write here.

```
CREATE TABLE public.installation_state (
  singleton   BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  state       TEXT NOT NULL CHECK (state IN ('bootstrapping','complete','failed')),
  stage       TEXT,           -- 'migrate' | 'seed' | 'services' | 'ready'
  last_error  JSONB,          -- {code, sqlstate, file, line, message}
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Allowed writers: `init.js` only. A code comment in the migration + a `// installation_state is bootstrap-only` guard comment in `init.js` document the invariant.

### 3. OPSQAI-E**** stable error codes

New file `opsqai-windows/services/bootstrap/errors.js` — single source of truth. Each entry: `{ code, category, title, docsAnchor }`.

Initial catalog:
- `OPSQAI-E1001` migration failed (any SQLSTATE)
- `OPSQAI-E1002` migration health probe failed (post-run)
- `OPSQAI-E1101` database unreachable / connect failure
- `OPSQAI-E1102` embedded postgres failed to start
- `OPSQAI-E1201` admin seed failed
- `OPSQAI-E1301` services failed to start
- `OPSQAI-E1901` unknown bootstrap failure

Every failure surface (log, wizard UI, `installation_state.last_error.code`) uses these codes. Docs page `docs/administrator-guide/15-troubleshooting.md` gains an "Error codes" section keyed by `OPSQAI-E****`.

### 4. Precise migration errors + per-install log file

`migrate.mjs`:
- Capture psql stderr, parse `ERROR: ...` / `LINE N:` / `SQLSTATE`.
- Emit one structured line:
  ```
  [migrate] FAIL code=OPSQAI-E1001 file=0001_bootstrap.sql line=61 sqlstate=42704 message="type \"citext\" does not exist"
  ```
- Post-run health probes: `SELECT count(*) FROM public.schema_migrations`, `to_regclass('public.users')`; a failure emits `OPSQAI-E1002`.

`init.js` — unique per-install log:
- Open `%ProgramData%\OPSQAI\logs\bootstrap-YYYYMMDD-HHMMSS.log` and tee bootstrap + spawned `migrate.mjs` output.
- Store path in `installation_state.last_error.log_path` and print `[bootstrap] log: <path>` as the final line (success and failure).

### 5. Retry vs Reset — smart, not identical

Wizard tracks `attempts[]` in-memory for the current session: each entry `{ code, sqlstate, file, line }`.

Buttons rendered on failure:
```
Installation failed — OPSQAI-E1001

File:      0001_bootstrap.sql
Line:      61
SQLSTATE:  42704
Reason:    type "citext" does not exist

[Retry]                        (enabled by default)
[Reset embedded database & retry]
[Open Log]
```

Behavior:
- **Retry** — re-runs bootstrap with existing DB state. Meant for transient issues (port busy, service race, transient FS lock).
- After **two consecutive attempts with the same signature** (same `code + sqlstate + file + line`), the wizard:
  1. Disables **Retry** (grayed with tooltip: "Same error repeated — retrying will not help").
  2. Highlights **Reset embedded database & retry** as the recommended next action.
  3. Adds a banner: `Migration keeps failing with OPSQAI-E1001 at 0001_bootstrap.sql:61. The embedded database is likely in a bad state.`
- Transient categories (`OPSQAI-E1101`, `OPSQAI-E1301`) never suggest reset — those are service/port problems, not corruption.

External-database mode: **Reset** button is hidden entirely. UI shows the reassurance line at all times when reset is offered:
```
Resetting the embedded database only affects the bundled PostgreSQL instance.
External PostgreSQL installations are never modified.
```

### 6. Reset routine — bounded backups

`init.js --reset-embedded-db` (embedded only; refuses to run if `database.mode == "external"`):
1. Stop `OpsqaiDatabase` via winsw.
2. Move `%ProgramData%\OPSQAI\data\pgsql` → `pgsql.failed-YYYYMMDD-HHMMSS`.
3. Prune failed backups by **both** limits, whichever hits first:
   - keep at most **3 most recent** `pgsql.failed-*` folders;
   - delete any older than **14 days**.
4. Start `OpsqaiDatabase`, wait for readiness.
5. Re-run migrations exactly once; second failure → surface the structured error and stop. Never loops.

Also exposed as `opsqai db reset --yes` (guarded: refuses if `installation_state.state == 'complete'` unless `--force`).

### 7. Build-time guardrail

`opsqai-windows/build/build.ps1` — after staging `payload\app\migrations`, fail the build if any staged SQL references `CITEXT` or the `citext` extension. Prevents shipping a stale payload again.

### Files touched

- `migrations/selfhost/0001_bootstrap.sql`
- `opsqai-windows/services/bootstrap/errors.js` (new)
- `opsqai-windows/services/bootstrap/init.js`
- `opsqai-windows/services/bootstrap/migrate.mjs`
- `opsqai-windows/tools/service-manager/index.js`
- `opsqai-windows/installer/wizard/main.cjs`
- `opsqai-windows/installer/wizard/preload.cjs`
- `opsqai-windows/installer/wizard/renderer/wizard.js`
- `opsqai-windows/build/build.ps1`
- `docs/administrator-guide/15-troubleshooting.md` (error-code reference)