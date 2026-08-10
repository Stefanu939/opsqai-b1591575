# Fix OPSQAI-E1507 — embedding dimension psql call has no password

## Confirmed root cause

`opsqai-windows/services/bootstrap/init.js` builds its own psql connection in `pgArgs()` (line 470-478):

```js
const pw = embedded ? "" : config.database.external.password;
```

For embedded mode the password is hardcoded to an empty string, so `psqlExec()` spawns psql with `PGPASSWORD: ""` and PostgreSQL answers `fe_sendauth: no password supplied`. The migration runner (`services/bootstrap/migrate.mjs`, `databaseEnv()`) does it correctly by reading `cfg.database.embedded.password` — which is why migrations 0001–0017 succeeded and only the `kb_apply_embedding_dim` stage failed. The same defect also silently breaks `writeInstallState()`, which uses the identical helper (it is best-effort, so it failed invisibly).

## Fix

Single change in `services/bootstrap/init.js`, no schema, no architecture change:

- `pgArgs()` resolves the embedded password from the canonical config (`config.database.embedded.password`), keeping external mode exactly as it is today (host/port/user/db/password from `config.database.external`). Embedded stays `127.0.0.1` / configured port / `opsqai` / `opsqai`.
- `psqlExec()` keeps `-w` (never prompt) and passes the resolved password through `PGPASSWORD` in the child environment only; it stays out of argv, out of logs, and is never echoed. If config carries no password, fall back to an inherited `PGPASSWORD` as today rather than inventing one.
- When the embedding-dimension stage fails, the error detail passed to `OPSQAI-E1507` is scrubbed so no password value can ever reach stdout/stderr or the bootstrap log file.
- `public.kb_apply_embedding_dim(<dim>)` stays the mechanism; the stage keeps its existing position and error code.

Nothing else in the file changes: installId preservation, embedded-password generation/reuse for an existing data dir, DB creation skip, migration tracking, and the Ollama install/model-pull guards are untouched, so re-running bootstrap on the failed install resumes at the vector-storage stage without redownloading models, recreating the DB, rerunning applied migrations, or regenerating installId.

## Tests (`opsqai-windows/services/__tests__/`)

New spec covering the bootstrap psql contract, using a fake `psql.exe` that records argv plus the `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` it received:

1. Regression: with today's behaviour (empty PGPASSWORD) the fake psql exits with the `fe_sendauth: no password supplied` message and the stage reports `OPSQAI-E1507` — proving the test reproduces the reported failure.
2. After the fix, the invocation for `SELECT public.kb_apply_embedding_dim(1024)` receives `PGHOST=127.0.0.1`, `PGPORT=55432`, `PGDATABASE=opsqai`, `PGUSER=opsqai` and `PGPASSWORD` equal to the password in the sandbox `config.json`.
3. External mode still resolves host/port/user/database/password from `config.database.external`.
4. Secret hygiene: the configured password string appears in no captured stdout, stderr, or written log content, and never in the psql argv.

Then run the new spec and the full suite (both vitest configs).

## Report after implementation

Files changed, the exact psql command/environment before vs after, and explicit confirmation that migrations 0001–0017, Cloud/Supabase code, installId, and the embedded PostgreSQL password are all untouched and the failed install can simply be re-run.
