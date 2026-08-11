# Self-Hosted Forensic Audit — findings so far, and what to do next

No source changes yet. Below is what the code actually proves today, what is still
unproven, and the ordered work to close the gap between "source fixed" and
"installed EXE verified".

## What is already proven from the code

1. **No feature code touches the Supabase data client anymore.**
   A tree-wide search for `context.supabase.from/rpc/storage/auth` returns only
   4 files, all infrastructure: `src/lib/providers/require-auth.ts`,
   `src/lib/providers/selfhost/local-auth.server.ts`,
   `src/lib/providers/cloud/supabase-auth.server.ts`,
   `src/lib/providers/interfaces.ts`.
   The exact message in the AI Chat screenshot is thrown by the diagnostic Proxy in
   `src/lib/providers/selfhost/local-auth.server.ts` (`getDataContext`, lines 391-413).
   The current chat path — `app.chat.index.tsx` → `createThread`
   (`src/lib/threads.functions.ts:19`) → `getProfileCompany` → `getThreadRepository`
   — never dereferences that proxy, and Self-Hosted registers every repository
   factory it needs (`bootstrap-selfhost.server.ts:262-305`).
   **Therefore the running EXE is almost certainly not running this source.**
   This is a conclusion about the code; it is NOT yet proven against the installed
   binary, which is exactly why provenance comes first.

2. **Knowledge really does still have Cloud-only actions.**
   `src/routes/_authenticated/app.knowledge.tsx` imports `replaceDocumentVersion`,
   `rollbackToVersion`, `setCriticalFlag` from `src/lib/sop-versions.functions.ts`,
   which calls `getCloudSupabase(context, "sop-versions")` at lines 40, 126, 155.
   On Self-Hosted these throw `FeatureNotAvailableError`. Version replace / rollback /
   mark-critical are broken by construction. Upload / list / delete / reprocess go
   through `kb.functions.ts` + `getKnowledgeRepository`, which are fine.

3. **The permissions toast is a swallowed error.**
   `src/lib/auth-context.tsx` `loadProfile` (lines ~107-141) calls `bootstrapSession()`,
   retries twice, then shows exactly the toast in the screenshot — discarding the
   underlying message. `requireAuth` distinguishes "no authorization header",
   "invalid_token", and provider failures, but none of that reaches the user or the log
   in a recoverable form. In screenshot 1 the toast appears on the *sign-in* screen,
   which points at a session-change event firing with no usable bearer token — unproven
   until the real error text is captured.

4. **There is no frontend provenance at all.**
   No build hash, commit, or version is embedded anywhere in the app
   (searched for `VITE_APP_VERSION`, `BUILD_HASH`, `buildHash`, `__BUILD*`).
   Only the bootstrap script has provenance (`bootstrap-provenance.mjs`).
   `/health`, `/api/public/health`, `/api/public/doctor` expose no frontend identity.
   So today it is impossible to prove which frontend an installation is running —
   the core reason this report keeps contradicting the previous one.

5. **The frontend build path is single, not duplicated.**
   `bun run build:selfhosted` → `.output/server` + `.output/public` → copied to
   `payload\app\{server,public}` by `build.ps1` (lines ~95-110), then packed into
   `app.7z`. The installer wizard and desktop shell are packaged from source at build
   time via electron-packager. No legacy static frontend directory is copied.
   Remaining risk is therefore **staleness of the packed artifact / installed copy**,
   not a second frontend.

## Ordered work

### Step 1 — Frontend + server provenance (prerequisite for every other claim)
- Inject at build time: app version, git commit, and a SHA-256 over the built
  server entry + public asset manifest.
- Expose it in three places: `/api/public/health` JSON, a `Deployment` line in the
  app shell sidebar, and one startup log line from the platform service.
- `build.ps1` records the same record into `payload\app\build-provenance.json`;
  `verify-install-layout.ps1` asserts the installed copy is byte-identical, the same
  way bootstrap provenance already works.
- Acceptance: opening the installed app shows a build hash that matches the CI build log.

### Step 2 — Make the failure text recoverable, not cosmetic
- `bootstrapSession` failure surfaces the real error (auth header missing vs invalid
  token vs provider not registered) in the toast detail and in a persisted client log.
- Keep RBAC enforcement unchanged: no permission check is removed, no default-allow.
- Add a Self-Hosted diagnostics line to `/api/public/doctor`: which providers are
  registered, and whether the local auth provider verified the last token.
- Acceptance: reproducing the toast yields a specific cause, not a generic message.

### Step 3 — Close the proven Cloud leak in Knowledge
- Add version replace / rollback / critical-flag methods to `IKnowledgeRepository`,
  implement them in `pg-knowledge-repository.server.ts`, and route
  `sop-versions.functions.ts` through the repository instead of `getCloudSupabase`.
- Acceptance: version history, rollback and critical flag work on Self-Hosted.

### Step 4 — Complete the Cloud-access table with runtime evidence
- Instrument `FeatureNotAvailableError` and the not-migrated Proxy so every throw is
  logged with feature name + server function name.
- Walk the installed app once per sidebar item (Chat, Bubble chat, Knowledge, FAQ,
  AI Audit, Academy, Organization, Profile, Dashboard, Updates, Modules) and produce
  the table from the log, not from grep. 29 `.functions.ts` files still call
  `getCloudSupabase`; the table records, per feature, whether that path is reachable
  in Self-Hosted UI.

### Step 5 — Only then, fix what the evidence names
- Fix each feature the log proves is reachable and Cloud-bound.
- Do not touch migrations, PostgreSQL bootstrap, Ollama, license generation,
  installId, or password handling unless the log names them.

### Step 6 — Acceptance on the installed EXE
For each item, evidence is a screenshot of the installed Self-Hosted app whose
provenance hash matches the build:
- Knowledge: Upload Document, Upload SOP, Re-index, version history, Export
- FAQ: Add, Import, Export, Edit, Delete
- AI Audit: Run AI Audit completes
- AI Chat: New Chat, input, Send, history, local model status, citations
- Installer: wizard screens match current source

Report is then split explicitly into: source fixed / tests fixed / installer packaged /
installed runtime verified — with the provenance hash tying the last two together.

## Technical notes

- Error origin (verified): `local-auth.server.ts:399-405`.
- Chat entry (verified): `app.chat.index.tsx:52` → `threads.functions.ts:19`.
- Permissions entry (verified): `auth-context.tsx` `loadProfile` → `session.functions.ts:18`.
- Cloud leak (verified): `sop-versions.functions.ts:40,126,155`.
- Payload staging (verified): `build.ps1` `.output` → `payload\app` → `app.7z`.
- Existing precedent for provenance: `opsqai-windows/build/bootstrap-provenance.mjs`
  plus `verify-install-layout.ps1`.
