# OPSQAI v2.3 — Final plan (with hardening amendments + full documentation & site refresh)

All prior decisions preserved. This revision folds in the last two rounds of amendments and expands **Phase 7** into a full documentation + marketing-site refresh track ("de la A la Z"), executed after Phase 6.5.

---

## Carried-forward invariants (unchanged)

- **Two license kinds.** Installation License (mandatory, one per `install_id`, carries `seats` + `maintenance_expires_at`) + optional per-Module Licenses. No `modules: []` array. Basic modules always granted.
- **Token payload versioned from day 1.** `license_version: 1` + `kind` + `key_id` on every token. Verifier rejects unknown versions.
- **MC holds no customer infrastructure secrets.** No PG passwords, SMTP, AI keys, MinIO, SSH, OS creds. Enforced by schema review gate + recorded in security memory.
- **Extend-first schema rule.** No new MC table without a demonstrated architectural need.
- **`installer_version`** on the Installation Package, independent from app version.
- **Resumable Setup Wizard.** `platform_config.setup_progress` (step ids only, never secrets).
- **`opsqai doctor`** CLI + Admin → System → Doctor panel, ships in Phase 5, reused in DR.
- **DR anchor** = `install_id`. DB backup includes signed `licenses.token` bodies. Recovery paths: local break-glass secret (offline) or MC-issued Bootstrap Recovery Token (online).
- **Customer Portal ≠ Management Center.** Portal is downloads + contract + tickets + release notes only.
- **Marketplace / Partner** reserved as forward-compat hooks only.

---

## Phase list

- **Phase 0** — License foundation fix (blocking): versioned tokens, Installation + Module kinds, tests. ✅ done
- **Phase 1** — Centralized enforcement, frozen module catalog, `licenses` schema split. ✅ done

- **Phase 2** — AI provider adapter registry. ✅ done
- **Phase 3** — Management Center UI + per-module issue flow (secrets-blacklist gate active).
- **Phase 4** — Offline activation + revocation + Add License import.
- **Phase 4.5** — Installation & Ownership Transfer (`installer_version`, no-secrets-in-MC).
- **Phase 5** — Self-Hosted packaging + resumable Setup Wizard + `opsqai doctor`.
- **Phase 5.5** — Disaster Recovery.
- **Phase 6** — Access lockdown + operational-module removal from MC.
- **Phase 6.5** — Customer Portal.
- **Phase 7** — **Documentation suite + site refresh + release engineering** (expanded, see below).

All phases remain additive until Phase 6.

---

## Phase 7 — Documentation & Site refresh (expanded)

Delivered as the final phase, once the product surface is frozen by Phases 0–6.5. Every document is versioned (`v1.0` at cut), lives in-repo under `docs/`, is rendered inside the app at `/docs/*` (Basic module, always available), and — for customer-facing docs — is also exposed via the Customer Portal (Phase 6.5) for download as PDF.

### 7.A — Documentation suite (6 documents)

Structure, audience, tooling and source-of-truth are fixed up front so the docs stay consistent and never drift from code.

**Shared conventions**
- Source format: Markdown in `docs/<doc-slug>/*.md` with a `book.yaml` manifest (title, audience, chapter order, version).
- Rendering: in-app viewer at `/_authenticated/app/docs/<slug>` (extends the existing `system_doc_catalog` infrastructure, no new table); PDF export via existing `src/lib/generators/pdf.server.ts`.
- Every doc opens with: audience, scope, non-goals, version, last-updated, "how to report an error in this doc".
- Diagrams: Mermaid in Markdown, rendered client-side; PDF export bakes them as SVG.
- Every claim traceable: code refs (`src/…`), migration refs, or "product decision — see Architecture Book Ch. X".
- No new marketing claims. Compliance wording gated to what's already in `src/lib/opsqai-facts.ts` + `security-memory.md`.

**Doc 1 — Product Documentation** _(audience: customer CTO / decision maker)_
Chapters: What is OPSQAI · Why it exists · Problems it solves · High-level architecture · Modules (Basic + paid catalog) · Licensing model (Installation + Module, seats, maintenance) · How the AI works (adapter registry, providers, no training on customer data) · How updates work (channel, installer_version, application version) · Backup · Disaster Recovery · Ownership model (OPSQAI vs customer responsibilities post-handover) · Security overview (link to Doc 4) · FAQ.

**Doc 2 — Administrator Guide** _(audience: customer IT admin)_
Chapters: Prerequisites · Installation (bare-metal + Docker) · Setup Wizard walkthrough (resumable) · PostgreSQL configuration · MinIO / object storage · SMTP · SSO (SAML/OIDC, Enterprise) · AI Provider configuration · Backups (schedule, verification, off-site) · Restore · Updates (channel, rollback) · License management (Installation + Add License) · Modules (enable/disable, effect of expiry) · Health Check (`opsqai doctor`) · Troubleshooting (top 20 issues cross-referenced with error codes).

**Doc 3 — Technical Documentation** _(audience: OPSQAI engineers + advanced customer engineers)_
Chapters: Project structure · Authentication flow (Supabase Auth + `user_roles` + `has_role`) · License flow (issue → verify → revoke → import → DR) · AI provider adapter contract · RAG pipeline · Embeddings · pgvector configuration · Storage adapters · Public API (`/api/public/v1/*`) · Background jobs (pg_cron, email queue, purge) · Database schema reference (generated from migrations) · Security controls · Docker architecture (compose topology, volumes, network).

**Doc 4 — Security Documentation** _(audience: customer CISO / security architect)_
Chapters: Security overview · Encryption (in transit, at rest) · Authentication · Authorization (RBAC + `has_role`) · License security (Ed25519, key rotation, `key_id`) · Update security (signed manifests) · Backup security (encryption, off-site, restore-to-scratch) · Data isolation (multi-tenant RLS, definer functions inventory) · GDPR (subprocessors, transfers, DPA) · Logging · Audit log (schema, retention, anonymized archive) · Incident response · Disaster recovery · Business continuity. Aligned with security memory; no absolute claims.

**Doc 5 — OPSQAI Architecture Book** _(audience: technical decision maker + engineers; explains **why**, not just how)_
13 chapters: Vision · Architecture · Data Flow · License System · Security · AI · Knowledge Base · Administration · Deployment · Updates · Maintenance · Recovery · Future Roadmap. Each chapter closes with an **Architecture Decisions** section documenting the choices made (e.g. "Why per-module signed tokens instead of a single `modules[]` array", "Why `install_id` as DR anchor", "Why MC never holds customer secrets") in ADR-style: context → decision → consequences.

**Doc 6 — OPSQAI Engineering Handbook** _(audience: internal — OPSQAI engineering)_
Not shipped to customers. Lives in-repo under `docs/engineering/`. Chapters: Code conventions · Branching + release process · Adding a new module (catalog entry, license key, enforcement, UI gate, doc entry) · Issuing a license (from MC, offline, CLI) · Adding an AI provider adapter · Publishing a Docker image (versioning, signing, release manifest) · Database migrations (rules, GRANTs, RLS, review checklist) · **Pre-release checklist** (build green, `opsqai doctor` clean on reference install, migration dry-run, DR-Verify pass, docs updated, changelog cut).

### 7.B — Marketing & product-site refresh

Everything user-visible on `opsqai.de` re-aligned with the final product model. Concrete edits (route → change):

| Route | Change |
|---|---|
| `/` (index) | Hero copy aligned with "Self-Hosted first, evaluation environment is temporary". New module section reflecting Basic + paid modules. |
| `/product` | Rewrite around Basic vs paid modules; per-module value props; Installation + Module licensing model. |
| `/pricing` | Two-axis model: Installation License (seats + maintenance) + Modules (per-module). Remove tier bundling. Add "per-module add-on" cards. |
| `/features` | Refactor into Basic modules vs paid modules; each module links to a solution page. |
| `/solutions/*` | Update to reference module structure, not bundled tiers. |
| `/trust` + `/trust/*` | Add: `/trust/self-hosted` (data stays in customer install), `/trust/licensing` (per-module, Ed25519, offline), `/trust/disaster-recovery` (customer-owned backups, dual recovery paths). Update `/trust/multi-tenant-isolation` note: Self-Hosted is single-tenant per install. |
| `/legal/dpa` | Update subprocessors section to reflect Self-Hosted model (customer's own infrastructure not a subprocessor of OPSQAI). Reviewed by counsel gate. |
| `/legal/responsible-ai` | Reflect AI Provider adapter registry: customer picks provider, no training on customer data (unchanged claim). |
| `/docs` | Public landing page for the 5 customer-facing docs (Docs 1–5). PDF download links wired to Customer Portal login for authenticated versions. |
| `/blog` | New post: "Introducing per-module licensing" + "Disaster Recovery in a Self-Hosted world". |
| Global SEO | Title/description/og for every changed route. `/docs` gets its own leaf og:image. |
| `sitemap.xml` | Regenerated. |
| `llms.txt` | Refreshed with the new module catalog + doc index. |
| `ROADMAP.md` | Public roadmap updated to reflect completed Sprint 0–6.5; future sprints reordered around the new architecture. |

### 7.C — Release engineering

- **Changelog + release notes**: `CHANGELOG.md` + `RELEASE_NOTES.md` cut for `v1.0.0` (the version that ships with all phases merged).
- **Versioning**: `installer_version` starts at `1.0.0`; application version `1.0.0`; docs `v1.0`.
- **Signed release manifest** consumed by `opsqai doctor` version check.
- **Reference installation** run end-to-end on a clean host as final acceptance: install → wizard → doctor green → issue Installation License + 2 Module Licenses → import → run all 7 DR scenarios → verify docs render in-app and export as PDF.
- **Publish**: only after all of the above are green.

---

## Deliverables at end of Phase 7

- 5 customer-facing docs (`docs/product-documentation/`, `docs/administrator-guide/`, `docs/technical-documentation/`, `docs/security-documentation/`, `docs/architecture-book/`) — Markdown + Mermaid, rendered in-app, exportable as PDF.
- 1 internal Engineering Handbook (`docs/engineering/`).
- Updated marketing site with every route above aligned to the final model.
- `v1.0.0` release with signed manifest, Docker images, installer artifacts, and reference-install verification.

---

**Confirm and I start Phase 0.**