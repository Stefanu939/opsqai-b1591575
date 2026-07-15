# OPSQAI — 4 Reality-Based PDF Deliverables

Four separate PDFs, English, professional layout, generated from a single Python toolchain reusing the v3 investor-deck brand system (Noir & Gold on MC-oriented pages, clean light theme for customer-facing docs, Urbanist/Epilogue via DejaVu fallback for PDF text).

All content is derived **only** from real project artifacts:

- `docs/product-documentation/*`
- `docs/architecture-book/*`
- `docs/technical-documentation/*`
- `docs/administrator-guide/*`
- `docs/security-documentation/*`
- `docs/engineering/*`
- `opsqai-windows/*` (installer, services, WinSW configs, unattended install)
- `installer/*` (Go bootstrap)
- `src/routes/*`, `src/lib/*` (MC + Portal + Self-Hosted routes)
- `public/llms.txt`, `ROADMAP.md`, `SECURITY.md`, `RELEASE_NOTES.md`

No invented numbers, no fake customers, no imagined features. If a feature isn't in the code or docs, it's not in the PDFs.

---

## Output files (all in `/mnt/documents/`)

1. `OPSQAI-Sales-Playbook.pdf`
2. `OPSQAI-Product-Overview.pdf`
3. `OPSQAI-Self-Hosted-Administrator-Guide.pdf`
4. `OPSQAI-Internal-Platform-Guide.pdf`

---

## 1. OPSQAI Sales Playbook (internal — sales team)

Audience: OPSQAI sales / founder-led sales.
Tone: practical, script-like, defensible.

Sections:

- Positioning in one sentence (from `llms.txt` + product docs).
- Who we sell to (industrial SMB/mid-market on Windows, DACH first — from company/self-hosted routes).
- Discovery questions (data sovereignty, current AI use, Windows footprint, compliance drivers).
- The 3-surface pitch (MC / Portal / Self-Hosted) with a diagram.
- Demo script: Portal download → Windows installer wizard → Setup Wizard → AI Chat on Knowledge Base → AI Audit → License Activation. Each step references the real route/screen.
- Objection handling (only real answers):
  - "Why not SaaS?" → sovereignty, EU AI Act, chunk-level ACL, retrieval never leaves install (AD-004).
  - "Why Windows?" → real customer infra (WinSW services, embedded PostgreSQL, Caddy).
  - "Vendor lock-in?" → customer owns data, embeddings, AI provider; OpenAI/Azure/Ollama supported.
  - "What if OPSQAI disappears?" → AD-009, DR anchor is `install_id` + customer backups.
  - "Updates offline?" → activation bundle + signed manifests.
- Pricing conversation frame: Basic Platform + Premium Modules + Annual Maintenance (recurring, 15–20% depending on contract). No fixed € numbers invented.
- Closing checklist: technical contact, install target, AI provider choice, license seats, maintenance term.
- Handover to delivery (what sales must capture before licensing).

Mockups: pitch flow diagram, demo storyboard (6 screens from real UI surfaces).

---

## 2. OPSQAI Product Overview (commercial, pre-demo leave-behind)

Audience: prospect decision-makers.
Tone: commercial, not technical, not investor.

Sections:

- Problem (operational knowledge locked in docs/tribal knowledge — grounded, no market stats invented).
- Solution: Enterprise Operational AI, Windows self-hosted.
- How it works (Ingest → Embed → Retrieve → Generate, from `technical-documentation/05-rag-pipeline.md`).
- Who it's for (logistics, manufacturing, warehouse, production — as already positioned).
- Benefits (sovereignty, auditability, no per-seat SaaS lock-in).
- Modules: Basic Platform (AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization, Subscription) + Premium Modules (as listed in `product-documentation/04-modules.md`).
- Architecture (3 surfaces diagram from `architecture-book/02-architecture.md`).
- Why Windows self-hosted / why not SaaS (AD-003, AD-004, AD-005).
- Why OPSQAI (differentiators only from code: signed licenses Ed25519, CRL, hash-chained audit, chunk-level ACL, offline activation bundle, installer with Doctor/Recovery).
- Usage examples (logistics dispatcher Q&A, warehouse SOP retrieval, manufacturing procedure lookup — described as scenarios, not case studies).
- Security summary (from `security-documentation/*`).
- AI providers supported (OpenAI, Azure OpenAI, self-hosted OpenAI-compatible incl. Ollama/vLLM/LM Studio, Lovable AI Gateway).
- Licensing model (two-axis, from `product-documentation/05-licensing.md`).
- Customer journey (Portal download → Windows install → activation → configure AI → production use).
- FAQ (from `product-documentation/11-faq.md`, trimmed).

Mockups: architecture diagram, module map, customer journey strip, 3–4 real UI screenshots-style mockups (Chat, Knowledge Base, AI Audit, License Activation).

---

## 3. OPSQAI Self-Hosted Administrator Guide (customer IT admin)

Audience: customer IT administrator. MC never mentioned as accessible.

Sections (each maps 1:1 to an existing doc):

- What OPSQAI is (customer-side only).
- Prerequisites (`administrator-guide/01`).
- Installation via `OPSQAI-Setup.exe` — interactive + unattended (`opsqai-windows/docs/unattended-install.md`).
- Windows services (WinSW): Database, Platform, Worker, Updater, Caddy — real names from `winsw-configs/`.
- Setup Wizard steps (`administrator-guide/03`).
- PostgreSQL: embedded (default, `pg_ctl`-managed) or external (`administrator-guide/04`).
- Object storage: local or S3 (`administrator-guide/05`).
- SMTP (`06`), SSO (`07`), AI providers (`08` — OpenAI, Azure, self-hosted incl. Ollama, Lovable Gateway).
- License management: install, module, offline bundle, revocation (`09`).
- Backups (`10`), Restore (`11`), Updates (`12`).
- Modules enable/disable + expiry/revocation behavior (`13`).
- Health & Doctor CLI (`14`).
- Troubleshooting (`15`) + recent PostgreSQL `pg_ctl` fix note.
- Security posture (customer-facing subset).
- Best practices: backup cadence, license storage, provider key rotation.
- Sales Playbook
- Eu aș mai adăuga două capitole.
- Competitor Battle Cards
- Pentru:
- Microsoft Copilot
- ChatGPT Enterprise
- Glean
- Guru
- Nu ca marketing.
- Ci:
- when we win
- when we lose
- when NOT to sell OPSQAI
- Foarte puține startup-uri fac asta.
- Qualification Checklist
- Înainte de demo.
- Exemplu:
- Windows Server?
- Local IT?
- Compliance?
- AI already used?
- Documents available?
- English/German?
- Number of users?
- Offline requirement?

Mockups: installer wizard step, service manager view, `opsqai doctor` output, Setup Wizard screens, License Activation page.

---

## 4. OPSQAI Internal Platform Guide (OPSQAI team)

Audience: OPSQAI staff (founder + future hires).
Tone: authoritative, complete, cross-surface.

Sections:

- Product philosophy (from architecture-book/01-vision).
- Full architecture: MC + Portal + Self-Hosted (from architecture-book/02–03; AD-001 through AD-021 summarized).
- Management Center: companies, installations, licenses, releases, signing keys, activation bundles, ownership transfer, support, audit — with the actual `/app/platform/*` route names.
- Customer Portal: what a customer contact sees vs. MC platform admin.
- Self-Hosted internals: WinSW services, bootstrap (`installer/`), migrations, service manager (`opsqai-windows/tools/service-manager`).
- Licensing internals: token format `opsqai.v1.<b64url>.<sig>`, `license_version:1`, `key_id`, Ed25519, CRL, heartbeat, bundle import (from `technical-documentation/03-license-flow.md`, `security-documentation/05`).
- Installer generation flow (`docs/engineering/04-issue-a-license.md`): install-id slug is chosen at provisioning time and reused; regeneration + CRL policy.
- Update system: signed manifests, updater service, offline import (roadmap-only items marked as roadmap).
- Release management (`engineering/02-release-process.md`).
- Signing key lifecycle + rotation (`security-documentation/05`).
- Module system: per-module tokens (AD-006), effect of expiry vs. maintenance vs. revocation, data retention.
- Operational playbooks:
  - Deliver a new customer (Prospect → Contract → Company → Install → License → Package → Portal handover).
  - Issue a license (UI + CLI + `issueLicense` server function).
  - Generate installation package.
  - Recover a lost `license_installs` row (DR procedure).
  - Ownership transfer (`license-transfer.functions.ts`).
  - Revocation propagation.
  - Support triage (heartbeat status, doctor bundle, audit log).
- Access control: who inside OPSQAI can see what (platform_admin gates, `getActorRoles`, MC-only routes).
- Full end-to-end flow diagram: Prospect → Contract → License → Installer → Portal → Self-Hosted → Support → Updates.
- Internal Workspace (system docs regeneration) — from `src/lib/system-docs.functions.ts`.

Mockups: MC dashboard, License issue form, Package generation, Portal downloads view, Installer wizard, Self-Hosted admin, end-to-end flow diagram.

---

## Technical approach

- One Python generator per PDF under `scripts/gen_*.py` (ReportLab + Platypus), sharing a small `scripts/opsqai_pdf_theme.py` for palette, fonts (DejaVu Sans registered for full Unicode), heading styles, table styles, and diagram primitives.
- Mockups produced as ReportLab drawings (boxes/labels resembling the real UI) plus a few real SVG/PNG assets already in `public/brand/*`. No fabricated screenshots — mockups are clearly stylized wireframes labeled with the exact route (e.g. `/app/platform/licenses`).
- Content pulled verbatim (or lightly rephrased) from the doc sources listed above; every factual claim traceable to a file. No invented metrics, no fake customer names, no market stats.
- QA loop for each PDF: render → `pdftoppm -jpeg -r 150` → view each page → fix layout/overlap/overflow → re-render until clean. Report what was checked and fixed.

## Out of scope

- No changes to product code, routes, DB, or licensing logic.
- No new marketing website copy.
- No investor deck edits (v3 remains as delivered).
- No printed/branded assets beyond the 4 PDFs.

Confirm and I'll build all four in the next turn.