# OPSQAI Core — Operational Intelligence Engine (Self-Hosted)

Scope: Self-Hosted Core only. Nothing changes in Management Center, Customer Portal or the public website. Transport and HR keep working as they are; Core gains a new incident → cause → cost → solution chain.

## What exists today

- Knowledge base, FAQ, grounded chat with refusal when nothing is found, automatic knowledge-gap capture from weak answers, a Knowledge Gaps screen with drafting/publishing, an AI Audit screen with recommendations and auto-remediation into SOP/FAQ.
- Departments, users, per-area rights, audit log, notifications inbox, PDF generator.
- Missing entirely: incidents/damage records, cost and time-loss capture, SOP-violation linking, root-cause analysis (5 Why / Lean), Core analytics over incidents, thumbs-up/down feedback in the chat UI, department filtering of retrieval.

## Build order

**1. Incident & Damage Management (new area "Operations")**  
New records: type (damage, accident, process error, system error), title, description, date/time, department, location, financial cost, lost minutes, occurrence count, status (open → analysed → action → closed), involved person/role, attachments (images/PDF), linked SOP documents and FAQs.  
Screens: list with filters (department, type, status, period), full incident detail with inline editing, create/edit dialog, attachment upload with preview, PDF export of the incident file.  Cards UI .

**2. SOP / FAQ relationship**
On an incident, one SOP can be marked as violated; further related SOPs and FAQs are suggested from the knowledge base by similarity and can be confirmed or removed by hand. Relations are stored, so a document shows the incidents it is implicated in.

**3. Root Cause Intelligence**
For an incident, generate a chain: problem → immediate cause → root cause → violated procedure → related processes → financial impact → frequency → corrective and preventive action, plus a 5-Why ladder and a Lean waste classification. Every AI-produced line is grounded in the incident data, the violated/related SOPs, FAQs and previous similar incidents. When the knowledge base has nothing to support a step it says so instead of inventing one; a knowledge gap is recorded in that case. Each step is editable by the analyst and the final version is what gets stored.

**4. AI Solution Engine**
Corrective and preventive actions with owner, due date and status, each carrying the sources it was derived from. Actions appear on the incident, in the analyst's task list and in the Core overview when overdue.

**5. Audit Intelligence**
A Root Cause Report combining problem, violated SOP, detected cause, process failure, financial impact, time loss, frequency, root cause, 5-Why, corrective/preventive action, related SOPs and related knowledge gaps — for one incident or for a period/department. Delivered as PDF. The existing AI Audit screen additionally reads real incident data instead of only knowledge-base signals.

**6. Chat feedback → knowledge gap loop**
Under every assistant answer: "Was this helpful?" with yes/no. On no, a short comment field and optional image upload. Negative feedback creates or strengthens a knowledge gap, notifies managers/team leads of that department, and closing the gap by publishing an SOP or FAQ re-indexes the knowledge base. Feedback counts feed the answer-quality figure in analytics.

**7. Department isolation**
Retrieval is filtered by the asking employee's department before search, enforced in the database and server layer, not only hidden in the interface: an employee in Logistics can be grounded only on Logistics knowledge plus company-wide documents. Managers, team leads and SuperAdmin keep wider visibility according to their rights. Documents get an explicit department assignment with a company-wide option.

**8. Core Analytics**
Total incidents, total cost, cost per department, top root causes by financial impact, top violated SOPs by frequency, downtime, open knowledge gaps, answer quality; Pareto, trend over time, cost evolution, root-cause distribution, department comparison, estimated annual impact. One PDF export of the whole dashboard.

## Exports: PDF only

Every data export reachable from Self-Hosted Core and licensed modules becomes PDF. Specifically: the HR employee list export (currently a spreadsheet-friendly CSV) is replaced with a PDF employee register; the workspace/knowledge export bundle drops its CSV/spreadsheet outputs and ships a PDF report alongside the machine-readable JSON needed for restore; the spreadsheet path in the workspace chat tooling is removed. Backup/restore archives stay untouched — they are not user data exports. Every remaining export button is checked page by page.

## Buttons and interactions

A pass over Core, Knowledge, FAQ, Gaps, Audit, Users, Organization, Calendar and the new Operations screens: every button either performs its action, opens the dialog it promises or is removed; missing entry points are added (open incident from a document, open incident from a knowledge gap, start root-cause analysis, add corrective action, export PDF, attach evidence). Failures surface as visible errors, never a silent no-op.

## Technical notes

- New Self-Hosted migration adding `core_incidents`, `core_incident_links` (document/FAQ/incident relations), `core_incident_attachments`, `core_root_causes` (with 5-Why steps and Lean class), `core_actions`, plus a department column on knowledge documents and indexes for the analytics queries. Additive only; existing tables keep their shape.
- New named right `core_operations` (view) and `core_operations_manage` (create/edit/analyse), plus `core_costs` gating who may see financial values; SuperAdmin bypass as elsewhere. Rights enforced in the server functions, not the UI.
- Server functions in `src/lib/core-ops.functions.ts` with a `src/lib/core-ops/db.server.ts` layer following the Transport/HR pattern; AI calls go through the existing grounded provider and the existing refusal rules from `chat-grounding`.
- Root-cause and report PDFs use the existing `generators/pdf.server.ts` blocks.
- Chat feedback reuses the existing feedback repositories on both providers and the existing knowledge-gap recorder.
- Retrieval filtering extends the existing chunk-matching functions with a department predicate.
- EN/DE/RO strings for everything new.
- Verification: typecheck, tests, build, plus a walk through the new screens in the browser; real Windows Self-Hosted runtime cannot be exercised from here and will be flagged as such.

## Sequencing

Phases 1–2 first (data plus incident screens), then 3–4 (root cause and actions), then 5 (reports), 6–7 (feedback loop and isolation), 8 last (analytics), with the export cleanup and button pass done alongside phases 1 and 8.