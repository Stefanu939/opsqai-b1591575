# Prove the vector-storage fix actually ships in the installer

## What is confirmed today

- `opsqai-windows/services/bootstrap/init.js` already contains the fix: `pgArgs()` (lines 470-483) resolves the embedded password from `config.database.embedded.password`, `psqlExec()` (491-513) passes it only through the child `PGPASSWORD` env with `-w`, and `scrubSecrets()` masks it in any `OPSQAI-E1507` detail.
- `opsqai-windows/build/build.ps1:284-286` copies the whole `services\` tree into the payload, and `Assert-Exists` (line 443) checks `payload\services\bootstrap\init.js` exists — but nothing checks **which version** of that file it is.
- `services\` is NOT one of the pre-compressed `PACK_COMPONENTS` in `pack-payload.mjs`, so it ships as plain `File /r` and lands at `$INSTDIR\services\bootstrap\init.js`. The NSIS silent path (`OPSQAI-Setup.nsi:181`) and the wizard (`installer/wizard/main.cjs:26`) both execute exactly that path — there is only one bootstrap entry point.
- Because there is a single, uncompressed copy, the likeliest reason the failing run still showed `fe_sendauth: no password supplied` is that the installer EXE that ran was built before the fix — not a duplicate or stale file. This is unconfirmed, and the plan's first job is to make it provable instead of arguable.

## Goal

Never again guess whether the running installer contains a given source fix. Every layer must self-identify.

## Changes

### 1. Build-time provenance (build.ps1)
- After the `services\` copy, compute the SHA-256 of `payload\services\bootstrap\init.js`, print it as `[build] bootstrap init.js sha256=<hash>`, and write it plus the version/commit into `payload\services\bootstrap\build-provenance.json`.
- Add a guardrail assertion: the staged `init.js` must contain the embedded-password resolution (`config.database.embedded?.password`) and must NOT contain the old `embedded ? "" :` empty-password form. A build that would ship the regressed file fails immediately.

### 2. Runtime self-identification (init.js)
- At startup, log `[bootstrap] init.js sha256=<hash of own file> build=<version from build-provenance.json>`.
- Right before the vector-storage stage, log `[bootstrap] vector storage: psql host=... port=... user=... db=... pgpassword=<set|MISSING>` — status word only, never the value. If it resolves to MISSING in embedded mode, fail fast with a dedicated message naming `config.database.embedded.password` instead of letting psql produce the opaque `fe_sendauth` error.
- The existing stage position, `OPSQAI-E1505`/`E1507` codes, idempotency, installId preservation and Ollama guards stay exactly as they are.

### 3. Installed-layout verification (verify-install-layout.ps1)
- Assert `$INSTDIR\services\bootstrap\init.js` hash equals the hash in `build-provenance.json`, and assert there is no second `init.js` under `$INSTDIR\services` or `$INSTDIR\app` that a launcher could pick up instead.

### 4. Tests (`opsqai-windows/services/__tests__/`)
- Extend `bootstrap-psql-credentials.test.ts`: the diagnostic line reports `pgpassword=set` and the configured password appears in no stdout/stderr/log/argv.
- New provenance spec: the build guardrail rejects a regressed `init.js` (empty-password form) and accepts the current one; the hash written at build time matches the hash the runtime computes for the same bytes.
- Run both vitest configs (currently 205 green) and confirm no regressions.

## After implementation

Report: the exact `pgArgs()` embedded branch as shipped, the printed `init.js` SHA-256 at build time, and the acceptance criterion for the next clean install — `STAGE ai engine: configuring vector storage` succeeds with no `fe_sendauth: no password supplied`, and the log's `init.js sha256=` line matches the build output, which is what proves the packaged EXE contains the fix.
