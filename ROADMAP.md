# OPSQAI — Future Roadmap

_Indicative, not contractual. Items move as customer feedback comes in._

## Sprint 2 — Activation & Conversion (next)

- 301 redirects from legacy unauthenticated app paths to `/app/*` equivalents.
- Public **status page** at `status.opsqai.eu` wired into the Availability and
  ISO 27001 Roadmap pages.
- **Self-serve trial** flow: company creation, admin bootstrap, sample KB seed,
  in-app onboarding checklist.
- **Email digests** for managers: open internal requests, promoted FAQs,
  knowledge gaps trending this week.
- Marketing site polish: customer logos, one written case study, FAQ section.
- Legal pages reviewed by counsel and de-drafted.

## Sprint 3 — Enterprise hardening

- **SSO**: SAML 2.0 and OIDC for Enterprise plan tenants.
- **SCIM** user provisioning.
- **IP allow-listing** per tenant.
- **Field-level encryption** for selected profile fields.
- **Data residency** option: per-tenant choice of EU-West vs EU-Central.
- **Pen-test** with an accredited firm; remediation tracked in the audit log.

## Sprint 4 — Knowledge depth

- **Hybrid retrieval v2**: BM25 + dense + cross-encoder rerank.
- **Document-level Q&A**: ask "what changed?" between SOP versions.
- **Image-bearing SOPs**: OCR pipeline for scanned procedures; figure citations.
- **Voice input** on mobile for hands-busy floor operators.
- **Offline FAQ pack** cached on the PWA for spotty-network warehouses.

## Sprint 5 — Workflow integration

- **Webhook outbox** for `internal_requests` and `audit_log` events.
- **Slack / Teams** connectors for unanswered-question alerts to managers.
- **Microsoft 365** SharePoint connector for SOP ingestion.
- **Confluence** connector.
- **Public REST API** with per-tenant API keys and rate limits.

## Sprint 6 — Insights

- **Knowledge health score** per tenant (coverage, freshness, refusal rate).
- **Per-SOP analytics**: queries answered, time saved, gaps surfaced.
- **Shift-level dashboards** for team leaders.
- **Exportable compliance reports** (PDF) covering audit log + KB inventory.

## Compliance milestones

- 2026 Q3 — Internal ISMS scope statement and Statement of Applicability.
- 2026 Q4 — Risk register, asset inventory and data-flow diagrams formalized.
- 2026 Q4 — Annual third-party penetration test.
- 2027 H1 — ISO/IEC 27001 Stage 1 readiness review.
- 2027 H2 — ISO/IEC 27001 Stage 2 audit; targeted certification.

## Explicitly _not_ on the roadmap

- Training models on tenant data. OPSQAI is inference-only; this is a
  deliberate product choice, see `/trust/responsible-ai`.
- A consumer free tier. The product is workspace-oriented and invite-only.
- A generic "chat with any document" mode that bypasses source grounding.
