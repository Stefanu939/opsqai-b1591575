## Enterprise Customer Workspace Manager

Internal OPSQAI admin module. Visible **only** to Platform Owner / Platform Admin (and future Super Admin). Hidden from every workspace-level role. Reuses the existing Enterprise UI — no redesign.

### Where it lives

- New protected route: `/app/admin/customers` (with nested `/app/admin/customers/$companyId/...`)
- New sidebar entry under the existing "Platform" group, gated by `isPlatformAdmin || isPlatformOwner`
- Route `beforeLoad` enforces the same gate (defense in depth)

### Database (1 migration)

All new tables `company_id` keyed, RLS = `is_platform_admin()` only.

| Table | Purpose |
|---|---|
| `customer_profiles` | 1:1 with `companies`. JSONB columns `general`, `commercial`, `implementation`, `ai_config`, `sla`, `branding` (overrides), plus scalar `account_manager_id`, `renewal_date`, `contract_status`, `onboarding_pct`. |
| `customer_features` | Per-company feature matrix. `feature_key`, `state` (enabled/disabled/beta/enterprise/coming_soon), `notes`. Seeded from a server-side feature catalog. |
| `customer_compliance` | Pre-populated templates (GDPR, ISO 27001, ISO 9001, SOC 2, RBAC, isolation, encryption, backups, audit, retention, MFA, DR, BCP, residency) as editable rows `(area, status, evidence, notes, owner)`. |
| `customer_security` | Editable rows by `area` (auth, authz, encryption, storage, infra, backups, monitoring, IR, pentest, vuln mgmt, logging, audit, network). |
| `customer_documents` | Generated/edited docs. `doc_type`, `title`, `status` (draft/review/approved/sent/archived), `markdown`, `metadata` JSONB, current `version`. |
| `customer_document_versions` | Immutable snapshots `(document_id, version, markdown, metadata, created_by, created_at)` — restoreable. |
| `customer_timeline` | `event_type`, `payload`, `occurred_at`. Auto-rows from triggers on documents + manual inserts. |

Plus storage bucket `customer-exports` (platform-admin only) for PDF/DOCX artifacts. Add RPC `customer_health(p_company)` that reuses existing `dashboard_kpis` / `dashboard_health` and adds knowledge-gap trend, AI adoption, Academy progress, support activity.

### Server functions (`src/lib/customers.functions.ts`)

All `requireSupabaseAuth` + role check `is_platform_admin()`:

- `listCustomers()` — companies with summary stats
- `getCustomerProfile(companyId)` — profile + features + compliance + security + branding + health
- `upsertProfileSection(companyId, section, data)` — patches one JSONB block
- `upsertFeatureState`, `upsertComplianceRow`, `upsertSecurityRow`
- `listDocuments(companyId)`, `getDocument(id)`, `createDocument(companyId, docType)`, `updateDocument`, `archiveDocument`, `restoreVersion(id, version)`
- `generateDocument(companyId, docType, options)` — pulls profile, runs a template, then optionally calls Lovable AI Gateway (`google/gemini-2.5-flash`) to enrich
- `aiAssist(documentId, action, selection?)` — Generate/Rewrite/Simplify/MakeTechnical/Executive/Industry/Translate/ImproveFormatting via Gateway
- `exportDocument(id, format)` — markdown → PDF (existing pdf pipeline) / DOCX (`docx` lib already in deps) / HTML / MD; writes to `customer-exports`, returns signed URL
- `listTimeline(companyId)`, `addTimelineEvent`

Feature catalog (`src/lib/feature-catalog.ts`) is the source of truth for the matrix: AI Assistant, KB, FAQ, Knowledge Gaps, Audit Log, Analytics, Executive Dashboard, Reports, Brand Center, Academy, Workspace Health, AI SOP Generator, Source Citations, Platform Admin, RBAC, Multi-language, Enterprise Export, Support Center, plus the rest detected from the route tree.

### Frontend (reuses shadcn primitives)

```text
/app/admin/customers
├── index.tsx              Customer selector table (search, status, renewal soon)
└── $companyId/
    ├── route.tsx          Customer header + sub-tabs (loads profile once)
    ├── index.tsx          Overview: health KPIs, activity strip
    ├── profile.tsx        General + Contacts + Commercial + Implementation
    ├── features.tsx       Feature matrix grid (state dropdowns)
    ├── compliance.tsx     Compliance rows by area
    ├── security.tsx       Security rows by area
    ├── ai-config.tsx      Editable AI block
    ├── sla.tsx            SLA editor
    ├── branding.tsx       Logo/colors/banner/domain
    ├── documents.tsx      Doc list + AI editor + Export + Version drawer
    └── timeline.tsx       Activity feed
```

All forms use existing `Form`, `Card`, `Tabs`, `Table`, `Dialog`, `Badge`. The AI document editor reuses the markdown editor primitives already used by the AI SOP Generator; AI action buttons live in a toolbar above it.

### AI & integration hooks

- Lovable AI Gateway for all generation/rewrite/translate actions (no extra keys)
- Template strings live in `src/lib/customer-templates.ts` — 18 doc types listed in the brief
- Each document carries a `metadata.integrations` JSON slot so future CRM / HubSpot / Salesforce / Dynamics / Drive / SharePoint / DocuSign / M365 connectors can attach external IDs without schema change

### Access enforcement (RBAC, defense in depth)

1. Sidebar entry: `show: isPlatformAdmin || isPlatformOwner`
2. Route `beforeLoad`: redirect non-platform-admin to `/app`
3. Every server fn re-checks `is_platform_admin()` and 403s otherwise
4. RLS on all 7 new tables: `USING (public.is_platform_admin())` for SELECT/INSERT/UPDATE/DELETE; service_role grant for triggers/exports

### Out of scope (this sprint)

- Live external CRM sync (schema is ready; connectors land later)
- E-signature embed (DocuSign hook stub only)
- Editing the existing Brand Center — branding tab here writes only the **customer override** block

### Delivery order

1. Migration (tables + RLS + RPC + bucket)
2. `customers.functions.ts` + feature catalog + templates
3. Selector + customer shell + Profile/Features/Compliance/Security/SLA/AI/Branding tabs
4. Documents tab (list, editor, AI toolbar, versions)
5. Export pipeline (PDF/DOCX/HTML/MD) + Timeline auto-events
6. Sidebar entry, route gate, end-to-end check with Playwright as `baristefan5@gmail.com`
