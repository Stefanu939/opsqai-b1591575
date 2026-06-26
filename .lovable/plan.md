# Sprint XI — Executive Workspace Experience

This sprint is large (14 parts). I'll ship it in 4 sequential batches so each piece is verifiable and never breaks existing functionality. **Nothing in Chat, Knowledge Base, Audit, RAG, RBAC, Workspaces, or Templates will change behavior — only new surfaces are added and a few items relocate.**

Please confirm scope and answer the 3 questions at the bottom before I start.

## Batch 1 — Dashboard becomes Executive Command Center + Chat cleanup

**Dashboard (**`/app`**)** — rebuild as executive-only:

- Remove Recent Conversations / Recent Questions / Conversation History blocks.
- 12 KPI cards, all from live DB: Questions Answered, AI Confidence (avg), Knowledge Gaps (open), Critical SOPs, Documents, FAQs, Templates, AI Audits, Audit Events, Active Users (last 30d), Workspaces, Workspace Health Score.
- **Workspace Health Score (0–100)** = weighted blend of SOP coverage, AI confidence, open gaps, missing SOPs, audit compliance, template usage, FAQ completeness, latest AI Audit score. Computed in a new SQL function `dashboard_health(company_id)`.
- **Activity Overview** — line chart (recharts) with period selector: Today / 7d / Week / Month / 30d / Custom. Series: Questions, Conversations, Users, AI Responses. Backed by new `dashboard_activity(company_id, from, to, bucket)` SQL function.
- **Knowledge Status** donut: Complete / In Progress / Missing SOPs.
- **AI Audit Summary** widget — last audit, score, passed/warnings/critical + link.
- **Critical SOP** widget — outdated / no review / low confidence / missing metadata / pending approval.
- **Top SOPs** — usage count, avg confidence, last updated.
- **Executive Insights** — AI-generated bullets (Lovable AI) cached 1h per company.
- Realtime via Supabase channel on `audit_log`, `knowledge_gaps`, `knowledge_documents` → invalidate React Query keys (no manual refresh).

**Chat (**`/app/chat`**)** — ChatGPT-style:

- Centered welcome (`Good morning, {name} 👋`), suggestion pills, big composer.
- Sidebar: New Conversation, Favorites, Templates, Workspace Selector, Settings. **No thread history list.**
- Existing `/app/chat/$threadId` route, RAG, sources panel, feedback — untouched.

**Audit Log** — already the source of truth; add the columns this sprint promises (workspace, feedback) to the existing view; no schema break.

## Batch 2 — AI SOP Generator + Validator

- New route `/app/knowledge/new-ai` (Manager+) — wizard: Title, Department, Category, Purpose, Inputs, Outputs, Responsible Role, Risk, Approval, Language.
- Server fn `generateSopDraft` streams a structured SOP via Lovable AI (Gemini), respecting company SOP template if present.
- Editable markdown preview → "Validate" runs `validateSop` server fn returning {score, missing_steps, duplicates, grammar, unsafe, missing_responsibilities, missing_approvals, coverage_gaps}.
- "Publish" inserts into `knowledge_documents` + chunks + embeds via existing pipeline. Versioning via existing `sop_versions`.

## Batch 3 — AI Workspace Audit + Smart Notifications + Global Search

- **AI Workspace Audit**: server fn aggregates docs/FAQs/templates/gaps/audit/confidence/coverage → Lovable AI → JSON report → PDF via existing `pdf.server.ts` → stored in `workspace_artifacts` (or new `ai_audits` table) with exec summary, risks, recs, priorities, maturity score. Admin route `/app/admin/ai-audit`.
- **Notifications**: extend existing `notifications` table consumers; in-app bell already exists — add filters and the new kinds (sop_approved, gap_found, audit_completed, doc_review, template_published, critical_sop_missing). Triggers added on inserts.
- **Global Search** (`Cmd/Ctrl-K`): command palette searching SOPs, FAQs, templates, documents, audit, users, conversations, AI audits via a single `search_everywhere(q)` SQL function using trigram + vector.

## Batch 4 — Personalization + UX polish + Security/RBAC verification

- **Dashboard personalization**: drag-drop / hide / resize / pin / reset; layout JSON in `profiles.dashboard_layout`.
- **UX**: skeleton loaders on all KPIs/charts, framer-motion transitions, route-level lazy loading for chart bundle, virtualization on long lists.
- **Light/Dark mode**: theme toggle already exists — verify all new surfaces.
- **Security/RBAC audit**: re-verify Platform Owner immutability triggers, run linter, ensure every new server fn checks `has_permission`.
- **Performance**: ensure dashboard payload < 2s; charts code-split.

## Technical notes

- **DB additions** (migrations, additive only):
  - SQL functions: `dashboard_kpis(company)`, `dashboard_activity(company, from, to, bucket)`, `dashboard_health(company)`, `search_everywhere(company, q)`.
  - Tables: `ai_audits` (id, company_id, requested_by, score, summary jsonb, pdf_path, created_at), `dashboard_layouts` (user_id PK, layout jsonb).
  - Notification kinds added as string values (no enum change).
- **Server fns**: `getDashboardKpis`, `getDashboardActivity`, `getKnowledgeStatus`, `getExecutiveInsights`, `getAiAuditSummary`, `getCriticalSops`, `getTopSops`, `generateSopDraft`, `validateSop`, `runWorkspaceAudit`, `globalSearch`, `saveDashboardLayout`.
- **Realtime**: existing publication; add `audit_log`, `knowledge_gaps`, `knowledge_documents`, `notifications`.
- **No removals** from existing files — old dashboard content is replaced in place, chat sidebar's history list is hidden via a feature flag check (`showHistoryInChat = false`) so the data still loads server-side for Audit.

## Questions before I start

1. **Insights cache window**: 1 hour per company OK, or do you want them recomputed every dashboard load? (cost ≈ 1 Lovable AI call/h/company vs per visit)
2. **AI SOP Generator visibility**: Manager + Admin + Platform Owner only — correct? (Supervisors excluded.)
3. **Global Search keyboard shortcut**: `Cmd/Ctrl + K` OK? (currently unused in the app.)

Reply with answers (or "go with defaults: 1h cache, Manager+, Cmd+K") and I'll start Batch 1 immediately.

Implement Sprint XI as one complete delivery.

&nbsp;

Do not stop after Batch 1.

&nbsp;

Do not wait for intermediate approvals.

&nbsp;

Complete all four batches as one implementation.

&nbsp;

You may internally implement them sequentially if it reduces risk, but the final delivery must include every batch before considering Sprint XI complete.

&nbsp;

Only pause if you encounter a blocking technical issue that requires a product decision.

&nbsp;

Otherwise continue until the entire sprint has been fully implemented, tested and integrated.

&nbsp;

The sprint is considered complete only when every feature described in Sprint XI has been delivered, verified and working together.

Implement Sprint XI as one complete delivery.

&nbsp;

Do not stop after Batch 1.

&nbsp;

Do not wait for intermediate approvals.

&nbsp;

Complete all four batches as one implementation.

&nbsp;

You may internally implement them sequentially if it reduces risk, but the final delivery must include every batch before considering Sprint XI complete.

&nbsp;

Only pause if you encounter a blocking technical issue that requires a product decision.

&nbsp;

Otherwise continue until the entire sprint has been fully implemented, tested and integrated.

&nbsp;

The sprint is considered complete only when every feature described in Sprint XI has been delivered, verified and working together.

Before starting implementation, review the entire existing OPSQAI codebase.

&nbsp;

Understand the architecture first.

&nbsp;

Then implement Sprint XI while preserving the existing architecture.

&nbsp;

Avoid duplicate code.

&nbsp;

Reuse existing components.

&nbsp;

Reuse existing services.

&nbsp;

Reuse existing server functions.

&nbsp;

Reuse existing database structures.

&nbsp;

Think like a Senior Enterprise Software Architect, not like a code generator.

&nbsp;

The objective is to build a production-ready Enterprise SaaS platform.