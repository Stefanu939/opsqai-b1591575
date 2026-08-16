# AI Audit intelligence, Academy chat fix, licensing check

Scope: Self-Hosted app (AI Audit, Academy, Knowledge Gaps) plus the module catalog shared with the Management Center. No Cloud/MC UI redesign.

## 1. AI Audit — health check charts

The audit already produces a full report (10 categories with score, status, risk, plus risk matrix, compliance readiness and KPI block) but the page only shows 4 tiles and a score trend. Add to the Audit page:

- A **Health check** panel: horizontal bar / radial view of all 10 category scores with healthy / attention / at-risk colouring, sorted worst-first.
- A **Compliance readiness** panel (ISO 9001, ISO 27001, ISO 45001, GDPR, EU AI Act) as progress bars with the missing items listed on click.
- A **KPI strip** (knowledge coverage, SOP coverage, training completion, AI readiness, document freshness, adoption) rendered from the report KPIs.
- Keep the existing maturity trend chart.

## 2. Executive summary — drill-down instead of one bubble

- Passed / Warnings / Critical become clickable cards. Clicking opens a detail sheet listing each finding (title, description, impact, risk, recommendation, priority).
- Inline preview shows at most 3 findings per severity; above the threshold (5 warnings or 10 critical) the card shows only counts plus "View all N" and never dumps the list into the summary bubble.
- The executive summary text gets its own collapsible block with strengths / opportunities / priority actions as expandable rows instead of one long paragraph.

## 3. Recommendations — real actions + one-click auto-generation

Recommendation cards get concrete phrasing ("Create SOP: …", "Add FAQ: …", "Build course: …") and action buttons:

- **Generate automatically** per card:
  - `sop` → AI drafts a full SOP from the gap questions and the existing knowledge base, publishes it into the Knowledge Base (Markdown document, chunked + embedded through the existing pipeline), marks the source knowledge gap resolved and links the document.
  - `faq` → AI drafts question/answer grounded strictly in existing KB content, saved into the FAQ library, source gap resolved and linked.
  - `course` / `course_assignment` → pre-fills the existing Academy course creation with the suggested title, format, difficulty and duration.
- **Generate all** in the panel header: processes every SOP/FAQ recommendation sequentially with per-item progress and a summary toast.
- Everything runs through the local AI engine only (existing Self-Hosted AI contract) and requires the same permissions as manual SOP publish / FAQ edit. Drafts are marked as AI-generated so a reviewer can see their origin.

## 4. Academy — chat freezes after picking the language

Confirmed cause in the lesson page: the chat transport is rebuilt whenever the chosen language changes, so `useChat` is handed a new transport mid-stream and its status never returns to idle — the composer stays disabled and the reply is lost.

Fix: keep one stable transport for the lesson and pass the chosen language through a ref that the transport reads at send time, so switching language never re-creates the chat. Also:
- Never leave the composer disabled when the stream is not actually running; add a watchdog that unblocks input if no bytes arrive.
- Replace the `alert()` on "pick a language" with the standard toast, and show a retry action if the teacher stream errors.

## 5. Licensing — verify end-to-end and move Knowledge Gaps into Basic

- Move `knowledge_gaps` from the paid add-ons into the Basic bundle (bump the module catalog version), remove it from the Pro add-on preset, and make sure the Knowledge Gaps surfaces are reachable on every install without a module license.
- Then walk the licence path end-to-end and fix what breaks: issue a licence in the Management Center with add-on modules → activation bundle JWT → Self-Hosted import → module unlock in the app UI and in server-side enforcement. Verify each catalog module key actually gates something and that revoke / expire locks it again.

## Technical notes

- `src/routes/_authenticated/app.audit.tsx` — charts, drill-down sheets, action buttons.
- `src/lib/ai-features.functions.ts` — new server functions for auto-generating a SOP / FAQ from a recommendation, reusing `generateSop` + `publishGeneratedSop` and the FAQ upsert path; resolve the originating gap via the knowledge-gap repository.
- `src/lib/audit-recommendations.ts` — carry the source gap id and suggested SOP/FAQ payload on each recommendation.
- `src/routes/_authenticated/app.academy.lesson.$lessonId.tsx` — stable transport + language ref, status watchdog.
- `src/lib/license-modules.ts` (Basic bundle + catalog version), `src/lib/license-enforcement.server.ts` and the module UI for the licensing pass.
