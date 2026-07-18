## 1. Installer: remove the .NET requirement

**Finding (verified by grep across the whole repo):** no OPSQAI service uses .NET at runtime. All Windows services (`platform`, `worker`, `hello`, `updater`, `database`, `caddy`, `backup`) are Node.js scripts under `opsqai-windows/services/`, wrapped by WinSW (a self-contained Go binary). PostgreSQL 16 is bundled. Caddy is a static binary. Nothing invokes `dotnet`.

The `.NET 8 runtime` probe is a leftover from an early scaffold. It currently runs `dotnet --list-runtimes` and fails on every clean Windows machine even though the product does not need it.

**Action:** drop the check entirely rather than bundle a runtime the app doesn't use.

- `opsqai-windows/installer/wizard/renderer/wizard.js`
  - remove the `<li data-check="dotnet">` item from the System-check pane markup (line ~160)
  - remove the `["dotnet", ".NET 8 runtime"]` entry from the label map (line ~437)
- `opsqai-windows/installer/wizard/main.cjs`
  - delete `checkDotnet()` and the `results.dotnet = checkDotnet()` line
  - keep the other probes (Windows version, CPU, RAM, disk, PostgreSQL 16, ports, elevation)

No bundled runtime, no manual install step for the customer.

## 2. MC → Issue License: pick an existing company

`src/lib/companies.functions.ts` already exports `listCompanies` (returns `id, name, subscription_status, subscription_plan, max_users, active, created_at`). We'll extend the read to also select `contact_email` (already stored on `companies` via onboarding) so we can pre-fill it, and add a slug helper for a default `install_id` suggestion.

`src/routes/_authenticated/management.licenses.tsx` → `IssueLicenseDialog`:

- Add a `useQuery(['companies'], listCompanies)` at the top of the dialog.
- Replace the free-text **Company name** input with a `Combobox` (shadcn `Command` + `Popover`) listing existing companies, plus a "+ New company" sentinel that falls back to a free-text input.
- On selection, auto-fill:
  - `company_name` ← company.name (still editable)
  - `contact_email` ← company.contact_email (still editable)
  - `install_id` ← slugified company name (e.g. "Acme GmbH" → `acme-gmbh`), only if the field is empty or was itself auto-derived; user can override.
  - `seats` ← company.max_users when present (still editable)
- All four fields remain regular editable inputs after auto-fill, exactly as today. No server-side change to `issueLicense`.

No new tables, no schema changes.

## 3. License artifact format: always JWT, never JSON

Current state:

- Signed tokens use a custom compact envelope `opsqai.v1.<payloadB64>.<sigB64>` — close to JWT but missing the JOSE header segment.
- Downloadable artifacts from the Customer Portal (`portal.downloads.tsx`) wrap the tokens in a **JSON** envelope (`opsqai-activation-<id>.json`, `opsqai-module-<key>-<id>.json`).

Target: every license artifact a customer or installer touches is a standards-compliant compact JWS/JWT (`base64url(header).base64url(payload).base64url(sig)`), `alg: "EdDSA"`, `typ: "JWT"`, `kid: <key_id>`. Downloads are `.jwt` files with `application/jwt` MIME.

### 3a. Signing (`src/lib/license-signing.server.ts`)

- Add `signJwt(payload, privatePem, kid)` producing `b64url({"alg":"EdDSA","typ":"JWT","kid":kid}).b64url(payloadJson).b64url(sig)` where `sig = Ed25519(header + "." + payload)` per RFC 7515/8037.
- `signInstallLicense` / `signModuleLicense` return the new JWT string in the same `token` field (drop the `opsqai.v1.` prefix from new tokens).
- Verifier (`splitAndVerify`, `peekTokenKeyId`) is rewritten to parse three-segment JOSE tokens, read `kid` from the header, and verify with the matching public key. Reject tokens whose header `alg ≠ "EdDSA"` or `typ ≠ "JWT"`.
- Backward-compat: keep the old `opsqai.v1.*` parser behind a `legacy` branch invoked only if the string starts with `opsqai.v1.` — so existing installs continue to boot until their next activation-bundle refresh. New issuances are always JWT.

### 3b. Activation bundle (`buildActivationBundle`, `buildModuleLicenseBundle`)

- Wrap the bundle claims (`install_token`, `module_tokens[]`, `crl_token`, `bundle_version`, `iat`, `install_id`) as the **payload of a signed JWT** rather than a separate JSON-with-signature file.
- Callers now receive a single JWT string. The Portal writes it as `opsqai-activation-<install_id>.jwt` / `opsqai-module-<key>-<install_id>.jwt`, MIME `application/jwt`.
- Installer's offline importer is updated to accept a JWT bundle (three segments, `typ: "opsqai-bundle+jwt"`) and, for one release, still accept the old JSON shape.

### 3c. Installation package (installation-package.server.ts)

- `activation-bundle.json` inside the generated ZIP becomes `activation-bundle.jwt`. `entrypoint.sh` and the Windows first-run wizard already read the file by name — update the two references.

### 3d. Portal & MC UI

- `portal.downloads.tsx` → replace both `new Blob([JSON.stringify(bundle)], {type:"application/json"})` blocks with `new Blob([bundleJwt], {type:"application/jwt"})` and rename downloads to `.jwt`.
- MC license row "Copy token" already copies the raw token string — that continues to work since the string is now a JWT.

### 3e. Guardrails

- Add a unit test that asserts every issuing path returns a string matching `^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$` and that its decoded header is `{alg:"EdDSA", typ:"JWT", kid:...}`.
- Add a test that the legacy `opsqai.v1.` parser still verifies a fixture token so we don't break existing installs.

## Order of implementation

1. .NET removal (isolated, ~10 lines).
2. Issue-License dropdown (frontend only, uses existing `listCompanies`).
3. JWT migration (signing → bundle → package → downloads → tests), keeping the legacy verifier branch on for one release.

## Out of scope

- Bundling a .NET runtime (not needed — removed instead).
- Rotating existing signing keys (JWT change is envelope-only, same Ed25519 keys).
- Migrating already-issued `opsqai.v1.*` tokens in the DB (they keep working via the legacy parser; the next re-issue produces a JWT).
