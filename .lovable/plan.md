# OPSQAI Internal — Self-Documenting Platform Workspace

This is a large feature. I'll split it into 4 sequential phases. Each phase is shippable on its own.

## Phase 1 — Foundations (schema + seed workspace)

**Migration**
- Add `companies.is_system boolean default false` + partial unique index ensuring only one system company.
- Add `knowledge_documents.knowledge_type text default 'company' check in ('company','system')`.
- Add `knowledge_documents.system_slug text` (stable id per auto-doc, e.g. `getting-started/platform-overview`) + unique `(company_id, system_slug)`.
- RLS on `knowledge_documents`: rows where `knowledge_type='system'` are visible only when caller `is_platform_admin()` OR `is_platform_owner()`. Same for `document_chunks` of system docs.
- New table `system_doc_catalog` (slug PK, category, title, body_md, related_slugs[], version int, updated_at) — the master catalog the generator reads from.
- Seed one row `INSERT INTO companies (name, is_system) VALUES ('OPSQAI Internal', true)` (idempotent via WHERE NOT EXISTS).
- Block deletion: trigger on `companies` rejecting `DELETE WHERE is_system`.

**Authorization**
- `current_company_id()` unchanged. Add helper `system_company_id()` returning the singleton.
- Workspace switcher: when platform admin selects "OPSQAI Internal", `activeCompanyId` = system company id; for everyone else, hide the option.

## Phase 2 — Auto-generated System Knowledge

**Catalog as code** (`src/lib/system-docs/catalog.ts`)
- Static array of ~70 entries (the categories the user listed), each with: `slug`, `category`, `title`, `purpose`, `whoCanPerform`, `requiredPermissions`, `whenToUse`, `steps[]`, `expectedResult`, `commonMistakes[]`, `tips[]`, `relatedSlugs[]`, and a `featureFlag` that maps to a real implemented feature in `src/lib/feature-catalog.ts`.
- A render function `renderSystemDoc(entry)` produces markdown using the prescribed structure.

**Generator server fn** (`src/lib/system-docs.functions.ts`, platform_owner only)
- `regenerateSystemKnowledge()`:
  1. Reads `feature-catalog.ts` — skips any catalog entry whose `featureFlag` is not implemented.
  2. Upserts `system_doc_catalog` rows.
  3. For each, upserts a `knowledge_documents` row (`company_id = system`, `knowledge_type='system'`, `system_slug=slug`).
  4. Re-chunks + embeds via the existing `embedTexts` pipeline.
  5. Audit log entry.
- Idempotent: only re-embeds when body hash changes (store hash in `system_doc_catalog`).

**Auto-link**: `relatedSlugs` rendered as a "Related Features" section at the end of every doc.

**Trigger**: a one-shot button in the new Internal admin page + run automatically on first visit to OPSQAI Internal if zero system docs exist.

## Phase 3 — OPSQAI Assistant + Knowledge view

**Route** `src/routes/_authenticated/app.internal.tsx` (gated to `is_platform_admin || platform_owner`) with subnav: Overview · Assistant · Knowledge · Academy · Audit.

**Assistant** — new server route `src/routes/api/internal-chat.ts`:
- Mirrors `api/chat.ts` but filters retrieval to `company_id = system_company_id() AND knowledge_type='system'`.
- Refuses any question not grounded in system knowledge with a translated "I can only answer questions about using OPSQAI" message.
- Cites system slugs as sources (links to `/app/internal/knowledge/{slug}`).

**Knowledge view**: read-only list grouped by category, with full markdown render and "Re-generate" button (platform_owner only). No upload/edit UI.

**Search**: tie into existing `search_everywhere` but scope to system docs when active workspace = OPSQAI Internal. Add a `kind='system_doc'` branch.

## Phase 4 — Academy + Audit hooks

**Academy seeder** (`seedInternalAcademy` server fn):
- Creates 5 learning paths (Owner, Super Admin, Company Admin, Manager, Employee) under the system company.
- Each path's chapters/lessons reference system docs as `source_document_id`, so the existing AI Teacher pipeline answers from System Knowledge automatically.
- Idempotent via stable slugs in `academy_learning_paths.code`.

**AI Audit**: extend the existing audit runner to accept `scope='internal'`. New checks:
- Documentation completeness (every implemented feature has a system doc).
- Training coverage (every role has an onboarding path).
- Broken `relatedSlugs[]`.
Score + recommendations surfaced in the Internal Overview tab.

## UI / nav

- Sidebar: when active workspace = OPSQAI Internal, swap "Chat/Knowledge/Academy" group for an "Internal" group with the OPSQAI Assistant entry.
- Workspace context banner already shows the current workspace — add an "Internal" badge variant.
- Hide every Customer Delivery / customer-only module while in Internal workspace.

## Files (new)

- `supabase/migrations/<ts>_system_workspace.sql`
- `src/lib/system-docs/catalog.ts`
- `src/lib/system-docs/render.ts`
- `src/lib/system-docs.functions.ts`
- `src/routes/api/internal-chat.ts`
- `src/routes/_authenticated/app.internal.tsx` (+ child routes for assistant / knowledge / academy / audit)
- `src/components/app/internal-subnav.tsx`

## Files (edited)

- `src/lib/authorization.ts` — add `requireInternalAccess` + `system_company_id()` wrapper.
- `src/components/app/app-shell.tsx` — sidebar branching for system workspace.
- `src/lib/auth-context.tsx` — expose `isInternalWorkspace`.
- `src/components/app/workspace-context-banner.tsx` — Internal badge.
- `src/lib/feature-catalog.ts` — add `slug` field used by generator filtering.

## Out of scope (intentional)

- No legal/ISO templates.
- No customer-side visibility — RLS hides system rows from non-platform users.
- No automatic regeneration on every deploy; a one-click "Regenerate" button + idempotent hash-based upsert is enough.

Approve and I'll start with Phase 1 (migration + seed + RLS), then Phase 2 in the same turn since they're tightly coupled.
