## Root cause (confirmed from build.ps1 lines 268–312 and migration 0010 comment)

Migration `0010_kb_pgvector.sql` runs `CREATE EXTENSION vector;`, and its own header comment states:

> The Windows installer bundles a prebuilt pgvector 0.7.x (vector.dll + control/SQL files) under `vendor\pgsql\lib\` / `share\extension\`; `CREATE EXTENSION` below activates it.

But `opsqai-windows/build/build.ps1` never actually stages pgvector. It downloads only the vanilla EnterpriseDB PostgreSQL 16.4-1 portable zip into `payload\pgsql\` and stops there. The embedded PostgreSQL therefore has no `vector.control` under `pgsql\share\extension\`, so psql fails with `0A000: extension "vector" is not available`.

This is a build-payload bug, not a runtime bug. Reset & Retry cannot help — every reinstall from the same installer will fail at the same migration.

## Plan — add a "PostgreSQL extensions" stage to build.ps1

Add a new section right after step 5 (PostgreSQL Portable), before the payload guardrails, that stages pgvector into the already-extracted `payload\pgsql` tree.

### 1. Fetch prebuilt pgvector for PostgreSQL 16 / Windows x64

Upstream `pgvector/pgvector` does not publish Windows binaries. Use a pinned, checksum-verified community prebuild:

- Source: `https://github.com/andreiramani/pgvector_pgsql_windows` (releases contain `pgvector-<ver>-pg16-windows-x64.zip` with `lib\vector.dll`, `share\extension\vector.control`, and `share\extension\vector--*.sql`).
- Pin to a specific tag (e.g. `v0.7.4`) and SHA-256, matching the `pgvector 0.7.x` promise in the migration comment.
- Cache under `%TEMP%` like the other downloads and expand into a temp dir.

If the pinned upstream is not acceptable for the customer, the alternative is to host our own signed zip on the OPSQAI CDN using the same layout; the build step stays identical.

### 2. Copy files into the staged PostgreSQL tree

- `vector.dll` → `payload\pgsql\lib\vector.dll`
- `vector.control` + all `vector--*.sql` → `payload\pgsql\share\extension\`

Do this only when `-SkipPostgres` is not set (dev builds without Postgres also skip pgvector).

### 3. Add payload guardrails

Extend the `Assert-Exists` block (currently lines 293–312) with:

```
Assert-Exists (Join-Path $payload 'pgsql\lib\vector.dll')                       'pgvector runtime'
Assert-Exists (Join-Path $payload 'pgsql\share\extension\vector.control')       'pgvector control file'
```

so a broken build fails fast in CI instead of shipping a stub that dies at migration 0010.

### 4. Add a stable error code for the runtime side (defensive)

In `opsqai-windows/services/bootstrap/errors.cjs`, add `OPSQAI-E1010 — pgvector extension missing from PostgreSQL payload` and map psql `0A000: extension "vector" is not available` to it in `migrate.mjs`. This turns the current cryptic `E1001` into an actionable message that names the missing component and instructs the operator to reinstall (not "Reset & Retry", which won't fix a missing DLL).

Also flag `E1010` in `wizard.js` alongside `E1902` as a packaging error — hide "Reset embedded database & retry", show only "Open Log" + reinstall guidance.

### 5. Docs

Update `docs/administrator-guide/15-troubleshooting.md` with the `OPSQAI-E1010` entry and one paragraph in `docs/administrator-guide/04-postgres.md` noting that the embedded PostgreSQL ships with pgvector 0.7.x preinstalled — customers using an external PostgreSQL must install pgvector themselves.

## Files touched

- `opsqai-windows/build/build.ps1` — new pgvector stage + two `Assert-Exists` lines.
- `opsqai-windows/services/bootstrap/errors.cjs` — add `E1010`.
- `opsqai-windows/services/bootstrap/migrate.mjs` — map `0A000: extension "vector"` → `E1010`.
- `opsqai-windows/installer/wizard/renderer/wizard.js` — treat `E1010` as packaging error.
- `docs/administrator-guide/15-troubleshooting.md`, `docs/administrator-guide/04-postgres.md`.

## Verification

After rebuild:
1. Fresh install on a clean VM → migration 0010 prints `CREATE EXTENSION` and continues through step 8.
2. Manually delete `pgsql\lib\vector.dll` before install → wizard shows `OPSQAI-E1010` with reinstall guidance instead of a Reset loop.

## Open question

Confirm the pgvector source: pin the community prebuilt (fastest, ships next build) or host our own signed zip on the OPSQAI CDN (one extra CI step, no third-party dependency). I recommend the community prebuild for now and moving to a self-hosted signed zip in Phase 9's hardening pass.
