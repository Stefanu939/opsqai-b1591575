# OPSQAI v2.0 — Complete Product Rebuild

**This is not a refactor. This is a complete product rebuild.**

## Rules above all rules

1. **Zero overlap. One concept. One page. One route.**
2. **Every page must answer: "Why does this page exist?"** — no clear answer → delete it.
3. **Every page has a single owner.** Marketing owns marketing. Management Center owns management. Customer Portal owns customer service. Self-Hosted owns operations. No page belongs to two products.
4. **If a page does not naturally fit inside one of the three products, it must be deleted. No exceptions.**
5. **Business Logic First.** Never redesign the backend to match the UI. Always redesign the UI to match the existing backend and business logic. Change backend behavior only when explicitly approved.

**Preserve ONLY:** Backend · Database · Business Logic · Licensing · Installer · Security · AI Engine · Server Functions · RLS.

## UI Consistency

Every product must use the same:

- design system · spacing · typography · colors
- buttons · dialogs · tables · forms · icons

Users must immediately recognize they are using the OPSQAI platform whether they are in Management Center, Customer Portal, or Self-Hosted.

## STOP — Inventory before implementation

**DO NOT IMPLEMENT UNTIL A FULL INVENTORY IS COMPLETE.**

Produce `.lovable/inventory.md` covering Pages · Routes · Components · Layouts · Server Functions · Hooks · Tables · Navigation. Tag each item exactly one of **KEEP · DELETE · MERGE · RENAME** with the target. Implementation begins only after you approve the inventory.

## The three products

```
┌─────────────────────────┬─────────────────────────┬────────────────────────┐
│ Management Center       │ Customer Portal         │ Self-Hosted (product)  │
│ /management/*           │ /portal/*               │ /app/*                 │
├─────────────────────────┼─────────────────────────┼────────────────────────┤
│ OPSQAI staff only       │ Customer contacts       │ End users on-prem      │
│ Control plane           │ Service surface         │ The product itself     │
└─────────────────────────┴─────────────────────────┴────────────────────────┘
```

### Management Center MUST NEVER contain

- AI Chat · Knowledge Base · FAQ · Academy · AI Audit
- Operations · Analytics · Warehouse features
- User workspaces · Company knowledge

Those belong exclusively to the Self-Hosted product.

## Route map

**Marketing (public)** — 9 pages
`/` · `/product` · `/self-hosted` · `/modules` · `/security` · `/pricing` · `/support` · `/documentation` · `/contact`

**Management Center — `/management/***`
`/management` (overview) · `/companies` (+ `/$id`) · `/customers` · `/installations` · `/licenses` · `/releases` · `/portal` · `/support` · `/ownership` · `/audit-logs` · `/system-health` *(v2)* · `/settings`

**Company Detail `/management/companies/$id**` — fixed sections:
General Information · Contacts · Installations · Licenses · Seats · Contracts · Download Installation Package · Customer Portal Access · Activity

**Customer Portal — `/portal/***`
`/portal` · `/downloads` · `/subscription` · `/support` · `/release-notes` · `/documentation`
*(Invoices deferred until annual maintenance billing goes live.)*

**Self-Hosted — `/app/***`
`/app` AI Chat · `/knowledge` · `/faq` · `/academy` · `/audit` · `/users` · `/organization` (with **AI Provider** as first-class — OpenAI · Ollama · Azure · etc.) · `/subscription` (read-only) · `/updates` · `/modules`

## Terminology & constraints

- **Modules** everywhere — never Extensions, never Marketplace.
- `**/app/modules` never activates modules.** It informs the customer and allows requesting additional licenses. Activation happens exclusively in Management Center.
- `**/app/subscription` is read-only.** Customers cannot modify licenses, increase seats, or activate modules. All managed by OPSQAI.
- `**/app/updates**` shows Installed Version · Available Version · Check Updates · Install Update · Rollback · Release Notes · Update History.

## `/product` — architecture + purchase journey

```text
        OPSQAI
          │
   ┌──────┼──────┐
   ▼      ▼      ▼
Management Customer Self-Hosted
 Center    Portal    (Windows)
```

Customer Portal is explained here as a service, not a top-level marketing page.

```text
Purchase → Receive Installation Package → Run Windows Installer
       → Activate License → Configure AI → Start Using OPSQAI
```

## `/` Home — "Who is OPSQAI for?"

Warehousing · Logistics · Manufacturing · Production · Distribution · Enterprise Operations.

## `/modules` marketing page — per module

Overview · Features · Screenshots · Benefits · Requirements · Pricing · Request Module.

## Pricing model

- **Basic Platform** — one-time purchase
- **Premium Modules** — purchased separately per module
- **Annual Maintenance** — updates, support, releases
- No SaaS, no monthly, no per-seat cloud.

## Design system reset

Kill Noir & Gold + Violet Noir. Enterprise tokens in `src/styles.css`:

- Surfaces `#ffffff` · `#f8fafc` · `#0f172a` · `#1e293b`
- Accent `#0f2547` dark navy — primary actions only, sparingly
- Borders `#e2e8f0` · Text `#0f172a` / `#475569`
- Inter for UI; system serif for marketing headings
- No purple, no gradients, no glow, no `--mc-gold*`, no `#7c5cff`, no `#22d3ee`
- Soft shadows, rounded-lg, generous spacing
- Inspired by Linear · Stripe · GitHub Enterprise · M365 Admin · Vercel

**Anti-template rules:**

- Never look like an admin template.
- Avoid generic dashboards, placeholder widgets, unnecessary KPI cards.
- Every page exists because it solves a business problem.

Shared primitives: `<MarketingShell>`, `<AppShell>`, `<PageHeader>`, `<DataTable>`, `<EmptyState>`, `<StatCard>`.

## i18n — English + German only

`useT()` with `en` and `de`. Remove Romanian from the product surface. Switcher EN · DE, persisted per user.

## No mock data — anywhere

Every list, card, table reads from real Supabase via existing server functions. Empty → `<EmptyState>` + action. Delete every hardcoded fixture.

## Sweep — aggressive, no hiding

Hard `rm`. Prefer rebuilding over adapting. **When in doubt, delete and rebuild. The architecture document is always correct.**

Delete: files with zero runtime references · duplicate components even if referenced · unused components, hooks, server fns, layouts, icons, CSS tokens, navigation items · dead code · commented code · obsolete utilities, schemas, translations, permissions, feature flags, docs, assets · every Docker / Kubernetes / Linux reference · every SaaS wording.

Verification:

```bash
rg -n '#7c5cff|mc-gold|Docker|Kubernetes|SaaS|MOCK_' src/
knip
bunx tsgo --noEmit
```

## Data wiring (unchanged backend)

`companies`, `licenses`, `license_installs`, `license_releases`, `license_signing_keys`, `installer_releases`, `installation_package_downloads`, `customer_profiles`, `customer_features`, `customer_compliance`, `customer_documents`, `support_conversations`, `support_messages`, `dr_bootstrap_tokens`, `audit_log`.

## Execution order

1. **Inventory** — `.lovable/inventory.md` (KEEP/DELETE/MERGE/RENAME). No code.
2. **Foundation** — new tokens, delete old palettes, new shells + primitives, EN/DE i18n baseline.
3. **Management Center `/management/***` — 11 routes, real data, delete `/app/platform/*` + `/app/admin/*`.
4. **Customer Portal `/portal/***` — 6 routes.
5. **Self-Hosted `/app/***` — new shell + palette, Company→Organization (with AI Provider), `/updates`, `/modules` (read-only requests).
6. **Marketing Website** — 9 new routes, delete old marketing.
7. **Sweep** — delete unused code + assets, `tsgo`, build.

Each step is one turn, ends with a diff summary and typecheck.

## Definition of Done

A phase is considered complete only when ALL of the following are true:

- Every page in the scope exists.
- Every route works.
- Every button performs its intended action.
- Every form persists real data.
- Every table loads real backend data.
- No mock data exists.
- No placeholder UI exists.
- No TODOs remain.
- No dead links exist.
- No duplicate pages exist.
- No duplicate navigation exists.
- Typecheck passes.
- Build passes.
- Tests pass.

---

**Reply "go" to start with Step 0 (Inventory).**
No files are touched until you approve the inventory in the next turn.  
## Data Preservation

During the rebuild:

- Never delete production data.

- Never delete database tables unless explicitly approved.

- Never remove migrations.

- Never remove RLS policies.

- Never remove licenses.

- Never remove customer records.

- Never remove installation records.

The rebuild is UI-first.

The existing backend data model must remain compatible unless explicitly approved.  
## Backend Protection

If a UI requirement cannot be implemented with the current backend:

STOP.

Do not redesign the backend automatically.

Present the limitation.

Explain why.

Wait for approval before changing any server function, database schema, API contract or business logic.