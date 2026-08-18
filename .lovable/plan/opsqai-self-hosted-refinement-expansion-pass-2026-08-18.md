# OPSQAI Self-Hosted — Refinement & Expansion Pass

No redesign. Existing dark-green/gold tokens, `.oq-soft` shell, `ModulePage` layout, sidebar and navigation stay exactly as they are. Every new surface reuses existing primitives (`MetricTile`, `BentoGrid`, `DataTable`, `EmptyState`, confirm dialogs, `oq-*` motion utilities).

Work ships in the 5 phases you defined, in order. Each phase ends complete and verified before the next starts.

---

## Phase 1 — Core product improvements

**Knowledge Base document lifecycle**
- Extend document metadata: original upload date, last modification, version number, version history, last information-update date, owner user + responsible department.
- Version history stored per document so previous versions remain retrievable (no overwrites, no deletions).
- Derived status shown as a badge on every SOP/FAQ: `Current`, `Review recommended`, `Outdated`, `Missing review info`.
- Review period is a configurable organization setting (default tuned for the German compliance context), later overridable per framework/country in Phase 3.
- Knowledge and FAQ lists gain an "Age / last updated" column plus filters for the four statuses. Nothing is ever auto-changed or auto-deleted.

**AI Audit freshness signals**
- Audit findings include document age facts: first uploaded, last updated, whether it was ever changed, how long the current version has been live ("Never updated since initial upload", "Last updated 18 months ago").
- Stale documents produce `Review recommended` findings feeding the existing severity drill-down cards.

**AI Chat**
- Stop button replaces the send button while a response streams; aborts immediately and keeps the partial answer.
- Personality pass: warmer, professional tone; greets with the user's real first name from their profile, used sparingly (greeting + contextual moments only).

**Users management**
- Admin actions on a user: reset password, change email, change job title/position, assign or change department, change role (permission-gated), change profile picture, delete user, plus visible account status.
- Every destructive or identity-changing action goes through a confirmation dialog; all actions written to the audit log.

**Knowledge Gaps workflow + notifications**
- Status model: `New`, `Under review`, `In progress`, `Resolved`, `Published`.
- Repeated unanswered or weakly-supported questions group into one gap with an occurrence count.
- When a gap crosses an importance threshold (repeat count / criticality), management receives an in-app notification through the existing notifications system.
- Triage view on the existing Knowledge Gaps page: review, assign, progress through statuses, resolve.

## Phase 2 — Dashboard as a management overview

Same page, richer content; kept calm and card-based, no decorative charts.
- **User capacity**: seats licensed vs active vs free, e.g. "18 / 25 seats used", with a donut/progress visual.
- **Get started (5 tips)**: create departments, invite your team, add notes, import SOPs and FAQs, create courses — each with real completion detection and a "3 / 5 completed" progress indicator.
- **Maintenance status**: last maintenance, next scheduled maintenance, overall system status as simple status cards.
- **KPI + insight row**: AI Audit score, knowledge coverage, compliance status, trend indicators — each tied to a real number and linking to its module.
- **Integration cards** for Outlook, Gmail and Microsoft Teams. Not connected → clear "Connect Outlook / Gmail / Microsoft Teams" state. Connected → compact summaries (recent emails, recent Teams messages, upcoming and recent meetings). Connection plumbing is scaffolded now; provider auth is wired when you connect the accounts.

## Phase 3 — Country & compliance intelligence

- **Country/compliance registry**: one extensible configuration table of countries → default language, national data-protection context and terminology, applicable frameworks (GDPR, ISO 27001/9001/45001, EU AI Act, national laws). Germany and Romania ship as the first entries; adding a country is a data addition, not a code change.
- **Installer step**: new step to choose country, primary language and the resulting compliance frameworks (pre-selected from the country, adjustable). Stored into organization settings at first run.
- **Organization settings**: country, primary language and framework list become editable there afterwards.
- **Country-aware AI Audit**: audit prompts and recommendations use the organization's country, language, local terminology and selected frameworks. Every recommendation shows what drove it ("Recommendation based on GDPR requirements", "Relevant to ISO 9001 document control"). Wording stays advisory: *Compliance recommendation / Potential gap / Requires review / Recommended action* — never absolute legal advice.
- Review periods can be set per framework/country, defaulting to the German context.

## Phase 4 — Self-hosted heartbeat & Management Center visibility

- Each installation registers once with the Management Center using its installation ID and license credentials, then sends a lightweight periodic heartbeat: status, version, module list, license state, timestamp. No customer content, no personal data.
- Status model: `Online`, `Offline`, `Degraded`, `Updating`, `Maintenance mode`, `Unknown`. Missed check-ins age an installation to `Offline`, then `Unknown`.
- Fully fail-open: the local installation keeps working normally when the Management Center is unreachable; heartbeat failures are logged locally and retried.
- **Management Center → Self-Hosted installations**: list of registered installations with organization, country, primary language, status, version, last heartbeat, last known online, license status, installed modules, last/next maintenance. Filters for country, status, version and license status. Visibility layer only — no remote control of the customer's app.

## Phase 5 — Advanced AI features

- **Voice conversation**: microphone control in the chat composer, speech-to-text transcription into the input, optional spoken replies. Built so the transcription/voice backend can be swapped per deployment.
- **Image upload in AI Chat**: attach images, preview them in the thread, and let the model analyze them where the configured engine supports vision.
- **Visual understanding for SOP/FAQ**: document processing preserves embedded diagrams, screenshots, labels, image tables and visual instructions; answers can cite and display the relevant approved visual ("According to the loading procedure, the following diagram shows the correct pallet positioning").
- **Knowledge Gap → document generation**: a resolved gap can produce an AI draft (SOP draft, FAQ draft, professionally structured PDF). Flow is strictly gap → draft → human review → edit → approval → publish to Knowledge Base or FAQ. Nothing AI-generated is ever published without approval.

---

## Technical notes

- Data model: new self-hosted migrations extend `knowledge_documents` (lifecycle columns + version history table), `knowledge_gaps` (status enum, occurrence grouping, drafts), organization settings (country, language, frameworks, review policy), plus heartbeat/registration tables on the Cloud side. Cloud migrations add GRANTs and RLS in the same migration, as usual.
- Server logic stays in `createServerFn` thin wrappers under `src/lib/*.functions.ts` with runtime code in matching `.server.ts` modules, so the self-hosted bundle guardrails (`verify-bundle`, `verify-source-imports`) keep passing.
- Heartbeat ingestion is a public API route under `src/routes/api/public/*` with signature/license verification inside the handler.
- Country/compliance data lives in a single registry module consumed by the installer, organization settings and the audit prompt builder — one source of truth.
- Existing audit, chat, knowledge, gaps and users surfaces are extended in place; no parallel screens, no duplicated components.
- Self-hosted and Management Center stay strictly separated: the installation only talks to the Management Center through the licence/heartbeat API.
