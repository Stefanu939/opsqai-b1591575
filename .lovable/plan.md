# Wave C.2b — Finish the Data-Access Migration

34 `.functions.ts` files still reach `context.supabase` directly. Migrating
every one to a hand-written Self-Hosted repository would be ~4000 lines of
code for surfaces that are Cloud-only by product design (MC console,
support, workspace, portal admin). We split the remaining work into two
tracks — one that actually ships Self-Hosted features, and one that
cleanly reports "n/a on Self-Hosted" for MC-only surfaces without shipping
dead code.

## C.2b.2 — Functional on both platforms (real repos)

These features must work on the customer product too:

- `kb.functions.ts` — knowledge documents (list, publish, delete)
- `faqs.functions.ts` — company FAQs
- `sop-versions.functions.ts` — SOP version history
- `sop-ack.functions.ts` — SOP acknowledgements
- `internal-requests.functions.ts` — internal request tracker
- `knowledge-gaps.functions.ts` — read/assign gaps (write path already done in C.2b.1)

Deliverables:
1. `migrations/selfhost/0009_knowledge.sql` — `knowledge_documents`,
   `faqs`, `sop_versions`, `sop_acknowledgements`, `internal_requests`,
   plus indexes. `knowledge_gaps` already exists (0008).
2. Five new interfaces in `interfaces.ts`:
   `IKnowledgeDocumentRepository`, `IFaqRepository`, `ISopVersionRepository`,
   `ISopAcknowledgementRepository`, `IInternalRequestRepository`.
   Extend `IKnowledgeGapRepository` with `list/get/assign/resolve`.
3. Cloud impls (`supabase-*.server.ts`) — thin wrappers around
   `context.supabase.from(...)`. RLS handles tenancy.
4. Self-Hosted impls (`pg-*.server.ts`) — explicit `company_id` filters;
   single-tenant so `getProfileCompany` gives the id.
5. Register in both bootstraps.
6. Rewrite the six `.functions.ts` files to consume the repos.

## C.2b.3 — Cloud-only surfaces (`NotAvailableRepository`)

These 28 files back MC / opsqai.de features that never ship to a customer
Windows host — support console, workspace, MC admin, releases, license
management, exports, dashboards, analytics, portal admin, AI features,
webhooks, DR bootstrap, subscription lifecycle, installer, system docs,
platform config, first-run, deployment-mode, onboarding, etc.

Deliverables:
1. One shared helper `src/lib/providers/not-available.ts` exporting
   `notAvailable(feature: string): never` — throws `NotAvailableError`
   with `{ code: "FEATURE_NOT_AVAILABLE_SELFHOST", feature }`.
2. A very small "cloud-only data context" wrapper per file: at the top of
   every handler in these 28 files, replace `context.supabase.from(...)`
   with the same shape but from a `getCloudSupabase(context)` helper that
   returns `context.supabase` on Cloud and calls `notAvailable(...)` on
   Self-Hosted before any query runs. No feature-by-feature repo layer.
3. Bulk edit driven by a codemod script — one-line replacement per file:
   `const db = getCloudSupabase(context, "<feature>");` then `db.from(...)`
   instead of `context.supabase.from(...)`. Preserves every existing query
   verbatim. Only touches identifiers, keeps behavior identical on Cloud.
4. UI capability gating is already in place from Phase 4, so these
   endpoints simply become defense-in-depth on Self-Hosted.

## Order of operations

1. Land `not-available.ts` + `getCloudSupabase` helper (10 min).
2. Codemod the 28 Cloud-only files in one batch, run tsgo.
3. Land migration `0009` + interfaces + Cloud/SH repos + factory wiring.
4. Rewrite the six C.2b.2 files.
5. Verify: `bun run build:selfhosted`, then run `verify-bundle.mjs`; the
   Supabase-import exception can stay one more wave (workspace/webhooks
   still lazy-load Supabase client via `getCloudSupabase` — removed in a
   later Wave D).

## Definition of done

- `tsgo` clean.
- Cloud build behaves identically (same queries, same RLS path).
- Self-Hosted build: every KB/FAQ/SOP/Request/Notification feature works
  end-to-end against local Postgres.
- Every MC-only feature returns a clean `FEATURE_NOT_AVAILABLE_SELFHOST`
  error on Self-Hosted rather than the raw "supabase not available" from
  the diagnostic Proxy.

Approve and I start with step 1 in this turn.
