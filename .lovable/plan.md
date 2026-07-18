## Root cause

`opsqai-windows/services/bootstrap/errors.js` is CommonJS (`module.exports = {...}`), but it gets staged into `app/server/` whose `package.json` has `"type": "module"`. Node therefore treats `errors.js` as ESM and rejects both `require()` (current code, `ERR_REQUIRE_ESM`) and a naive `import()` (would fail with "does not provide export 'formatFail'" because CJS default-exports the whole `module.exports` object under ESM interop rules — the named `formatFail` export wouldn't be picked up reliably across Node versions).

Dynamic `import()` is not the fix on its own.

## Fix — rename to `.cjs`

Rename the file so its extension unambiguously marks it CommonJS, independent of any parent `package.json`.

1. `opsqai-windows/services/bootstrap/errors.js` → `errors.cjs` (contents unchanged; keep `module.exports = {...}`).
2. Update every consumer's `require("./errors.js")` / candidate path list to `errors.cjs`:
   - `opsqai-windows/services/bootstrap/init.js`
   - `opsqai-windows/services/bootstrap/migrate.mjs` (candidate array + keep `createRequire` path — `require()` on `.cjs` works fine)
   - any other `require(".../errors.js")` found via `rg`
3. `opsqai-windows/build/build.ps1`: update the staging copy + the `Assert-Exists` guardrail to reference `errors.cjs` (both in `services/bootstrap/` and in `app/server/`).
4. `opsqai-windows/services/bootstrap/migrate.mjs` E1902 pre-flight message: update "Missing: errors.js" → "Missing: errors.cjs".

No behavioral changes to `formatFail` / `describe` / `isTransient` / `parseFail`.

## Verify

- `rg "errors\.js"` returns zero hits under `opsqai-windows/`.
- Rebuild the installer; migrator loads `errors.cjs` via `require()` and proceeds to apply the SQL migrations. The wizard advances past step 8.