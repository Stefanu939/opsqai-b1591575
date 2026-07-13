## Diagnosis

`opsqai-windows/services/database/index.js` only writes `postgresql.conf` / `pg_hba.conf` **inside the fresh-init branch** (`if (!fs.existsSync(...PG_VERSION))`). If a previous attempt left a partially-initialized `data/pgsql/` behind (very likely — the first install attempts crashed before this run), `PG_VERSION` exists but the `# --- OPSQAI ---` block that sets `listen_addresses`, `port = 55432`, and `password_encryption` was never appended. `postgres.exe` then starts on its initdb defaults (port `5432`, `listen_addresses = 'localhost'` may be commented), so the bootstrap TCP probe against `127.0.0.1:55432` legitimately never succeeds — hence "postgres not ready after 60s".

Secondary problems that hide the real cause:
- The service `waitReady()` only logs "did not become ready" — it never exits, never surfaces `postgres.exe`'s actual stderr, and never checks the log directory.
- Bootstrap has no fallback diagnostics: on timeout it exits 3 without tailing `%ProgramData%\OPSQAI\data\pgsql\log\*.log` or the winsw `OpsqaiDatabase.out.log`.
- No `pg_isready` probe — a raw TCP `connect` succeeds as soon as postgres binds the socket, even before recovery finishes, so on slow disks the 60 s window is genuinely tight for the first boot after a crash-recovered data dir.

## Fix Plan

### 1. `opsqai-windows/services/database/index.js` — make config idempotent

Move the `postgresql.conf` / `pg_hba.conf` writing out of the fresh-init branch into an always-run `ensureConfig()` step that:

- Reads current `postgresql.conf`; if the `# --- OPSQAI ---` sentinel is missing, appends the block (`listen_addresses = '127.0.0.1'`, `port = <cfg port>`, `password_encryption = scram-sha-256`, `logging_collector = on`, `log_directory = 'log'`, `log_filename = 'postgresql-%Y-%m-%d.log'`).
- If the sentinel is present but `port` differs from `cfg.database.embedded.port`, rewrite that line (drift protection when the operator changes the port).
- Always overwrites `pg_hba.conf` with the loopback+scram-only content (already idempotent, just lift it out of the init branch).
- Ensures `log/` subdir exists before postgres starts.

Also:
- Add a stderr/exit listener on the `postgres` child so an early exit is logged loudly (currently only `exit` is caught, but code and stderr are inherited to the winsw log — surface the exit code with a distinctive marker so bootstrap can find it).
- Replace `waitReady`'s raw TCP probe with `pg_isready.exe -h 127.0.0.1 -p <port> -U opsqai -d postgres` (bundled in `pgsql/bin`), polled every second up to 90 s. Log the last `pg_isready` message on failure.

### 2. `opsqai-windows/services/bootstrap/init.js` — better readiness + diagnostics

- Bump the DB wait from 60 s → 120 s (Windows first-boot after aborted init can genuinely need >60 s).
- After TCP connect, run `pg_isready.exe -h 127.0.0.1 -p <port>` from `%ProgramFiles%\OPSQAI\pgsql\bin` and require exit 0 before proceeding.
- On failure, tail and print the last ~80 lines of `%ProgramData%\OPSQAI\data\pgsql\log\*.log` (newest file) **and** `%ProgramData%\OPSQAI\logs\OpsqaiDatabase.out.log` / `.err.log` before `process.exit(3)`. This turns silent 60 s timeouts into actionable output.
- Before starting the service, if `%ProgramData%\OPSQAI\data\pgsql\PG_VERSION` exists but `postgresql.conf` lacks the `# --- OPSQAI ---` sentinel, log a `stale data dir detected — service will repair` warning (matches the ensureConfig repair path).

### 3. Recovery path for the user's current stuck install

The user's machine is already in the broken state (partial `data/pgsql/`). Two options, called out in the plan output:

a. Simplest: uninstall, delete `%ProgramData%\OPSQAI\data\pgsql\`, reinstall — the new `ensureConfig()` also fixes it, but a clean data dir avoids any half-initialized catalog state.

b. In-place: stop `OpsqaiDatabase`, delete `%ProgramData%\OPSQAI\data\pgsql\`, re-run `bootstrap\init.js` — the service will re-initdb and the new code path will write the correct conf files.

### 4. Verification

- `bunx tsgo --noEmit` (nothing in `src/` changed but keeps the invariant).
- Since these are Windows-only Node scripts that can't run in the sandbox, add a small Node unit that exercises `ensureConfig()` against a fake temp `postgresql.conf` (with and without sentinel; drifted port) and asserts the resulting file content. Place under `opsqai-windows/services/database/__tests__/ensure-config.test.mjs` and run with `node --test`.

### Files touched

```text
opsqai-windows/services/database/index.js             (edit — idempotent config + pg_isready)
opsqai-windows/services/bootstrap/init.js             (edit — longer wait + diagnostics tail)
opsqai-windows/services/database/__tests__/ensure-config.test.mjs   (new — node --test)
```

No changes to WinSW XML, no schema changes, no cloud-side changes.