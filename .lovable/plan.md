
# Fix: bootstrap hangs silently at 40%

## Root cause (confirmed by reading init.js)

Between `postgres ready …` and `STAGE running app migrations`, the only work is:

```
writeInstallState("bootstrapping", "migrate", null)   // init.js:433
  → psqlExec(sql)                                     // init.js:303
    → spawnSync("psql.exe", ["-h","-p","-U opsqai","-d opsqai", ...])
```

On a fresh install:
- database `opsqai` does not exist yet (migrator creates it),
- role `opsqai` may require a password per `pg_hba.conf` (`scram-sha-256`),
- `psqlExec` does **not** pass `-w` / `--no-password`,
- `spawnSync` has **no `timeout`**.

Result: `psql.exe` tries to prompt for a password on a non-existent console and blocks forever. No error is ever printed → wizard stays at 40% "silenced".

The user's proposed breadcrumb logs would confirm this — the last line printed would be `[bootstrap] before writeInstallState` and nothing after — but the real fix is to make the psql call incapable of hanging and to only write installation_state after the database exists.

## Fix (only `opsqai-windows/services/bootstrap/init.js`)

### 1. Make `psqlExec` non-blocking under all conditions

- Add `-w` (never prompt for password) to the psql arg list.
- Add `timeout: 10_000` and `killSignal: "SIGKILL"` to the `spawnSync` options.
- Wrap in try/catch so `writeInstallState` is truly best-effort — a psql failure must never stall bootstrap.

### 2. Do not write `installation_state` before the DB/role exist

Move the **first** `writeInstallState("bootstrapping", "migrate", null)` call from **before** the migrator to **after** the migrator succeeds (schema, role, and `installation_state` table all exist at that point). Keep the failure-path `writeInstallState("failed", "migrate", errFields)` — it will now silently no-op on a truly dead DB instead of hanging.

For the *early* progress marker (before migrations), just emit a `STAGE` log line — the wizard already keys progress off `STAGE` markers, not off the DB row.

### 3. Keep the user's breadcrumb logs

Add exactly the logs the user proposed around the migrator lookup + spawn, so any future hang in this window is instantly diagnosable:

```js
console.log("[bootstrap] locating migrate.mjs");
const migrator = programFiles("app", "server", "migrate.mjs");
console.log("[bootstrap] migrator =", migrator);
console.log("[bootstrap] exists   =", fs.existsSync(migrator));
console.log("[bootstrap] before stage(running app migrations)");
stage("running app migrations");
console.log("[bootstrap] launching migrate.mjs");
```

### 4. Belt-and-suspenders: also add `timeout` to the migrator spawn

`spawnSync(node, [migrator], { timeout: 300_000 })` so a stuck migrator surfaces as `OPSQAI-E1001` after 5 minutes instead of an indefinite wait.

## Out of scope

- No changes to migrations, wizard renderer, or IPC layer.
- No changes to `installation_state` schema — it stays bootstrap-only per the memory rule.
- No behavior change on happy path; only failure/edge paths become observable and time-bounded.

## Verification

1. Fresh install on a clean VM: log should now go
   `postgres ready … → locating migrate.mjs → exists=true → STAGE running app migrations → …` with no gap.
2. Simulate hang: point psqlExec at an unreachable port; bootstrap must proceed past `writeInstallState` within 10s instead of stalling.
3. `%ProgramData%\OPSQAI\logs\bootstrap-<ts>.log` shows the new breadcrumbs, so support can pinpoint any future stall in one look.
