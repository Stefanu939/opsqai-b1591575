
# Sprint 2 — Enterprise Knowledge Management

Builds on Sprint 1 without rebuilding it. All work reuses existing tables (`knowledge_documents`, `document_chunks`, `faqs`, `internal_requests`, `audit_log`, `user_roles`, `departments`, `companies`), the existing RAG pipeline in `src/lib/doc-processing.server.ts` + `src/lib/embeddings.server.ts`, the existing chat endpoint `src/routes/api/chat.ts`, the existing View Sources sheet, and the current `/app/*` routing and design system. Multi-tenant RLS pattern (`company_id = current_company_id() or is_platform_admin()`) is preserved on every new table.

## 1. SOP Version Management

Extend, don't replace, `knowledge_documents`.

- Migration: add `version int not null default 1`, `is_active boolean not null default true`, `parent_document_id uuid references knowledge_documents(id) on delete cascade`, `change_notes text`, `uploaded_by uuid references auth.users(id)`, `replaced_at timestamptz`. Partial unique index on `(company_id, doc_code) where is_active` so only one active version per SOP code per tenant.
- Upload flow detects duplicate `doc_code` in the tenant and prompts **Replace current version** vs **Keep both**. On replace: mark previous active=false, insert new row with `parent_document_id = previous.id`, `version = previous.version + 1`, re-run extraction → chunking → embeddings against the new row.
- Retrieval already joins `knowledge_documents`; add `AND d.is_active` to `match_document_chunks_for_company` so the AI always uses the latest active version.
- New `/app/knowledge/$docId/versions` route showing version history, change notes, uploaded by, upload date, and a **Rollback** action (flips `is_active`).

## 2. Source Intelligence (upgrade existing View Sources)

Reuse the existing sheet — no new modal.

- Migration: add `section text`, `page int`, `department_id uuid references departments(id)` to `knowledge_documents`. Chunker already records `chunk_index`; extend `document_chunks` with `section text`, `page int` populated during chunking when headers/page markers are detected.
- Chat response already returns sources; extend the payload with `version`, `section`, `page`, `department`, `last_updated`, `relevance` (cosine similarity), `confidence` (see §3) and a `primary` flag (top hit).
- Existing sources panel grows columns for those fields and an **Open document** button that opens a signed URL for the storage object.

## 3. AI Confidence Engine

In `src/routes/api/chat.ts`:

- Compute `answerConfidence = weightedAvg(top-K similarity) * coverageFactor` where coverage = fraction of answer sentences with a citation.
- Configurable threshold per company: new column `companies.min_confidence numeric default 0.55`.
- Below threshold: return the existing refusal string + `canCreateRequest = true` (already supported); never hallucinate. Persist `confidence` on `messages`.

## 4. Knowledge Gap Detection

New table `knowledge_gaps`:

```text
id, company_id, question_normalized text, occurrences int,
first_seen, last_seen, status enum('open','assigned','closed'),
assignee_id, resolution enum('sop','faq','dismissed') null,
resolved_document_id uuid null, resolved_faq_id uuid null
```

Insert/upsert from chat when refusal fires; bucket by normalized question (lowercase + trimmed + stopword strip).

`/app/admin/knowledge-gaps` (admin + manager): list + filter, actions **Create SOP** (deep-link to upload prefilled with the question), **Create FAQ** (prefilled FAQ editor), **Assign owner**, **Close gap**.

## 5. Analytics Dashboard

`/app/admin/analytics` (admin + manager). Server fn aggregates from existing `audit_log`, `messages`, `knowledge_gaps`, `feedback` (§6), `knowledge_documents`:

- Top Questions, Most Used SOPs, Most Used FAQs, Open Gaps, Unanswered count, Low-confidence count, Outdated SOPs (`updated_at < now() - interval '6 months'`), Avg confidence, AI usage per day.
- Export PDF (jspdf) and Excel (xlsx) — both Worker-safe.

## 6. Feedback System

New table `message_feedback (id, company_id, message_id fk, user_id, rating smallint check in (-1,1), comment text)`.

Add 👍 / 👎 under every assistant message in the chat UI; one-click toggle, optional comment. Feeds analytics.

## 7. Smart Escalation

Add `departments.manager_id uuid`, `departments.phone text`, `departments.shift_pattern text`.

When chat refuses, payload includes `escalation: { manager: {name, email, phone, department} }` chosen by the asking user's `profiles.department_id`. UI card with **Call** (`tel:`), **Email** (`mailto:`), **Create internal request** (existing flow). Existing `internal_requests` table grows `status enum('open','in_progress','completed','reopened')` (it already has status text — convert via check constraint instead of enum to avoid breaking data).

## 8. SOP Read Confirmation

- `knowledge_documents.is_critical boolean default false`.
- New `sop_acknowledgements (id, company_id, document_id, document_version int, user_id, acknowledged_at)`.
- Admin can mark a document **Critical** from the KB detail view. Employees see a blocking banner on `/app` and on `/app/knowledge/$docId` until acknowledged: "I have read and understood this SOP".
- Manager dashboard widget: % acknowledged per critical SOP, list of pending users.

## 9. Enterprise Notifications

`notifications (id, company_id, user_id, kind enum, payload jsonb, read_at, created_at)`.

Kinds: `sop_outdated`, `faq_outdated`, `new_gap`, `low_confidence`, `quarterly_report`. In-app bell in `app-shell.tsx` with unread badge + dropdown.

Producers (no new external infra):
- `sop_outdated` / `faq_outdated`: nightly `pg_cron` SQL job over rows with `updated_at < now() - interval '6 months'`.
- `new_gap`: insert from the same place §4 upserts gaps, fan out to admins + managers in that company.
- `low_confidence`: insert from chat endpoint when confidence < threshold.
- `quarterly_report`: cron on the 1st of Jan/Apr/Jul/Oct, payload = analytics snapshot for the previous quarter.

## Out of scope (explicitly)

Billing, SAML, SCIM, OCR, voice, WhatsApp, public API docs, self-serve trial — all deferred to a future Commercial Readiness sprint per your direction.

## Technical notes

- **One migration** introduces all new tables and column additions, each with GRANTs and the standard tenant RLS policy. Updates `match_document_chunks_for_company` to filter `is_active`. Adds the two pg_cron jobs via `cron.schedule`.
- No edits to `src/integrations/supabase/*`, `src/routeTree.gen.ts`, auth flows, marketing pages, demo, trust, legal, or PWA wiring.
- Existing chat endpoint is extended in place — same response contract, additive fields only — so the current `MessageList` keeps rendering. New fields are read by the upgraded sources panel and feedback bar.
- All new admin routes live under `_authenticated/app.admin.*` next to existing ones, guarded by `has_role` checks server-side.
- New libraries: `xlsx` and `jspdf` (both Worker-compatible) for §5 exports. No native deps.
- Estimated footprint: 1 migration, ~12 new route/component files, ~8 edited files, 2 packages added.

## Suggested execution order

1. Migration (all schema + RLS + cron).
2. SOP versioning UI + replace flow.
3. Chat endpoint upgrade (confidence, richer sources, gap upsert, low-confidence notification).
4. Upgraded sources panel + feedback bar.
5. Knowledge gaps page.
6. Notifications bell + producers.
7. Read confirmation flow.
8. Analytics dashboard + exports.
9. Escalation card + department manager fields.
