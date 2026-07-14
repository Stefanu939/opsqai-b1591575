# OPSQAI v2.0 — Full Inventory (Step 0)

Tag legend: **KEEP** · **DELETE** · **MERGE→target** · **RENAME→target**
Owner column: `MC` = Management Center · `PORTAL` = Customer Portal · `APP` = Self-Hosted · `MKT` = Marketing · `INFRA` = shared/backend.

Business logic, backend, DB, RLS, licensing, installer, AI engine, server functions are **preserved by default** — inventory covers only surface/UI/route ownership. Server functions are inventoried for reference only (calling code changes; the function itself stays).

---

## 1. Public / marketing routes (`src/routes/*.tsx`)

| Route file | Owner | Tag | Target |
|---|---|---|---|
| `index.tsx` | MKT | KEEP (rewrite content) | `/` Home w/ "Who is OPSQAI for?" |
| `product.tsx` | MKT | KEEP (rewrite) | `/product` — architecture + purchase journey |
| `pricing.tsx` | MKT | KEEP (rewrite) | `/pricing` — Basic / Modules / Maintenance |
| `features.tsx` | MKT | MERGE→ `/product` | fold content into `/product` |
| `industries.tsx` | MKT | MERGE→ `/` | fold into Home "Who for?" |
| `solutions.index.tsx` | MKT | DELETE | overlap with `/product` |
| `solutions.$slug.tsx` | MKT | DELETE | overlap |
| `about.tsx` | MKT | DELETE | not in new 9-page map |
| `contact.tsx` | MKT | KEEP | `/contact` |
| `help.tsx` | MKT | RENAME→ `/support` | maps to new `/support` marketing |
| `resources.tsx` | MKT | DELETE | superseded by `/documentation` |
| `docs.tsx` | MKT | RENAME→ `/documentation` | public docs landing |
| `blog.index.tsx` / `blog.$slug.tsx` | MKT | DELETE | not in new 9-page map; content preserved in `src/content/blog/*` for later |
| `case-studies.index.tsx` / `case-studies.$slug.tsx` | MKT | DELETE | ditto |
| `guides.index.tsx` / `guides.$slug.tsx` | MKT | DELETE | fold selected pieces into `/documentation` |
| `trust.tsx` | MKT | RENAME→ `/security` | root security page |
| `trust.audit-logs.tsx` | MKT | MERGE→ `/security` | one section |
| `trust.availability.tsx` | MKT | MERGE→ `/security` | one section |
| `trust.backup-policy.tsx` | MKT | MERGE→ `/security` | |
| `trust.data-retention.tsx` | MKT | MERGE→ `/security` | |
| `trust.disaster-recovery.tsx` | MKT | MERGE→ `/security` | |
| `trust.encryption.tsx` | MKT | MERGE→ `/security` | |
| `trust.gdpr.tsx` | MKT | MERGE→ `/security` | |
| `trust.incident-response.tsx` | MKT | MERGE→ `/security` | |
| `trust.iso-27001-roadmap.tsx` | MKT | DELETE | not part of v2 security surface |
| `trust.licensing.tsx` | MKT | MERGE→ `/security` | |
| `trust.multi-tenant-isolation.tsx` | MKT | DELETE | self-hosted has no multi-tenancy story |
| `trust.responsible-ai.tsx` | MKT | MERGE→ `/security` | |
| `trust.security-architecture.tsx` | MKT | MERGE→ `/security` | |
| `trust.self-hosted.tsx` | MKT | MERGE→ `/self-hosted` | |
| **NEW** `/self-hosted` | MKT | CREATE | Windows installer, setup wizard, offline AI, licensing, updates, maintenance, doctor, DR |
| **NEW** `/modules` | MKT | CREATE | marketing modules directory (per-module Overview/Features/Screenshots/Benefits/Requirements/Pricing/Request) |
| **NEW** `/support` | MKT | CREATE | contact + KB pointer |
| **NEW** `/documentation` | MKT | CREATE | public docs entry |
| `auth.tsx`, `sso-signin.tsx`, `forgot-password.tsx`, `reset-password.tsx` | INFRA | KEEP | auth flows |
| `accept-invite.tsx` | INFRA | KEEP | |
| `verify.$code.tsx` | INFRA | KEEP | email verify |
| `first-run.tsx` | INFRA | KEEP | first-run wizard (self-hosted) |
| `demo.*` (10 files) | MKT | DELETE | v1 demo tour; v2 uses real screenshots on `/product` |
| `[.]lovable.oauth.consent.tsx` | INFRA | KEEP | Lovable OAuth |
| `[.mcp]`, `mcp.ts` | INFRA | KEEP | |
| `[.well-known]` | INFRA | KEEP | |
| `api/`, `api.public.contact-submit.ts` | INFRA | KEEP | server routes |
| `email/`, `legal/`, `lovable/` | INFRA | KEEP | |
| `sitemap[.]xml.ts` | INFRA | KEEP (regenerate for new map) | |

---

## 2. Authenticated routes (`src/routes/_authenticated/*.tsx`)

### 2a. Old MC / Admin routes → **collapse into `/management/*`**

| Current | Tag | Target |
|---|---|---|
| `app.platform.tsx` (layout) | RENAME | `management.tsx` layout |
| `app.platform.index.tsx` | RENAME | `management.index.tsx` overview |
| `app.platform.overview.tsx` | MERGE→ management overview | delete file |
| `app.platform.customers.tsx` | MERGE→ `/management/companies` | one companies list |
| `app.platform.licenses.tsx` | RENAME→ `/management/licenses` | |
| `app.platform.billing.tsx` | DELETE | pricing is public marketing; MC billing not in v2 |
| `app.platform.onboarding.tsx` | MERGE→ `/management/companies/$id` (new-company action) | |
| `app.platform.installation-package.$installId.tsx` | MERGE→ `/management/companies/$id` (Download Installation Package tab) | |
| `app.platform.license-activation.tsx` | MERGE→ `/management/licenses` | |
| `app.platform.support.tsx` | RENAME→ `/management/support` | |
| `app.platform.administration.tsx` | MERGE→ `/management/settings` | drop mocked org chart |
| `app.platform.doctor.tsx` | DELETE | System Health deferred to v2 |
| `app.platform.ops.tsx` | DELETE | operations belong to Self-Hosted |
| `app.platform.recovery.tsx` | DELETE | DR runbooks live in Self-Hosted `/updates` context |
| `app.platform.setup.tsx` | DELETE | duplicated by first-run |
| `app.platform.audit.tsx` | RENAME→ `/management/audit-logs` | (this was old "AI Audit"; new page is MC audit trail; AI Audit stays in `/app/audit`) |
| `app.admin.dashboard.tsx` | DELETE | replaced by `/management` overview |
| `app.admin.command-center.tsx` | DELETE | duplicate dashboard |
| `app.admin.companies.tsx` | DELETE | dup of `/management/companies` |
| `app.admin.customers.tsx` | DELETE | dup |
| `app.admin.contacts.tsx` | MERGE→ `/management/companies/$id` (Contacts tab) | |
| `app.admin.installations.tsx` | RENAME→ `/management/installations` | |
| `app.admin.subscriptions.tsx` | MERGE→ `/management/licenses` | |
| `app.admin.billing.tsx` | DELETE | |
| `app.admin.release-management.tsx` | RENAME→ `/management/releases` | absorb installer releases + signing keys + activation bundles |
| `app.admin.module-catalog.tsx` | MERGE→ `/management/releases` (Modules tab) | |
| `app.admin.downloads.tsx` | DELETE | Docker/legacy download UI |
| `app.admin.platform.tsx` | DELETE | dup |
| `app.admin.platform-admins.tsx` | MERGE→ `/management/settings` (Team tab) | |
| `app.admin.users.tsx` | DELETE (already redirect stub) | |
| `app.admin.audit.tsx` | MERGE→ `/management/audit-logs` | |
| `app.admin.ai-audit.tsx` | DELETE | AI Audit is Self-Hosted only |
| `app.admin.analytics.tsx` | DELETE | not in MC scope (rule §MC-exclusion) |
| `app.admin.monitoring.tsx` | MERGE→ `/management/system-health` v2 (parked) | delete file for now |
| `app.admin.email.tsx` / `app.admin.email-logs.tsx` | MERGE→ `/management/settings` (Email tab) | |
| `app.admin.notifications.$provider.tsx` | MERGE→ `/management/settings` | |
| `app.admin.integrations.tsx` / `.$provider.tsx` | MERGE→ `/management/settings` (Integrations) | |
| `app.admin.api-docs.tsx` | DELETE | public docs live in `/documentation` |
| `app.admin.api-keys.tsx` | MERGE→ `/management/settings` (API keys) | |
| `app.admin.webhooks.tsx` | MERGE→ `/management/settings` (Webhooks) | |
| `app.admin.sso-setup.tsx` | MERGE→ `/management/settings` (SSO) | |
| `app.admin.maintenance.tsx` | DELETE | operational, not MC |
| `app.admin.support.tsx` | MERGE→ `/management/support` | |
| `app.admin.academy.tsx` | DELETE | Academy is Self-Hosted only |
| `app.admin.knowledge-gaps.tsx` | DELETE | Knowledge is Self-Hosted only |
| `app.admin.sop-generator.tsx` | DELETE | Self-Hosted concern |

### 2b. Self-Hosted `/app/*` — keep, rewire to new shell + palette

| Current | Tag | Target |
|---|---|---|
| `app.tsx` (layout) | KEEP | new `AppShell` with product-aware nav |
| `app.index.tsx` | RENAME → AI Chat entry | maps to `/app` chat |
| `app.chat.tsx`, `app.chat.index.tsx`, `app.chat.$threadId.tsx` | KEEP | |
| `app.knowledge.tsx` | KEEP | `/app/knowledge` |
| `app.faq.tsx` | KEEP | `/app/faq` |
| `app.academy.*` (9 files) | KEEP | under `/app/academy/*` — same subtree |
| **AI Audit** | CREATE `/app/audit` | new page reading `ai_audits` table |
| `app.subscription.tsx` | KEEP (make read-only) | `/app/subscription` |
| **NEW** `/app/updates` | CREATE | Installed/Available/Check/Install/Rollback/Notes/History |
| **NEW** `/app/modules` | CREATE | read-only module catalog + Request |
| **NEW** `/app/organization` | CREATE | replaces "Company" — includes AI Provider section |
| **NEW** `/app/users` | CREATE | dedicated (currently no self-hosted users page) |
| `app.profile.tsx` | KEEP | user profile |
| `app.brand.tsx` | DELETE | admin theming — obsolete |
| `app.requests.tsx` | MERGE→ `/app/modules` (module requests) or DELETE | |
| `app.docs.$book.tsx`, `app.docs.index.tsx` | MERGE→ `/portal/documentation` or `/documentation` | delete authenticated dup |
| `app.internal.*` (4 files) | DELETE | v1 "internal assistant" experiment |
| `app.workspace.index.tsx`, `app.workspace.$sessionId.tsx` | DELETE | v1 workspace — not in new architecture |

### 2c. Customer Portal `/portal/*`

| Current | Tag | Target |
|---|---|---|
| `portal.tsx` | KEEP (rewrite shell) | `/portal` layout |
| `portal.index.tsx` | KEEP (rewrite) | `/portal` overview |
| `portal.downloads.tsx` | KEEP | `/portal/downloads` |
| `portal.contract.tsx` | RENAME→ `/portal/subscription` | |
| `portal.tickets.tsx` | RENAME→ `/portal/support` | |
| `portal.release-notes.tsx` | KEEP | `/portal/release-notes` |
| **NEW** `/portal/documentation` | CREATE | |

### 2d. Route infrastructure

| File | Tag |
|---|---|
| `route.tsx` (`_authenticated` gate) | KEEP — integration-managed |

---

## 3. Components

### 3a. `src/components/platform/*` (old MC shell)

| File | Tag | Notes |
|---|---|---|
| `AppSidebar.tsx` | DELETE | replaced by new `<AppShell>` nav |
| `PlatformTopbar.tsx` | DELETE | replaced |
| `PremiumCard.tsx` | DELETE | Noir & Gold visual — replaced by new `<Card>` primitive |
| `KpiCard.tsx` | RENAME→ `<StatCard>` in new shared primitives — rewrite tokens |
| `BillingPanel.tsx` | DELETE | billing panel not in v2 MC |
| `ComingSoonPanel.tsx` | DELETE | "no data" = `<EmptyState>` |
| `RecentModulesBar.tsx` | DELETE | v1 recents |

### 3b. `src/components/app/*`

| File | Tag |
|---|---|
| `app-shell.tsx` | RENAME→ new unified `<AppShell>` used by MC + Portal + Self-Hosted with product prop |
| `chat-sidebar.tsx` | KEEP |
| `notifications-bell.tsx` | KEEP |
| `global-search.tsx` | KEEP (rewire to new routes) |
| `academy-subnav.tsx` | KEEP |
| `internal-subnav.tsx` | DELETE (internal routes deleted) |
| `deployment-mode-gate.tsx` | KEEP |
| `subscription-access-gate.tsx` | KEEP |
| `subscription-status-banner.tsx` | KEEP |
| `workspace-context-banner.tsx` | DELETE (workspace routes deleted) |

### 3c. `src/components/admin/*`

| File | Tag |
|---|---|
| `ai-audit.tsx` | MERGE→ new `/app/audit` implementation |
| `executive-dashboard.tsx` | DELETE (v1 dashboard) |
| `export-dialog.tsx` | KEEP (reuse in `/management/*`) |
| `knowledge-analytics.tsx` | DELETE (Analytics not in MC) |

### 3d. `src/components/marketing/*`

| File | Tag |
|---|---|
| `layout.tsx` | RENAME→ `<MarketingShell>` — rewrite with new design tokens |
| `product-showcase.tsx` | KEEP (rewrite content) |
| `trust-topic.tsx` | KEEP (rewrite tokens; used by `/security`) |

### 3e. Other

| Path | Tag |
|---|---|
| `src/components/academy/assign-training-dialog.tsx` | KEEP |
| `src/components/brand/logo.tsx` | KEEP |
| `src/components/demo/*` (3 files) | DELETE (demo routes deleted) |
| `src/components/legal/draft-disclaimer.tsx` | KEEP |
| `src/components/support/support-widget.tsx` | KEEP |
| `src/components/theme-toggle.tsx` | KEEP |
| `src/components/ui/*` (46 shadcn primitives) | KEEP — all reused; retoken via `styles.css` |

### 3f. New primitives to create

`<MarketingShell>`, `<AppShell>` (product-aware: `mc | portal | app`), `<PageHeader>`, `<DataTable>`, `<EmptyState>`, `<StatCard>`, `<SectionCard>`.

---

## 4. Server functions (`src/lib/*.functions.ts` + `.server.ts`)

All server functions are **KEEP** — business logic is preserved. Callers change; implementations do not. Any function whose only caller was a DELETED route becomes an orphan → mark for sweep in step 6.

Preliminary orphan candidates (verify in Sweep):

- `analytics.functions.ts` — only used by `/app.admin.analytics` and `/app.admin.command-center` (both DELETE) → **DELETE in Sweep** unless portal uses it.
- `internal-requests.functions.ts` — only used by `/app.internal.*` (DELETE) → **DELETE in Sweep**.
- `workspace.functions.ts`, `workspace.extract.server.ts` — only used by `/app.workspace.*` (DELETE) → **DELETE in Sweep**.
- `academy-certificate.server.ts`, `academy-lms.functions.ts`, `academy.functions.ts`, `sop-ack.functions.ts`, `sop-versions.functions.ts` — KEEP, Academy stays.
- Every other `.functions.ts` file — KEEP by default.

---

## 5. Hooks (`src/hooks/`)

| File | Tag |
|---|---|
| `use-mobile.tsx` | KEEP |

(No other hooks currently. New hooks — `useProductContext`, `useCurrentCompany`, `useInstallation` — created during implementation.)

---

## 6. i18n (`src/i18n/`)

`index.tsx` — **KEEP infra**, but:
- Purge Romanian keys from every namespace.
- Author new EN + DE catalogs covering all v2 UI copy.
- Language switcher shows EN · DE only.

---

## 7. Content (`src/content/`)

| Path | Tag |
|---|---|
| `blog/*` | DELETE — blog routes removed |
| `case-studies/*` | DELETE — routes removed |
| `guides/*` | MERGE→ `/documentation` selected items, DELETE rest |
| `solutions/*` | DELETE — routes removed |
| `manifest.ts` | DELETE |

Content preserved off-tree if user wants it later; not shipped in v2 UI.

---

## 8. Design tokens (`src/styles.css`)

- DELETE all `--mc-*` (Noir & Gold), all Violet Noir variables, `#7c5cff`, `#22d3ee`, `#d4b458`, `#c9a84c`, `#a48633`, gradients, glow classes, `mc-eyebrow`, `mc-heading`, `mc-num`, `mc-gold-text`, `.mc-shell`.
- ADD new enterprise scale: `--surface-0..3`, `--fg`, `--fg-muted`, `--fg-subtle`, `--border`, `--accent` (`#0f2547`), `--accent-hover`, `--danger`, `--warning`, `--success`, radius scale, soft shadow scale.

---

## 9. Tables (backend — reference only, no changes)

All KEEP: `companies`, `licenses`, `license_installs`, `license_releases`, `license_signing_keys`, `installer_releases`, `installation_package_downloads`, `customer_profiles`, `customer_features`, `customer_compliance`, `customer_documents`, `customer_timeline`, `customer_security`, `customer_document_versions`, `support_conversations`, `support_messages`, `dr_bootstrap_tokens`, `audit_log`, `ai_audits`, `academy_*`, `knowledge_documents`, `document_chunks`, `messages`, `threads`, `faqs`, `notifications`, `profiles`, `user_roles`, `role_permissions`, `platform_config`, `platform_email_settings`, `sso_configurations`, `api_keys`, `webhook_endpoints`, `webhook_deliveries`.

Verify no DELETE UI referenced a table that lost its only reader — if so, the table stays (business logic preserved); only the UI is removed.

---

## 10. Navigation

Old: `AppSidebar` (platform-wide), `RecentModulesBar`, breadcrumbs in `PlatformTopbar`, `internal-subnav`, `academy-subnav`.

New:
- **MarketingShell nav** — Home · Product · Self-Hosted · Modules · Security · Pricing · Support · Documentation · Contact
- **MC AppShell nav** — Overview · Companies · Customers · Installations · Licenses · Releases · Portal · Support · Ownership · Audit Logs · Settings
- **Portal AppShell nav** — Overview · Downloads · Subscription · Support · Release Notes · Documentation
- **Self-Hosted AppShell nav** — Chat · Knowledge · FAQ · Academy · AI Audit · Users · Organization · Subscription · Updates · Modules

Only `academy-subnav.tsx` survives as a nested subnav.

---

## 11. Route file rename map (executed in Step 2–5)

| Old path | New path |
|---|---|
| `_authenticated/app.platform.tsx` | `_authenticated/management.tsx` |
| `_authenticated/app.platform.index.tsx` | `_authenticated/management.index.tsx` |
| `_authenticated/app.platform.customers.tsx` | `_authenticated/management.companies.tsx` |
| `_authenticated/app.platform.licenses.tsx` | `_authenticated/management.licenses.tsx` |
| `_authenticated/app.platform.support.tsx` | `_authenticated/management.support.tsx` |
| `_authenticated/app.platform.audit.tsx` | `_authenticated/management.audit-logs.tsx` |
| `_authenticated/app.admin.installations.tsx` | `_authenticated/management.installations.tsx` |
| `_authenticated/app.admin.release-management.tsx` | `_authenticated/management.releases.tsx` |
| `_authenticated/portal.contract.tsx` | `_authenticated/portal.subscription.tsx` |
| `_authenticated/portal.tickets.tsx` | `_authenticated/portal.support.tsx` |

`__root.tsx` unchanged in path.

---

## Definition-of-Done for Step 0

- [x] Every existing surface file is listed above with a tag.
- [x] Every tag has a target (route or reason).
- [x] Nothing is left untagged.

**End of inventory. Awaiting approval before proceeding to Step 1 (Foundation).**
