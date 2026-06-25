# OPSQAI — Architecture Notes

_Last updated: 2026-06-25 (Sprint 1 / 1.0 release)._

This document is the working architectural reference for OPSQAI. It is
intentionally short. Source code is the source of truth; this file explains the
intent and the invariants.

---

## 1. High-level shape

OPSQAI is a single TanStack Start application that hosts two surfaces from one
codebase:

```
┌──────────────────────────────────────────────────────────┐
│  opsqai.eu  (public marketing + /demo + /trust + /legal) │
│  opsqai.de  (alias)                                      │
├──────────────────────────────────────────────────────────┤
│  /app/*    authenticated workspace (chat, KB, FAQ, admin)│
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │ Supabase (managed PG)   │
           │  · Auth                 │
           │  · Postgres + pgvector  │
           │  · Storage (knowledge)  │
           │  · RLS per company_id   │
           └─────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │ Lovable AI Gateway       │
           │  · chat completions     │
           │  · embeddings (small)   │
           └─────────────────────────┘
```

The marketing surface is fully static / SSR — no auth required, no Supabase
calls at request time. The application surface requires a Supabase session and
is reached at `/app`.

---

## 2. Routing

Routing is file-based via TanStack Router with flat dot-notation:

- `src/routes/__root.tsx` — html shell, metadata, JSON-LD, service-worker
  registration, i18n provider.
- `src/routes/index.tsx` — marketing homepage at `/`.
- `src/routes/{product,features,solutions,industries,pricing,contact,demo,trust}.tsx`
  and `src/routes/trust.<topic>.tsx` — public marketing.
- `src/routes/legal/*.tsx` — legal pages.
- `src/routes/_authenticated.tsx` — auth gate; redirects to `/auth` if no
  session.
- `src/routes/_authenticated/app*.tsx` — workspace routes mounted under `/app`.
- `src/routes/api/*.ts` — server functions (chat, demo-chat, etc.).
- `src/routes/sitemap[.]xml.ts` — dynamic sitemap.

**Invariant:** anything under `_authenticated/` must use a path prefixed with
`/app`. Anything outside it must not call Supabase with a user JWT at request
time.

---

## 3. Tenancy & access control

- Every tenant table carries `company_id uuid not null`.
- Two SECURITY DEFINER helpers exist in the database:
  - `public.current_company_id() returns uuid` — derived from the caller's
    `auth.uid()`; honors the platform-admin workspace switcher.
  - `public.is_platform_admin() returns boolean`.
- RLS policies on every tenant table are of the form:
  `using (company_id = public.current_company_id() or public.is_platform_admin())`.
- `has_role(user_id, role)` is the single source of truth for role checks
  (admin, manager, team_leader, employee, platform super admin).
- `knowledge-docs` storage bucket:
  - INSERT / UPDATE / DELETE: admin only.
  - SELECT: subject to a matching `knowledge_documents` row in the caller's
    company.
- `user_roles` has a RESTRICTIVE INSERT policy requiring admin.

**Invariant:** new tables that hold tenant data MUST add `company_id` and the
two-clause RLS policy above before merging.

---

## 4. Knowledge base & RAG pipeline

1. **Upload** — admin or manager uploads PDF / DOCX / TXT into `knowledge-docs`
   storage and creates a `knowledge_documents` row.
2. **Extract** — `src/lib/doc-processing.server.ts` extracts text (PDF via
   `unpdf`, DOCX via mammoth-equivalent, TXT raw).
3. **Chunk** — SOP-aware recursive chunker (~1000 chars) that respects ALL-CAPS
   or numbered section headers so a section is not split mid-clause.
4. **Embed** — embeddings via Lovable AI Gateway (`text-embedding-3-small`),
   stored on `document_chunks.embedding vector(1536)`.
5. **Retrieve** — `match_document_chunks(query_embedding, match_count,
   company_id)` returns top-K chunks scoped to the caller's company.
6. **Answer** — `src/routes/api/chat.ts` builds a strict, source-grounded
   prompt. If no usable sources are returned, the model emits a localized
   refusal and the UI surfaces a "Create internal request" CTA.

**Invariant:** the chat endpoint never answers from model world knowledge. The
system prompt and the retrieval scoring both enforce this.

---

## 5. Public demo

`src/routes/api/demo-chat.ts` is intentionally **not** wired to Supabase. It
uses an inline `DEMO_KB` array of small sample logistics SOPs (receiving, PPE,
returns, …). The same refusal pattern applies — out-of-scope questions get the
refusal string, not a generic LLM answer.

Rate-limiting is per IP (10 / 10 min) and per conversation (8 user turns).

---

## 6. PWA

- `vite-plugin-pwa` in `autoUpdate` mode.
- `public/manifest.webmanifest` sets `start_url: "/app"` and `scope: "/"`.
- `src/lib/register-sw.ts` skips registration in development, in iframes, on
  Lovable preview hostnames, and when `?sw=off` is set.
- Workbox runtime caching:
  - HTML → NetworkFirst with a short timeout.
  - Hashed JS/CSS → CacheFirst.
  - API calls under `/api/*` → NetworkOnly.

---

## 7. Observability & audit

- `audit_log` is append-only, per-tenant, and captures the question, the
  matched sources and the user.
- Admin dashboard reads "Most Used Documents" and "Most Asked Questions" from
  the audit log.
- Application errors are surfaced via the runtime-errors knowledge file in
  development and via the platform's standard logging in production.

---

## 8. Environments

| Env | URL | Notes |
| --- | --- | --- |
| dev | `localhost:5173` | Service worker disabled. Lovable AI calls live. |
| preview | `*.lovable.app` | Service worker disabled by host-allowlist. |
| prod | `opsqai.eu`, `opsqai.de` | SW + PWA active; `start_url=/app`. |
