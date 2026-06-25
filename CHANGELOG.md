# Changelog

All notable changes to OPSQAI are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and dates use ISO 8601.

## [1.0.0] – 2026-06-25 — Enterprise Launch Foundation (Sprint 1)

### Added
- **Public marketing site** at `opsqai.eu` with shared `MarketingLayout` and dedicated routes:
  `/`, `/product`, `/features`, `/solutions`, `/industries`, `/pricing`, `/contact`,
  `/trust`, `/demo`.
- **Legal & compliance pages** under `/legal/`: `privacy`, `cookies`, `terms`, `dpa`,
  `responsible-ai`, `impressum` (marked draft pending legal review).
- **Trust Center deep-dives** at `/trust/<topic>`: GDPR, Security Architecture,
  Multi-Tenant Isolation, Encryption, Audit Logs, Responsible AI, Data Retention,
  Incident Response, Backup Policy, Availability, ISO 27001 Roadmap.
- **Public demo assistant** at `/demo` powered by `api/demo-chat` with:
  a dedicated inline demo knowledge base of sample logistics SOPs,
  source-grounded refusal when out of scope,
  per-IP rate limit (10 / 10 min) and per-conversation cap (8 user turns),
  CTA card after 3 exchanges.
- **Forgot-password** flow: `/forgot-password` and `/reset-password` routes.
- **PWA production wiring**: `vite-plugin-pwa` with autoUpdate, NetworkFirst HTML,
  CacheFirst hashed assets, `src/lib/register-sw.ts` wrapper that refuses
  registration in dev / iframes / Lovable preview hostnames and honors `?sw=off`.
- **JSON-LD organization schema** and OG metadata in `__root.tsx`.
- `public/robots.txt`, `public/llms.txt`, dynamic `/sitemap.xml`.

### Changed
- **Authenticated app moved from `/` to `/app`.** All authenticated routes now live
  under `/_authenticated/app/*` (`/app`, `/app/chat`, `/app/knowledge`, `/app/faq`,
  `/app/requests`, `/app/profile`, `/app/admin/*`). The root `/` is now the public
  marketing home.
- **PWA `start_url`** set to `/app` so the installed app launches directly into the
  workspace instead of the marketing homepage.
- **Post-login redirect** changed from `/` to `/app`; app shell logo, nav links,
  admin route guards and the accept-invite flow all updated accordingly.
- **Auth providers**: Google / social removed; email + password only. Sign-in screen
  surfaces a "Forgot password?" link.
- **Domain alignment**: canonical and OG URLs use `opsqai.eu`; custom domains
  `opsqai.de` and `opsqai.eu` both serve the product.

### Removed
- "Continue with Google" UI and Supabase Google provider configuration.
- Public signup; new users now arrive only via `/accept-invite` from an admin invite.

### Security
- Confirmed RLS scoping by `company_id` on all tenant tables.
- Hardened `knowledge-docs` storage policies (admin-only INSERT/UPDATE/DELETE;
  SELECT requires a matching `knowledge_documents` row).
- Restrictive INSERT policy on `user_roles` blocks privilege escalation.
- `SECURITY DEFINER` helpers (`current_company_id`, `is_platform_admin`,
  `has_role`) have EXECUTE revoked from `PUBLIC` / `authenticated`.

---

## [0.9.0] – 2026-06-23 — OPSQAI Rebrand & Production Readiness

### Changed
- Renamed product from LogiAI / LogiAssist to **OPSQAI** (Operational Knowledge
  Intelligence). Tagline: "Instant access to company knowledge."
- New branded assets: `opsqai-mark.png`, `opsqai-og.jpg`, PWA icons and favicons.
- Sidebar and auth screens use the purple swirling mark with glow.

### Added
- **Source-grounded chat mode** with explicit refusal string in EN / DE / RO.
- **Internal request system**: `internal_requests` table, `/requests` route,
  promote-to-FAQ and promote-to-SOP server functions.
- Greeting detection and follow-up patterns reuse prior sources for elaboration.
- Animated thinking dots, copy buttons, navy gradients, KPI cards with accent bars.

---

## [0.8.0] – 2026-06-22 — Multi-Tenant SaaS

### Added
- `companies` entity; `company_id` propagated to `profiles`, `user_roles`,
  `threads`, `messages`, `knowledge_documents`, `faqs`, `audit_logs`,
  `document_chunks`, `internal_requests`.
- `current_company_id()` and `is_platform_admin()` SECURITY DEFINER helpers.
- All RLS policies rewritten for total data isolation by `company_id`.
- **Platform Super Admin** role with `/admin/companies` and `/admin/platform-admins`
  management surfaces; tenant workspace switcher in the sidebar.
- **Multilingual support** added Romanian (RO). AI auto-detects EN / DE / RO and
  answers in the user's language even when sources are in a different one.
- Invite-only signup hardened via `handle_new_user` trigger.

---

## [0.7.0] – 2026-06-20 — Knowledge Base v2

### Added
- pgvector semantic retrieval with `match_document_chunks` SQL function.
- Server-side PDF / DOCX / TXT extraction (`unpdf`) and SOP-aware recursive
  chunking (~1000 chars, section-header aware).
- `document_chunks` table with embeddings via Lovable AI Gateway
  (`text-embedding-3-small`).
- Citation persistence on `messages`, sources panel in chat.
- Roles: admin, manager, team_leader, employee.
- Admin suite: user CRUD, dashboard KPIs ("Most Used Documents", "Most Asked
  Questions"), per-tenant audit log.
- Bilingual DE / EN UI.
- PWA installability foundations.

---

## [0.1.0] – 2026-06-17 — MVP (LogiAI)

Initial public version: chat threads, basic knowledge base upload, FAQs,
Supabase auth, TanStack Start scaffold.
