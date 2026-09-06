# Fix document upload failure ("row.created_at.toISOString is not a function")

## What is wrong

Uploading a document in the Self-Hosted Knowledge Base fails with a date-conversion error. The upload itself works, but the code that reads back records (profile, users, documents, messages, audit, threads) assumes the database always returns real date values. When dates arrive as plain text instead, that conversion throws and the whole action is reported as failed.

The Transport screens showed the same symptom earlier. The reason is that date handling was global and could be changed by whichever part of the app loaded first, so the failure moves around between screens instead of staying in one place.

## The fix

1. Make date handling explicit and predictable for the Self-Hosted database connection, so dates always come back in one known form no matter which screen loads first.
2. Add one shared, tolerant date converter and use it everywhere Self-Hosted records are read, so a record can never crash a page again — it accepts both real dates and text.
3. Apply it across every affected area, not just the upload: knowledge documents, users and profiles, messages and conversations, threads, AI audit, integrations, academy, dashboard, presence/holidays, backups.
4. Re-check the upload flow end to end (upload, indexing, list refresh, status counters) and the Transport screens that showed the same error.

## Technical notes

- Set explicit `types.getTypeParser` overrides on the Self-Hosted `Pool` in `bootstrap-selfhost.server.ts`, `src/lib/transport/db.server.ts`, and `src/lib/ai-engine.server.ts` so timestamp/date OIDs (1082, 1083, 1114, 1184, 1186, 1266) are decoded consistently per pool rather than relying on process-global `pg` parsers.
- Add `src/lib/providers/selfhost/dates.ts` exporting `toIso(value)` / `toIsoOrNull(value)` accepting `Date | string | number | null`.
- Replace direct `row.created_at.toISOString()`-style calls in `src/lib/providers/selfhost/*` (`pg-profile-repository`, `pg-user-repository`, `pg-thread-repository`, `pg-message-repository`, `pg-direct-message-repository`, `pg-ai-audit-repository`, `pg-integration-repository`, `pg-auth-admin`, `pg-knowledge-repository`, `pg-academy-repository`, `pg-dashboard-repository`, `pg-presence-repository`, `windows-backup.server.ts`) with the helper.
- Keep the Transport `browserSafe()` normalization; it stays correct once parsers are pool-scoped.
- No schema change, no licensing/RBAC/entitlement change, no Cloud behaviour change.
- Verify with `bunx tsgo --noEmit`, `bun run build`, and the existing test suite; add a small unit test for `toIso` covering Date and text input.
