# Self-Hosted: fix blocking errors, complete RBAC, chat bubble, KB/FAQ & AI Audit

Goal: the Windows Self-Hosted app must work end-to-end with no "Cloud provider was reached" errors, with a working internal chat bubble, real role presets, working document/FAQ input for the AI, and a single place for modules.

## 1. Kill the remaining Cloud leaks (confirmed causes)

- `src/lib/avatar.ts` statically imports the Cloud client and calls `supabase.storage...` in `useAvatarUrl`. On Self-Hosted that module is aliased to the throwing stub, so every screen that renders the avatar (app shell, Organization page) throws "Cloud provider was reached". Fix: resolve avatar URLs through a server function backed by the platform storage provider (local NTFS storage on Self-Hosted), and remove the static Cloud import.
- `src/lib/profile.functions.ts` routes avatar path read/write through `getCloudSupabase(...)`, which hard-fails on Self-Hosted even though a local profile repository exists. Fix: use the registry repository directly (no Cloud gate).
- Company name/profile enrichment on `app.organization.tsx` and in `auth-context` returns early on Self-Hosted, so the company field stays empty. Fix: read company name and profile fields through the existing platform repositories (company + profile) instead of the Cloud-only path.
- AI Chat error is not yet root-caused: the `/api/chat` route and its repositories are already platform-agnostic. First step is to reproduce and read the actual failing request/response, then fix the identified layer (token attach, provider registry boot, or embeddings). No blind changes.

## 2. Internal chat bubble on Self-Hosted

- `src/routes/__root.tsx` renders `ChatGlider` only when `cloudFeaturesEnabled()`, so the bubble is invisible on Self-Hosted; `chat-glider.tsx` also imports the Cloud client statically for realtime.
- Fix: render the bubble in both modes, replace the Cloud client usage with the platform-agnostic `chat.functions` server functions plus polling on Self-Hosted, and implement attachment upload/signing through the local storage provider (currently both attachment server functions throw unconditionally).

## 3. Role presets with real permission sets

Existing DB roles are `admin / manager / team_leader / employee / viewer` with a seeded permission matrix. Requested naming is Superadmin / Manager / Supervisor / Worker.

- New migration: rename the display names to Superadmin, Manager, Supervisor, Worker (keys stay stable), add German labels, and tighten the Worker set to AI Chat + Academy + internal messages only.
- Installer seeder assigns the first account the full-control role and marks it protected so it can never lose access.
- Users page: create members with email + temporary password, assign one of the four presets, list/disable members. Verify the insert path against the real local `users` table columns.

## 4. Modules: one surface, correct licensing, AI Audit

- `src/lib/license.tsx` only decodes the legacy 4-part `opsqai.v1.*` token. Licenses are now JWT, so decoding fails, the state is marked revoked and only the Basic bundle is exposed — that is why activated modules do not show up. Fix: decode standard JWT payloads (keep legacy support), so licensed add-ons appear.
- Add an `ai_audit` module entry to the catalog and map the existing AI Audit surface to it.
- Merge "Subscription" and "Modules" into a single navigation entry (keep the richer page, redirect the other route).
- AI Audit "Run" button already exists but is permission-gated; after the role work it must be visible to Superadmin/Manager, and the audit must run against local data.

## 5. Knowledge Base & FAQ input for the AI

- Verify upload and FAQ creation work on Self-Hosted end-to-end (local storage + pgvector embeddings), and make the add/upload buttons visible for the roles that own content.
- Confirm an uploaded document is chunked, embedded and then actually cited by the AI Chat answer.

## Technical notes

- All fixes stay behind the provider registry; no new direct Cloud SDK imports (guarded by `verify-source-imports.mjs` / `verify-bundle.mjs`).
- One new `migrations/selfhost/0013_*.sql` for role naming/permission changes, registered in the migration fingerprint list.
- Verification: source-import guard, migration verifier, provider unit tests, and a manual pass over Chat, Knowledge, FAQ, Audit, Users, Organization and the chat bubble.
