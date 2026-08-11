# OPSQAI Master Patch — Self-Hosted runtime, UI actions, and first-run Windows install

One implementation pass in two tracks: the app-side Cloud-provider bug that breaks nearly every
interactive Self-Hosted feature, and the bootstrap timing bug that makes a clean Windows install
fail at vector storage. The Windows installer is in scope.

## Track A — Self-Hosted provider architecture

### A1. Platform-gated function middleware (root cause)

`src/start.ts` registers `attachSupabaseAuth` unconditionally as the first entry of
`functionMiddleware`. In Self-Hosted builds `@/integrations/supabase/auth-attacher` resolves to the
throwing Cloud stub, and TanStack touches that middleware on every server-function call — so AI
Chat, Bubble Chat, Knowledge, FAQ, AI Audit, Organization and My Profile all fail with
"Cloud provider was reached inside a Self-Hosted build."

Replace it with a single platform-aware function middleware that, in its `.client()` phase:

- Self-Hosted: attaches the local session bearer via the existing platform auth path only.
- Cloud: `await import()`s the Supabase attacher lazily and delegates, exactly the pattern already
used by `cloud-client.ts` / `not-available.ts`.

`providerBootstrapFunctionMiddleware` and `attachPlatformAuth` keep their current order. No Supabase
fallback, no disabled auth.

### A2. Guardrail so it cannot regress

Extend `opsqai-windows/build/verify-source-imports.mjs` to walk the import graph from `src/start.ts`,
`src/router.tsx` and `src/routes/__root.tsx` and fail the build on any value (non-type) static import
of `@/integrations/supabase/*`. Add a unit test asserting the Self-Hosted middleware chain contains
no Cloud attacher.

### A3. Verify the local flows end to end

With the middleware fixed, exercise and repair each path (local providers only):

- AI Chat → `/api/chat` → `resolveChatModel` → Ollama → pgvector.
- Bubble Chat → `chat.functions.ts` → `pg-direct-message-repository`.
- Knowledge upload → extraction → chunking → bge-m3 → pgvector → **Ready**.
- FAQ create → local FAQ repository → retrievable by chat.
- AI Audit → local Knowledge/FAQ repos → `pg-ai-audit-repository` → score + history persisted.
- Academy → `academy-lms.functions.ts` → `pg-academy-repository` (never `getCloudSupabase`).

### A4. Honest degradation for Cloud-only surfaces

Support & Tickets (and any genuinely Cloud-only surface) renders a clear Self-Hosted state —
"managed through the OPSQAI vendor portal, not available in Self-Hosted" — instead of throwing.
Navigation hides or marks those entries. No fake local implementations.

### A5. Restore the permission-gated primary actions

`bootstrapSession()` currently fails, so `auth-context.tsx` falls back to `roles: []` /
`permissions: new Set()` and every gated action disappears. Once A1 lands, verify against the
seeded `platform_owner` / `platform_admin` that the existing UI actions are visible and wired:
Knowledge (Upload Document, Upload SOP, processing/Ready/Failed states, re-index, versions, export,
search, empty-state CTA), FAQ (Add, Import, Export, Edit, Delete, empty-state CTA), AI Audit
(Run AI Audit, latest score, passed/warnings/critical, history, empty-state CTA), AI Chat (New Chat,
input, Send, history, citations, local model status), Bubble Chat. RBAC stays enforced —
`ai_audit.run` is still required, never bypassed.

### A6. Visible UI/UX uplift

Apply the enterprise polish pass to the Self-Hosted app shell and these pages: refined cards,
tables, forms, status indicators, spacing scale, hierarchy, subtle gradients, cleaner charts and
navigation — within the existing OPSQAI identity (OPSQAI · AI Knowledge Platform for Logistics &
Supply Chain), using the shared design tokens rather than new one-off styles. Responsive at mobile
and desktop.

## Track B — Windows bootstrap first-run fix

### B1. Confirmed root cause of OPSQAI-E1507

On a fresh install `init.js:225-231` writes `config.json` with `database.embedded.password = ""`
by design; `services/database/index.js:62-68` generates the real password during `initdb` and
persists it back to disk. `init.js` then keeps its **pre-service in-memory** config, so
`pgArgs()` (`init.js:492-503`) reads `""` and `describePgTarget()` throws `OPSQAI-E1507`.
`migrate.mjs` succeeds because it loads `config.json` from disk in its own process — which is
exactly the observed log: migrations 0001–0017, admin seed and bge-m3 all pass, only vector storage
fails. A retry "worked" only because the password was already on disk.

### B2. Reload config once PostgreSQL is ready

In `opsqai-windows/services/bootstrap/init.js`, right after
`postgres ready on 127.0.0.1:<port>`, re-read `config.json` with the existing BOM-tolerant
`readJsonFile()` and merge `database.embedded.password` and `database.embedded.port` into the
in-memory config. Log `refreshed embedded database credentials from config.json` — status only.

### B3. Resilient `pgArgs()`

Embedded branch resolves `config.database.embedded?.password`. When empty, re-read `config.json`
once, update the embedded credentials, retry resolution, and only fail when the password is absent
in memory **and** on disk. External mode keeps resolving host/port/user/database/password from
`config.database.external`. No invented passwords.

### B4. Vector-storage diagnostics and secret hygiene

`describePgTarget("vector storage")` logs
`psql host=… port=… user=opsqai db=opsqai pgpassword=set|MISSING` before the stage, keeps the
fail-fast `OPSQAI-E1507` naming `config.database.embedded.password`, and never prints the value.
The password travels only via `PGPASSWORD` in the child env, `psql` keeps `-w`, and
`scrubSecrets()` keeps masking — no argv, stdout, stderr, log or exception exposure.

### B5. Build provenance and runtime self-identification

`build.ps1`: after staging services, hash `payload\services\bootstrap\init.js`, print
`[build] bootstrap init.js sha256=<HASH>`, write `build-provenance.json` (`version`, `commit`,
`initJsSha256`), and fail the build if `init.js` still contains the regressed `embedded ? "" :`
form or lacks `config.database.embedded?.password`.
`init.js`: hash its own file at startup and log `init.js sha256=<HASH> build=<VERSION>` read from
`build-provenance.json`.
`verify-install-layout.ps1`: assert `$INSTDIR\services\bootstrap\init.js` exists, matches
`initJsSha256`, and that no duplicate `init.js` exists under `$INSTDIR\services` or `$INSTDIR\app`.

### B6. Tests

Extend `opsqai-windows/services/__tests__/bootstrap-psql-credentials.test.ts`:
fresh-install regression (empty password → fake service writes it → `pgpassword=set` and
`kb_apply_embedding_dim(1024)` runs with the generated `PGPASSWORD`), genuinely-missing password →
`OPSQAI-E1507` naming the config key, secret hygiene across argv/stdout/stderr/logs, and external
mode unchanged. Add provenance tests: regressed `init.js` fails the guardrail, fixed one passes,
build hash equals runtime hash for identical bytes, version/commit round-trip.

## Preserved, explicitly untouched

Migrations 0001–0017 and their fingerprints, embedded password generation/preservation, installId
generation/preservation, reset/idempotency logic, Ollama staging and model guards, Cloud
functionality, the payload packer (single-root archives, no `7z -r`), SHA-256 manifest,
`parts.generated.nsh`, size limits.

## Verification

Run both Vitest configurations in full — bootstrap credential, provenance, Self-Hosted middleware,
source-import guard, packer and all pre-existing suites — and report the actual total, not just the
new tests. Then a **clean** Windows install (not an upgrade) must reach, on the first run with no
retry: `pgpassword=set` → `vector storage pinned to embedding dimension 1024` →
`STAGE ai engine ready (ollama, 1024 dims)` → `bootstrap complete`, with no
`fe_sendauth: no password supplied`. Final report covers the 23 items requested, including matching
build-time and runtime `init.js` hashes.

Note on honesty: I can make the source, guardrails and tests green here, but the clean-install
acceptance and the runtime hash proof require you to run the produced installer on a clean Windows
machine — I will state clearly which items are verified locally and which await your install run.  
Criteriul final pentru installer

Nu ne mulțumim cu „testele sunt verzi”. Pe Windows vrem să vedem efectiv:

```

```

```
[bootstrap] init.js sha256=<HASH> build=0.1.xxx
...
[bootstrap] STAGE ai engine: configuring vector storage
[bootstrap] vector storage: psql host=127.0.0.1 port=55432 user=opsqai db=opsqai pgpassword=set
[bootstrap] vector storage pinned to embedding dimension 1024
[bootstrap] STAGE ai engine ready (ollama, 1024 dims)
...
[bootstrap] bootstrap complete
```

și **zero**:

```

```

```
fe_sendauth: no password supplied
```

Iar hash-ul din prima linie trebuie să fie același cu hash-ul produs la build.

### Criteriul final pentru Self-Hosted

După instalare și login:

- **Chat** → Ollama local  

- **Bubble Chat** → Ollama/local DB  

- **Knowledge** → Upload SOP/document → processing → `Ready` → embeddings bge-m3 → pgvector  

- **FAQ** → Add / Import / Export / Edit / Delete  

- **AI Audit** → buton vizibil → rulează local → score/history  

- **Academy** → repository local  

- **Organization/Profile** → funcționează local  

- **Cloud-only** → mesaj clar, nu eroare Cloud  

- **RBAC** → rămâne activ, nu facem bypass doar ca să apară butoanele  

- **UI/UX** → modificat efectiv conform imaginilor tale, nu doar cod schimbat în backend.  


Și mai ales, problema pe care ai văzut-o acum:

> `Cloud provider was reached inside a Self-Hosted build`

trebuie să dispară **global**, nu să reparăm Chat, apoi Bubble Chat, apoi FAQ individual. Root cause-ul este middleware-ul și îl reparăm acolo.