# Windows Self-Hosted — Installer/Startup Contract Patch

Scope: packaging + startup contract only. No schema changes, no migration rewrites (0001–0017 untouched), no Cloud/Supabase changes, no new architecture.

## Root causes to fix

1. **Payload archives lose their top-level directory.** `archiveComponent()` in `opsqai-windows/build/pack-payload.mjs` runs `7z a ... target *` with `cwd = payload/<component>`, so `app.7z` contains `server/…` instead of `app/server/…`. NSIS extracts into `$INSTDIR`, producing `C:\Program Files\OPSQAI\server`, `…\node`, `…\bin` — while every service/launcher expects `app\server`, `runtime\node`, `pgsql\bin`.
2. **UTF-8 BOM breaks config parsing.** `opsqai-windows/services/common/config.js` (`loadConfig`), `services/bootstrap/init.js` (prior-config read + arg JSON), `services/bootstrap/migrate.mjs` (config read; only the migration manifest is BOM-safe today) and `services/bootstrap/admin-seed.mjs` all call `JSON.parse(readFileSync(...,"utf8"))` directly.
3. **installId contract not enforced end-to-end.** `init.js` generates/persists it and `platform/index.js` forwards `cfg.installId || ""` — an empty string still reaches the app, which then throws `Missing environment variable: OPSQAI_INSTALL_ID` instead of failing at the service with a readable cause.
4. **No archive-structure validation**, so the build can emit a syntactically valid EXE with a wrong internal layout.

## Changes

### Packer (`build/pack-payload.mjs`)
- `archiveComponent({ archiver, payloadDir, dir, target })` runs 7z with `cwd = payloadDir` and the argument `<dir>\*` replaced by the component directory itself (`["a","-t7z","-mx=5","-mmt=on","-y","-r",target,component.dir]`), so the archive root is `app/`, `runtime/`, `pgsql/`, `caddy/`, `wizard/`, `desktop-shell/`, `winsw/`, `vendor/`.
- New `verifyArchiveRoot()` step after each part: `7z l -ba -slt` (injectable `run`) must show every entry under `<dir>/`; otherwise the build fails with an actionable message naming the component. Skipped optional components are not required.
- Keep unchanged: `MAX_PART_BYTES`, `MAX_TOTAL_STORED_BYTES`, SHA-256 manifest, `parts.generated.nsh` emission, stash/reuse, and the `pathToFileURL(process.argv[1]).href` CLI guard.

### BOM-safe config
- `services/common/config.js`: add `readJsonFile()` that strips a single leading `\uFEFF` before `JSON.parse` (no other transformation); malformed JSON still throws. `saveConfig` continues writing BOM-free UTF-8.
- `services/bootstrap/init.js`: prior-config read and JSON argument parsing go through the same BOM-tolerant helper.
- `services/bootstrap/migrate.mjs` and `admin-seed.mjs`: strip BOM on the config read; both keep honouring `OPSQAI_CONFIG` and stay free of hardcoded dev paths. `migrate.mjs` keeps its architectural paths (`app/migrations`, `pgsql/bin/psql.exe`, `installRoot = resolve(here,"..","..")`) and `ensureDatabaseExists()` untouched.

### installId / startup determinism
- `init.js`: preserve an existing `installId` from prior config (never regenerate on re-run/upgrade); only mint a UUID when none exists; validate UUID shape before persisting.
- `services/platform/index.js`: load config, and refuse to spawn the app when config is missing/invalid or `installId` is absent — log a single explicit line (config path + reason) and exit non-zero rather than launching a process that 500s. Never invent an install ID locally.
- `services/database/index.js`: keep `pg_ctl` restricted-token start, `pg_isready` readiness/watchdog, clean `stop -m fast`; only add explicit logging of the resolved config path/port and a loud failure when config cannot be loaded. Existing-data password preservation logic stays exactly as-is; `resetEmbeddedDatabase()` remains an explicit destructive path.
- WinSW XMLs already pass `OPSQAI_CONFIG=%ProgramData%\OPSQAI\config\config.json` for database/platform/worker/updater/hello — verify only, no functional change; Caddy needs none.

### Build + acceptance
- `build/build.ps1`: keep the existing pack step and hard failure on a missing manifest/`parts.generated.nsh`; print the per-part table plus explicit "skipped: <component>" lines.
- New `opsqai-windows/build/verify-install-layout.ps1` (scripted clean-install smoke check) asserting the acceptance list: installed directory layout, config exists/parses/has UUID installId, PostgreSQL service + 127.0.0.1:55432, `postgres` reachable, `opsqai` auto-created, migrations complete, `public.users` present, admin seed done, platform listening **and** `/health` returning healthy JSON (distinguishing not-listening / listening-unhealthy / healthy), Caddy up on https://localhost, no restart loop, and a re-run that preserves installId, DB password, database, schema and data.
- Caddy: local root-certificate failure is logged as a warning and never treated as the app failure.

## Tests
Update `build/__tests__/pack-payload.test.ts` and add `services/**/__tests__` coverage (Node/vitest, existing config split):
A. pack command preserves the top-level component directory; B. CLI entrypoint guard regression (`pathToFileURL`); C. archive-root validation fails on a flat archive and passes on a nested one; D/E. config loader with BOM and without BOM, malformed JSON still throws; F/G. installId generated once, preserved on re-run; H. existing embedded password preserved when a data dir exists; I/J. migrate runner creates a missing `opsqai` and skips an existing one (mocked psql); K. WinSW XMLs declare `OPSQAI_CONFIG`; L. platform env includes a non-empty `OPSQAI_INSTALL_ID` and refuses to start without one; M. manifest/parts structure assertions.

Then run the full suite (`bunx vitest run` for both configs) and report files changed, root causes, test results, the expected installed layout, and confirmation that migrations 0001–0017, Cloud functionality and existing installs' data/config/installId are untouched.
