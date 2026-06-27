# OPSQAI – Enterprise Feature Enhancement Plan

Scope: extend existing modules only. No layout, color, typography or component-library changes. Reuse current `card-enterprise`, sidebar, breadcrumbs, tables, dialogs, badges.

---

## 1. Knowledge Gaps — Enterprise hierarchy

Existing page: `src/routes/_authenticated/app.admin.knowledge-gaps.tsx` (flat list).

Replace with hierarchical routing while keeping the same visual cards/table:

```
/app/admin/knowledge-gaps                     → Companies grid (Super Admin) OR Users grid (Company Admin)
/app/admin/knowledge-gaps/$companyId          → Users grid for that company (Super Admin only)
/app/admin/knowledge-gaps/$companyId/$userId  → Question detail list (both roles)
```

Company Admin lands directly on the Users grid (their company_id is implicit; route still uses `$companyId` so URLs are shareable but resolved server-side to "your company" if mismatch).

New server functions in `src/lib/knowledge-gaps.functions.ts`:

- `listGapCompanies()` — platform_admin only; companies with open-gap count, user count, last activity.
- `listGapUsers({ companyId })` — users in company with unanswered-question count, last activity, role, department.
- `listGapsByUser({ companyId, userId, filters })` — gap rows with question, AI answer, date, category, status, assigned admin, resolution history. Filters: date range, department, category, status.

All RPCs gated by `is_platform_admin() OR companyId = current_company_id()`.

Detail card per gap shows existing fields + suggested KB doc (top match from `match_document_chunks`) and suggested FAQ (trigram match on `faqs`).

## 2. Audit Log — same hierarchy

Existing page: `src/routes/_authenticated/app.admin.audit.tsx`.

Routes:

```
/app/admin/audit                     → Companies grid (Super) OR Users grid (Company Admin)
/app/admin/audit/$companyId          → Users grid (Super only)
/app/admin/audit/$companyId/$userId  → Audit entries table
```

Server fns in `src/lib/admin-stats.functions.ts` (or new `audit-hierarchy.functions.ts`):

- `listAuditCompanies()`
- `listAuditUsers({ companyId })`
- `listAuditEntries({ companyId, userId, filters })`

Entry table columns (extend existing): timestamp, action, module, resource, old → new value (JSON diff), severity, success/failure. IP/device/browser only when stored — add nullable `ip text`, `user_agent text`, `severity text default 'info'`, `success bool default true`, `module text`, `resource text`, `old_value jsonb`, `new_value jsonb` to `audit_log` via migration. Existing rows keep nulls.

Filters: user, date range, module, action, severity.

## 3 & 4. Knowledge Base + FAQ export

New module `src/lib/exports.functions.ts` with `createServerFn` actions:

- `exportKnowledgeBase({ mode, format })` — `mode: 'only' | 'migrate' | 'delete'`, `format: 'zip' | 'json' | 'csv' | 'markdown'`.
- `exportFaqs({ mode, format })` — same shape.
- `exportWorkspace()` — full bundle (#5).
- `confirmDelete({ exportId, typed })` — requires `typed === 'DELETE'`, validates checksum, performs deletion in a transaction, writes audit entries.

Output is built server-side (JSZip in memory), uploaded to a new private bucket `workspace-exports` keyed by `<company_id>/<export_id>.zip`, and a signed URL (1 h) returned. The `migrate` mode produces the same ZIP with an extra `manifest.json` + `README.md` describing schema version and re-import contract.

KB ZIP contents: `documents.json` (rows incl. metadata, categories, tags, versions, authors, dates, status), `chunks.json` (optional, included by default), `embeddings.jsonl` (one row per chunk, base64 vector — flag-gated, on by default for migrate), `documents/<doc_code>.md`, `documents/<doc_code>.pdf` (when the original is a PDF and we still have the source in `knowledge-docs` storage), `manifest.json`, `CHECKSUMS.sha256`.

FAQ ZIP: `faqs.json`, `faqs.csv`, `faqs/<id>.md` (per question), `manifest.json`, `CHECKSUMS.sha256`.

CSV/JSON/Markdown single-format modes return the same content un-zipped.

## 5. Enterprise migration package (`exportWorkspace`)

ZIP layout:

```
manifest.json          // app version, schema version, company_id, generated_at, sha256 map
README.md              // re-import instructions
knowledge-base/        // (#3 contents)
faqs/                  // (#4 contents)
users.json             // profiles minus PII tokens
roles.json             // user_roles for company
permissions.json       // role_permissions snapshot
brand/                 // company brand_assets files (if bucket entries exist)
templates/             // SOP templates (rows + .md files)
categories.json
settings.json          // company row + workspace feature flags
audit-log.jsonl        // last 90 days for reference (no PII beyond what's already stored)
```

`migrate` mode additionally writes `IMPORT.md` with a step-by-step re-import guide (future importer is out of scope; package is forward-compatible).

## 6. Safe deletion workflow

UI (extends existing `dialog`):

1. User picks "Export + Delete" → server runs export.
2. Dialog shows export summary, file size, SHA-256 of ZIP, download link.
3. Checkbox: "I have downloaded and verified the export."
4. Input requiring exact string `DELETE`.
5. Confirm button (destructive) calls `confirmDelete({ exportId, typed })`.
6. Server re-verifies stored checksum vs storage object, then deletes rows in a single transaction (KB: chunks → documents → storage objects in `knowledge-docs`; FAQ: rows).
7. Every step writes to `audit_log` with `module='exports'`, `severity='critical'`.

Irreversible: no soft-delete; storage objects removed via service-role list+remove.

## 7. Audit trail

Every `export*` and `confirmDelete` call writes an `audit_log` row:

- `action`: `export.kb.only` / `export.kb.migrate` / `export.kb.delete` / `export.faq.*` / `export.workspace` / `delete.kb` / `delete.faq`
- `resource`: export id
- `new_value`: `{ files: [...], bytes, sha256, format }`
- `success`: bool
- `severity`: `info` for export, `critical` for delete

## 8. Security & RBAC

New permissions in `role_permissions` (migration):

- `exports.read` — Workspace Owner, Company Admin, Platform Admin, Platform Owner
- `exports.delete` — Workspace Owner, Platform Owner, Platform Admin only

Server fns enforce both `requireSupabaseAuth` and `has_permission(_, 'exports.delete')` for any delete mode. Company Admin attempting `mode='delete'` → 403.

Storage bucket `workspace-exports`: private; RLS policy allows SELECT to platform admins or members of the owning company; INSERT/DELETE platform admins + service-role only.

## 9. UI changes — extension only

- `app.admin.knowledge-gaps.tsx` → drill-down. Reuses existing card/table styles.
- `app.admin.audit.tsx` → same.
- `app.knowledge.tsx` → add "Export" dropdown to existing toolbar.
- `app.faq.tsx` → add "Export" dropdown to existing toolbar.
- `app.admin.platform.tsx` (Platform Admin landing) → add "Workspace Export" tile (status `live`) under existing grid — no layout change.
- New shared `<ExportDialog />` and `<ConfirmDeleteDialog />` built from existing `ui/dialog`, `ui/input`, `ui/button`.

## Technical details

- ZIP generation: `jszip` (Worker-compatible, pure JS). PDF generation reuses existing `src/lib/generators/pdf.server.ts`.
- Embeddings export: stream `document_chunks` in batches of 200 to avoid memory pressure.
- All export server fns return `{ exportId, downloadUrl, sha256, bytes, files }` — no raw `Response` over RPC boundary.
- New DB tables (one migration):
  - `exports` — `id, company_id, kind, mode, format, status, sha256, bytes, storage_path, created_by, created_at, deleted_at`
  - Plus columns added to `audit_log` (see #2)
  - Plus storage bucket `workspace-exports` + RLS
  - Plus `role_permissions` inserts for `exports.read` / `exports.delete`
- Bundle `jszip` (`bun add jszip`).
- No changes to existing tables' columns beyond `audit_log`.

## Out of scope (explicit)

- Re-import flow (only the package format is forward-compatible).
- New visual design tokens, sidebar items beyond the existing ones.
- Cross-company migration tooling.

If approved, I will execute it as: migration → server fns → drill-down routes → toolbar export dialogs → wire audit entries → verify build.Additional Enterprise Enhancements

Please include the following enhancements as part of the implementation:

### 1. Export Jobs

Large exports must run asynchronously instead of during a single request.

Implement an Export Jobs system with the following statuses:

- Queued
- Processing
- Completed
- Failed
- Cancelled

Users should be able to monitor progress and download the export once completed.

---

### 2. Knowledge Health Score

Extend the Knowledge Gaps module with a company-level **Knowledge Health Score**.

Display metrics such as:

- Knowledge Health Score (%)
- Open Knowledge Gaps
- Repeated Questions
- Resolved Questions
- Average Resolution Time
- Last Knowledge Update

This should appear on Company cards and provide a quick overview of workspace knowledge quality.

---

### 3. Versioned Export Manifest

Every exported package must include version metadata inside `manifest.json`.

Include:

- OPSQAI Application Version
- Database Schema Version
- Export Format Version
- API Version
- Generated Timestamp
- Package Checksum

This ensures future compatibility with upcoming import tools.

---

### 4. Workspace Owner Role

Introduce a dedicated **Workspace Owner** role, separate from **Platform Admin**.

Permissions:

- **Platform Owner** → Full platform control.
- **Platform Admin** → Manage all workspaces but cannot permanently delete workspace data unless explicitly authorized.
- **Workspace Owner** → Full administrative control over their own workspace, including exports and workspace management.
- **Company Admin** → Daily administration only.
- **Champion** → Operational administration.
- **User** → Standard access.

Update RBAC and permission checks accordingly while maintaining complete workspace isolation.Super Admin Permissions

All Platform-level administrators (Platform Owner, Platform Admin and any future Super Admin roles) have unrestricted access to the entire OPSQAI platform.

They can:

- Access every workspace and company.
- View and manage all data across all tenants.
- Export, migrate and permanently delete workspace data.
- Manage all users, roles and permissions.
- View all Knowledge Gaps and Audit Logs across every company.
- Access all platform administration features.
- Override workspace restrictions when required.

Workspace-level roles (Workspace Owner, Company Admin, Champion and User) remain fully isolated to their own company and cannot access or modify data belonging to other workspaces.

This full-access model is intentional and represents the highest level of authority within the OPSQAI platform.