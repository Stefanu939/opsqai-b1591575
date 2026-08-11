# Fix OPSQAI-E1507 on fresh installs — bootstrap holds a stale in-memory config

## Confirmed root cause

On a **fresh** install `init.js` writes `config.json` with an intentionally empty embedded
password (`init.js:225-231`): the `OpsqaiDatabase` service generates it during `initdb` and
persists it back to `config.json` itself (`services/database/index.js:62-68`).

`init.js` then keeps using the **in-memory** `config` object it built *before* the service ran:

- `pgArgs()` (`init.js:492-503`) reads `config.database.embedded?.password` — still `""`.
- `describePgTarget()` (`init.js:509-520`) logs `pgpassword=MISSING` and throws
  `OPSQAI-E1507`.

That is exactly what the log shows: migrations 0001–0017 all succeed (because `migrate.mjs`
runs as a separate process and loads `config.json` from disk, so it sees the generated
password), admin seeding succeeds, Ollama and `bge-m3` verify at 1024 dims — and only the
vector-storage stage, which uses the in-process `config`, fails.

The previous credential fix was correct but incomplete: it fixed *where* the password is read
from, not *when*. A retry "worked" earlier only because the second run found the password
already on disk via `priorEmbeddedPassword`.

## Fix (single file: `opsqai-windows/services/bootstrap/init.js`)

1. **Re-read the canonical config after the database service is up.** Right after
   `postgres ready on 127.0.0.1:<port>`, reload `config.json` from disk with the existing
   BOM-tolerant `readJsonFile()` and merge the embedded credentials
   (`database.embedded.password`, `database.embedded.port`) into the in-memory `config`.
   Log `refreshed embedded database credentials from config.json` — status only, never the value.
2. **Make `pgArgs()` resilient rather than cached.** When the embedded password is empty, it
   re-reads `config.json` once before giving up, so any later stage picks up a password written
   by the service after bootstrap started.
3. **Keep the fail-fast, but only when it is genuinely absent.** `describePgTarget()` keeps
   `OPSQAI-E1507` and its actionable message for the real case (no password on disk either).
   `scrubSecrets()` continues to mask the value in all output.

Everything else stays untouched: installId preservation, the orphaned-data-dir auto-reset gate,
migration order and fingerprints, admin seeding, the Ollama install/pull guards, stage names,
error codes, and build provenance logging. Re-running the failed install resumes at the
vector-storage stage without redownloading models or rerunning applied migrations.

## Tests (`opsqai-windows/services/__tests__/`)

Extend `bootstrap-psql-credentials.test.ts`:

1. **Fresh-install regression:** `config.json` starts with `password: ""`; a fake database
   service writes a generated password into `config.json` while bootstrap is running; the
   vector-storage stage then reports `pgpassword=set` and calls
   `SELECT public.kb_apply_embedding_dim(1024)` with `PGPASSWORD` equal to that password —
   asserted to fail before the fix.
2. **Genuinely missing:** no password in config and none on disk still yields `OPSQAI-E1507`
   naming `config.database.embedded.password`.
3. **Secret hygiene:** the password appears in no argv, stdout, stderr, or log content.
4. External mode keeps resolving from `config.database.external`.

Then run both vitest configs and confirm no regressions.

## Not in scope

No change to migrations, the packer, NSIS, Ollama staging, or the app/Cloud code. This is one
timing bug in the bootstrap script.

## Acceptance

A clean Windows install reaches `STAGE ai engine: configuring vector storage` with
`pgpassword=set`, prints `vector storage pinned to embedding dimension 1024`, then
`STAGE ai engine ready (ollama, 1024 dims)` and `bootstrap complete` — on the **first** run, with
no retry needed.
