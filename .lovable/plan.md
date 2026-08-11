# Self-Hosted: fix the global provider bug, then close the UI gaps

## Root cause of "Cloud provider was reached inside a Self-Hosted build" (confirmed)

`src/start.ts` registers the Cloud auth attacher unconditionally:

```
functionMiddleware: [ attachSupabaseAuth, providerBootstrapFunctionMiddleware, attachPlatformAuth ]
```

In a Self-Hosted build, `@/integrations/supabase/auth-attacher` is aliased to the throwing
stub (`src/lib/providers/stubs/cloud-stub.ts`), so `attachSupabaseAuth` is a Proxy that throws
on any property access. TanStack touches that middleware on **every server-function call**, so
every interactive feature — AI Chat, Bubble Chat, Knowledge, FAQ, AI Audit — fails with that
exact message. This is one architectural bug, not many feature bugs.

Second-order effect that explains the "missing buttons": `bootstrapSession()` is a server
function, so it fails too. `auth-context.tsx` then falls back to `roles: []`,
`permissions: new Set()`. Every primary action is permission-gated, so the buttons vanish:

- `app.audit.tsx` — `canRun = hasPermission("ai_audit.run")` gates both the header button and
  the empty-state "Run audit" button.
- `app.knowledge.tsx` — `canEdit = isAdmin || isManager` gates the Upload dialog trigger and
  the empty-state CTA.
- `app.faq.tsx` — Add FAQ / Import / Export exist but the page depends on the same session.

The buttons are already implemented; they are hidden because the session bootstrap dies.

## Verified feature matrix (from source, pre-fix)

| Feature | UI complete | Primary action present | Self-Hosted backend | Cloud dependency | Status |
| --- | --- | --- | --- | --- | --- |
| AI Chat | yes | send message | `/api/chat` → `resolveChatModel` (Ollama), pg repos, pgvector | none | blocked by start.ts stub |
| Bubble Chat | yes | send message | `chat.functions.ts` → `pg-direct-message-repository` | none | blocked by start.ts stub |
| Knowledge | yes (Upload dialog, versions, reindex, export) | Upload document | `kb.functions.ts` → `pg-knowledge-repository`, NTFS storage, local embeddings | none | blocked + hidden by empty permissions |
| FAQ | yes (Add / Import / Export) | Add FAQ | `faqs.functions.ts` → `pg-faq-repository` | none | blocked by start.ts stub |
| AI Audit | yes (Run audit, history, empty state) | Run audit | `runWorkspaceAudit` → local knowledge + FAQ repos, `pg-ai-audit-repository` | none | blocked + hidden by `ai_audit.run` gate |
| Academy | pages exist | varies | `academy-lms.functions.ts` + `pg-academy-repository` exist, but `academy.functions.ts` is wrapped in `getCloudSupabase(...)` | yes — Cloud-gated calls | needs routing to the local repository |
| Organization | yes (logo upload, company tab) | save / upload logo | `selfhost-config.server.ts`, pg company/profile repos | none | blocked by start.ts stub |
| Updates | yes | check / apply | local updater service | none | verify after fix |
| Modules | yes | entitlements from license JWT | `local-licensing.server.ts` | none | verify after fix |
| My Profile | yes | save profile | `pg-profile-repository` | none | verify after fix |
| Support & Tickets | yes | create ticket | none — `support.functions.ts` is fully `getCloudSupabase` | yes, by design | must show an explicit "not available on Self-Hosted" state instead of an error |

RBAC is correctly seeded locally: migration `0012` seeds the permission catalog (including
`ai_audit.run`), `0013` grants every permission to `platform_owner`/`platform_admin`, and
`admin-seed.mjs` assigns `platform_owner` to the setup account.

## Implementation

### Phase 1 — Platform-gated function middleware (the architectural fix)
Replace the static Cloud attacher in `src/start.ts` with a single platform-aware middleware that
resolves the token through the registered browser auth provider and only reaches the Supabase
attacher when the platform mode is Cloud (dynamic import after the mode check, the pattern
already used by `cloud-client.ts` and `not-available.ts`). Self-Hosted keeps
`attachPlatformAuth` only. No stub module is evaluated in Self-Hosted anymore.

### Phase 2 — Guardrail so this cannot regress
Extend `opsqai-windows/build/verify-source-imports.mjs` (and its test) to fail the build when a
module reachable from `src/start.ts`, `src/router.tsx`, or `src/routes/__root.tsx` statically
imports `@/integrations/supabase/*` (types excluded). Add a unit test asserting the Self-Hosted
middleware chain contains no Cloud attacher.

### Phase 3 — Verify the five acceptance flows against local providers
With the fix in place, run each flow and confirm the provider path: chat → Ollama chat model;
knowledge upload → extract → chunk → bge-m3 embeddings → pgvector; FAQ create → local table →
retrieved by chat; audit run → score/history from local repos; bubble chat → pg messages.
Fix only what these runs actually break; no rewrites.

### Phase 4 — Academy on local repositories
Route the Self-Hosted Academy surfaces through the existing `academy-lms.functions.ts` /
`pg-academy-repository` path and stop calling the `getCloudSupabase`-wrapped
`academy.functions.ts` from `/app/academy/*`. No new repository is created.

### Phase 5 — Honest degradation for Cloud-only surfaces
Support & Tickets (and any other `FeatureNotAvailableError` surface) renders a clear
"handled by your OPSQAI vendor portal" state instead of a runtime error. Navigation hides
entries that cannot work locally.

## Out of scope
No changes to the Windows bootstrap, embedded PostgreSQL, migrations 0001–0017, Ollama staging,
or the payload packer. Nothing in the installer pipeline is touched.

## Acceptance
On a clean Windows Self-Hosted install: AI Chat and Bubble Chat answer from local Ollama;
Knowledge upload reaches `Ready` with pgvector chunks; FAQ entries are created and retrieved by
chat; AI Audit produces a score plus history — and no operation evaluates a Cloud module.
