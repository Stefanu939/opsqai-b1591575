## Root cause

Bootstrap log:

```
Error: Cannot find module './errors.js'
Require stack:
- C:\Program Files\OPSQAI\app\server\migrate.mjs
```

`migrate.mjs` is staged into `payload\app\server\` but `errors.js` is only staged under `payload\services\bootstrap\`. The `require('./errors.js')` inside `migrate.mjs` fails immediately, before any SQL runs.

## Plan

### 1. Fix staging (build.ps1)

- After copying `migrate.mjs` and `admin-seed.mjs` into `payload\app\server\`, also copy `services\bootstrap\errors.js` to `payload\app\server\errors.js`.
- Add `Assert-Exists (Join-Path $payload 'app\server\errors.js') 'staged migration error catalog'` to the payload guardrails so a future regression fails the build.

### 2. Runtime payload guard in init.js

Before spawning `migrate.mjs`, verify all required bootstrap files exist. Emit a structured, stable failure instead of letting Node crash with a raw stack:

```js
const migratorDir = programFiles("app", "server");
const required = ["migrate.mjs", "errors.js"];
const missing = required.filter(f => !fs.existsSync(path.join(migratorDir, f)));
if (missing.length) {
  console.log(formatFail("bootstrap", "OPSQAI-E1902", {
    message: `Installer payload incomplete. Missing: ${missing.join(", ")}`,
    dir: migratorDir,
  }));
  process.exit(5);
}
```

This runs immediately before `[bootstrap] launching migrate.mjs`, so the user sees:

```
Installer payload incomplete.
Missing: errors.js
```

instead of a Node module resolution stack.

### 3. New stable error code

Add `OPSQAI-E1902` to `services/bootstrap/errors.js`:

- category: `packaging`
- title: `Installer payload incomplete`
- Mark it as non-transient AND non-database — so it never suggests "Reset embedded database & retry".

### 4. Wizard classification

In `renderer/wizard.js` (`renderFailureCard`), extend the "don't offer database reset" check to include packaging codes:

```js
const isPackaging = /E1902/.test(f.code || "");
const showReset = dbMode === "embedded" && !transient && !isPackaging;
```

Also add an in-flight guard so double-clicking Retry/Reset can't launch two bootstrap children concurrently (the pasted log showed every line duplicated, indicating two runs at the same timestamp): disable both buttons immediately on click and re-enable them only after `runInstall` returns.

### 5. Fallback resolution in migrate.mjs (defense in depth)

Update `migrate.mjs` so the errors module can be found from either layout:

```js
const errorsPath = fs.existsSync(join(here, "errors.js"))
  ? join(here, "errors.js")
  : join(installRoot, "..", "services", "bootstrap", "errors.js");
```

If neither exists, emit an `OPSQAI-E1902` FAIL line directly (no `require('./errors.js')`), so migrate.mjs never crashes with an unstructured Node error again.

### 6. Docs

Append `OPSQAI-E1902 — Installer payload incomplete` to `docs/administrator-guide/15-troubleshooting.md` with the resolution ("re-run the installer; if it recurs, the setup .exe is corrupted — re-download").

## Files touched

- `opsqai-windows/build/build.ps1` — stage `errors.js`; add guardrail assertion.
- `opsqai-windows/services/bootstrap/init.js` — pre-flight required-files check before launching migrator.
- `opsqai-windows/services/bootstrap/errors.js` — add `OPSQAI-E1902`.
- `opsqai-windows/services/bootstrap/migrate.mjs` — resilient errors.js resolution + safe fallback FAIL.
- `opsqai-windows/installer/wizard/renderer/wizard.js` — packaging classification + in-flight guard.
- `docs/administrator-guide/15-troubleshooting.md` — new code entry.

## Expected next run

```
[bootstrap] launching migrate.mjs
[migrate] applying 1 pending migration(s) ...
```

If (hypothetically) a file is still missing, the wizard shows a clear card:

```
Error       OPSQAI-E1902
Reason      Installer payload incomplete. Missing: errors.js
```

with only **Retry** and **Open Log** — no misleading "Reset embedded database" suggestion.