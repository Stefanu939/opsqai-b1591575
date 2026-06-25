# Sprint 3 — AI Workspace (Enterprise Document Intelligence)

A new module at `/app/workspace` for managers to upload temporary files, ask the AI to analyze/compare/extract, and generate professional PPTX / XLSX / PDF / DOCX outputs. Strictly isolated from the permanent Knowledge Base — no embeddings, no indexing, no influence on KB answers.

---

## 1. Data model (migration)

New tables, all RLS-scoped to `current_company_id()`:

- `workspace_sessions` — `id, company_id, user_id, title, created_at, updated_at, retention_policy ('immediate'|'1h'|'24h'|'7d'|'manual')`
- `workspace_files` — `id, session_id, company_id, user_id, file_name, mime, size_bytes, storage_path, extracted_text (text, nullable), status, expires_at, created_at`
- `workspace_messages` — `id, session_id, company_id, user_id, role, content, parts (jsonb), attachments (jsonb), created_at`
- `workspace_artifacts` — `id, session_id, company_id, user_id, kind ('pptx'|'xlsx'|'pdf'|'docx'|'md'|'csv'|'json'|'txt'), file_name, storage_path, expires_at, created_at`
- `companies.workspace_retention` column (default `'immediate'`) — admin-configurable per company.

Storage: new **private** bucket `workspace-temp` (separate from `knowledge-docs`). All paths prefixed by `company_id/session_id/`. Admin-only delete via cron; user can manually delete.

GRANT + RLS policies: only owner (creator) + company admins/managers can read; writes by owner.

Cron (`pg_cron`): every 15 min, delete `workspace_files` + `workspace_artifacts` whose `expires_at < now()`, then delete storage objects via a SECURITY DEFINER function.

Audit log entries: `workspace.upload`, `workspace.generate`, `workspace.delete` — content NEVER stored, only file_name + kind.

## 2. Backend / server functions

- `src/lib/workspace.functions.ts`
  - `createSession`, `listSessions`, `getSession`, `deleteSession`
  - `registerUploadedFile({ session_id, file_name, storage_path, mime, size })` — extracts text server-side (PDF via `unpdf`, DOCX via `mammoth`, XLSX via `xlsx`, CSV via parse, PPTX via `pptx2json` or basic XML extract, TXT direct, images skipped/OCR-later). Sets `expires_at` from company retention.
  - `deleteFile`, `deleteArtifact`, `listArtifacts`
- `src/lib/workspace-retention.functions.ts` — admin sets `companies.workspace_retention`.
- Upload flow: client requests signed upload URL → uploads directly to `workspace-temp` bucket → calls `registerUploadedFile`.

## 3. AI Workspace chat — `src/routes/api/workspace-chat.ts`

Separate server route from `/api/chat`. Key differences vs KB chat:

- Pulls **all extracted_text** from `workspace_files` of the active session into the system context (truncated/chunked per token budget — no embeddings).
- System prompt: "You are an AI operations analyst. Use ONLY the attached temporary documents. Do NOT use the company Knowledge Base unless the user explicitly asks for SOP comparison."
- Optional `compareToKb: true` mode: when user asks "compare against our SOPs", do a one-shot KB retrieval via existing `match_document_chunks_for_company` and inject those chunks too.
- Tools (function-calling) exposed to the model:
  - `generate_pptx({ title, slides: [{title, bullets, notes}] })`
  - `generate_xlsx({ sheets: [{name, rows: [[...]]}] })`
  - `generate_docx({ title, sections: [{heading, body}] })`
  - `generate_pdf({ title, sections })` (rendered from same DOCX-like structure)
- When a tool is called, server builds the file with the matching library, uploads to `workspace-temp`, inserts `workspace_artifacts`, returns a signed URL + artifact id in the message metadata.

Generators in `src/lib/generators/`:

- `pptx.server.ts` — `pptxgenjs`
- `xlsx.server.ts` — `exceljs`
- `docx.server.ts` — `docx`
- `pdf.server.ts` — `pdf-lib` (basic) or render DOCX→PDF via simple layout

(All pure-JS, Worker-compatible. No LibreOffice, no native binaries.)

## 4. UI

New routes:

- `src/routes/_authenticated/app.workspace.index.tsx` — sessions list + "New session".
- `src/routes/_authenticated/app.workspace.$sessionId.tsx` — main workspace:
  - Left: file drop zone + uploaded files list (with size, expiry countdown, delete button).
  - Center: chat (reuse `useChat` pattern from KB chat, point to `/api/workspace-chat`).
  - Right (or inline cards): generated artifacts list with Download buttons.
  - "Continue editing" — user just sends another chat message; model regenerates via tool call.
- `src/routes/_authenticated/app.admin.workspace-retention.tsx` — admin sets retention policy.

Nav: add "AI Workspace" item to `app-shell.tsx` (managers + admins only).

Upload component: multi-file drag/drop, progress bars, supported types: PDF, DOCX, TXT, XLSX, CSV, PPTX, PNG/JPG, ZIP (ZIP stored but unsupported for analysis in v1 — flagged "future").

i18n: add `workspace.*` keys in EN / DE / RO.

## 5. Security & isolation guarantees

- Distinct bucket (`workspace-temp`) + distinct tables — workspace data physically cannot be reached by the KB retrieval function.
- `match_document_chunks_for_company` continues to query `document_chunks` only; nothing in workspace tables has embeddings.
- Audit log records file_name + event only; no content.
- RLS: workspace rows readable only by owner (and admin/manager of same company for oversight). Artifacts likewise.
- Cron purges expired rows + storage objects. Manual "Delete now" on each file/session.
- Update `@security-memory` with the isolation invariant.

## 6. Out of scope for this sprint (called out)

- OCR on images (placeholder; v1 just stores the image and skips text).
- True ZIP extraction & multi-file recursive analysis (stored, not analyzed).
- Visio / flowcharts / Gantt — generators stubbed for future.
- DOCX→PDF high-fidelity conversion (v1 uses a simple PDF renderer; visually basic but valid PDF).

## 7. Deliverables checklist

- Migration: new tables, bucket, RLS, GRANTs, cron, retention column
- Server functions: sessions, files, artifacts, retention
- `/api/workspace-chat` route with tool-calling + 4 generators
- Workspace UI routes + nav entry
- Admin retention page
- i18n EN/DE/RO
- Security memory update

Estimated scope: large (≈15–20 files, 1 migration, 3 new npm deps: `pptxgenjs`, `exceljs`, `docx`, plus `mammoth` for DOCX extraction).

Reply **"go"** to build it, or tell me which slice to start with (e.g. "just chat + analysis first, generators in a follow-up").

Future extensibility: Design the AI Workspace around a pluggable tool architecture. Future tools (Power BI report generation, Visio diagrams, OCR, QR code generation, barcode analysis, workflow diagrams, ERP exports, Teams/Slack integrations, and other enterprise automation features) should be addable as independent modules without changing the core Workspace architecture.