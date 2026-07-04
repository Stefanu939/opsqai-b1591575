# OPSQAI Interactive Demo — implementation plan

Replace every "Start Free Trial" / small public chat demo with a premium **Interactive Demo Workspace** that reuses every production screen against a seeded, read-only "OPSQAI Demo" company.

## 1. Data — seeded demo tenant

Single migration + data seed:

- `companies` row `OPSQAI Demo` with fixed UUID `00000000-0000-0000-0000-0000000d3110` and a new boolean column `is_demo_tenant`.
- Realistic logistics content across: `departments` (Inbound, Outbound, QC, Safety, Fleet, HR, IT), 6 warehouses, ~12 fictional `profiles` (Anna Weber – Warehouse Manager, Marco Rossi – Team Leader Inbound, etc.), `user_roles` for each, ~18 `knowledge_documents` (SOP-INB-01…, SOP-SAFE-01…, work instructions, policies, manuals), chunks + embeddings via existing pipeline, ~25 `faqs` (EN/DE), 3 `academy_learning_paths` with chapters + lessons, ~8 `threads` + `messages` of prior AI chat history, ~200 `audit_log` rows spread across 90 days, 1 `ai_audits` row.
- All rows tagged `company_id = demo`. No PII.
- Idempotent seed script (`scripts/seed_demo_tenant.ts`) runnable server-side; also called by nightly reset cron.

## 2. Anonymous demo session

- New table `demo_sessions(id uuid pk, token text unique, started_at, expires_at, ip)`. 15-min TTL.
- Server route `POST /api/public/demo/start` → mints token, sets httpOnly cookie `opsqai_demo=<jwt>` with `{ demoCompanyId, exp }`, returns `{ expiresAt }`.
- Server route `POST /api/public/demo/end` → clears cookie.
- New server helper `resolveDemoContext(request)` → reads cookie, verifies JWT, returns `{ isDemo: true, companyId, expiresAt } | null`.

## 3. Auth + read-only enforcement

Rather than minting a Supabase user, we introduce a **demo mode** parallel to `requireSupabaseAuth`:

- New middleware `allowDemoOrAuth` used by *read* server fns already used by production screens (`listThreads`, `listKnowledgeDocs`, `listFaqs`, `academy*`, `dashboard_*`, `audit_entries`, `search_everywhere`, etc.). When the demo cookie is present it swaps `context.supabase` for a server publishable client scoped to the demo `company_id` and sets `context.isDemo = true`.
- All *write* server fns keep `requireSupabaseAuth` unchanged → in demo mode they 401 automatically.
- Add narrow `TO anon` SELECT policies on the demo-visible tables filtered by `company_id = demo AND is_demo_tenant(company_id)` via a `SECURITY DEFINER` helper `public.is_demo_company(uuid)`. This keeps RLS as the source of truth.

## 4. Client — demo shell

- New route `/demo/welcome` (replaces current `/demo`): premium welcome card, ~12–15 min tour messaging, `Launch Demo Workspace` button → calls `/api/public/demo/start`, redirects to `/demo/app`.
- New pathless layout `src/routes/_demo/route.tsx` mirroring `_authenticated/route.tsx` but reading the demo cookie via a client hook `useDemoSession()`. Children re-export the existing production route components from `_authenticated/*` so every UI change automatically flows into the demo.
- `AppShell` gains a `demoMode` prop (auto-detected from context) that renders a persistent top strip: "Demo Session · 14:58 remaining · This is a read-only preview of OPSQAI".
- A single `<DemoWriteGuard>` wraps the app tree and intercepts clicks on any element with `data-write-action`, plus toast-level interception via a shared `useCanWrite()` hook already used by mutation buttons. Instead of the mutation firing, it opens a shared `<DemoReadOnlyDialog>`:
  > **Available in your own OPSQAI workspace**
  > The Interactive Demo is intentionally read-only so you can explore the platform safely. During implementation, your organization will have full administrative capabilities tailored to your roles and permissions.
  > [Book a demo] [Contact sales]
- Countdown hook `useDemoCountdown(expiresAt)` → on `0` opens `<DemoEndedDialog>` (blocks interaction, offers Book a Demo / Contact Sales, clears cookie).

## 5. CTA + routing replacement

- `src/components/marketing/layout.tsx` header CTA → **Launch Demo Workspace** → `/demo/welcome`.
- Landing `src/routes/index.tsx`, `pricing.tsx`, `product.tsx`, `features.tsx`, `solutions.tsx`, `industries.tsx`, `contact.tsx` — replace every "Start free trial" / "Try demo" button with the same CTA + label.
- `src/routes/auth.tsx` "no account?" area → link "Explore the Interactive Demo instead".
- `/demo` (old public SOP chat) → 301 to `/demo/welcome`; remove `src/routes/api/demo-chat.ts` after the AI chat route below is wired.

## 6. AI chat inside the demo

- Reuse existing `/api/chat` route; add `resolveDemoContext` at the top so a valid demo cookie authorises the call and forces `companyId = demo` + `readOnly = true` (no thread persistence — messages kept in memory on the client, or persisted to `threads` with `is_ephemeral=true` and cleaned by reset cron). Sources render exactly like production.

## 7. Nightly reset

- `pg_cron` job `demo_reset_nightly` at 03:00 UTC: deletes `threads/messages/workspace_sessions/audit_log` rows tagged `is_demo_ephemeral=true` under the demo company, re-runs the seed's `INSERT ... ON CONFLICT DO NOTHING` layer so any manual drift is corrected. Also purges expired `demo_sessions`.

## Technical section

- **Migration**: `companies.is_demo_tenant`, `demo_sessions` table + grants, `is_demo_company()` fn, new `TO anon` SELECT policies (documents, faqs, academy_*, threads read-only where `is_demo_ephemeral`, audit_log, ai_audits, profiles limited columns, user_roles), pg_cron job.
- **Server**: `src/lib/demo/session.server.ts` (mint/verify JWT with `DEMO_SESSION_SECRET`), `src/lib/demo/context.server.ts` (`resolveDemoContext`), `src/integrations/supabase/demo-middleware.ts` (`allowDemoOrAuth`), `src/routes/api/public/demo.start.ts`, `demo.end.ts`.
- **Client**: `src/lib/demo/use-demo-session.ts`, `src/components/demo/{welcome-card,countdown-strip,read-only-dialog,ended-dialog,write-guard}.tsx`, `src/routes/demo.welcome.tsx`, `src/routes/_demo/route.tsx` + child re-exports (`_demo/app.index.tsx`, `_demo/app.chat.$threadId.tsx`, …).
- **Refactor touchpoints**: existing read server fns (`listThreads`, `academy.listPaths`, `dashboard_kpis` wrappers, `listFaqs`, `listKnowledgeDocs`, `audit.list`, `search_everywhere`, `notifications.list`) switch from `requireSupabaseAuth` to `allowDemoOrAuth`. Write fns untouched.
- **CTA replacements**: batch grep + edit across `src/routes/{index,pricing,product,features,solutions,industries,contact,auth}.tsx`, `src/components/marketing/layout.tsx`, `src/routes/demo.tsx` (delete/replace).
- **Env**: add `DEMO_SESSION_SECRET` via `add_secret`.

## Delivery approach

Because this is a very large change, I'll ship it in 3 batches with typecheck between each:

1. **Batch A** — Migration (schema + policies + `is_demo_company`, `demo_sessions`, `is_demo_tenant`), seed script, secrets. Awaits your approval on the migration.
2. **Batch B** — Server session mint/verify, `allowDemoOrAuth`, refactor existing read fns, `/api/chat` demo branch, `/api/public/demo/*`.
3. **Batch C** — Welcome route, `_demo` layout + child re-exports, countdown strip, read-only dialog, ended dialog, replace every marketing CTA, delete old `/demo`.

&nbsp;

---

# 1. Chat-ul demo

Aș schimba partea aceasta:

> no thread persistence — messages kept in memory

în

> Persist demo chat threads only for the lifetime of the active demo session. Store them as ephemeral records linked to the demo session and automatically remove them when the session expires or during the nightly reset.

De ce?

Dacă utilizatorul dă refresh după 10 minute și își pierde conversația, experiența este slabă.

Mai bine:

- refresh -> conversația rămâne
- expiră demo -> conversația dispare

---

# 2. Demo Workspace

Aș adăuga:

> Every module should contain enough realistic data to immediately demonstrate its value. No empty states should exist anywhere inside the demo workspace.

Este foarte important.

Nu vreau:

Knowledge Base

0 documents

Academy

0 learning paths

Audit

0 logs

Analytics

0 data

---

# 3. Analytics

Eu aș popula analytics mult mai mult.

Nu doar KPI.

Ci:

- AI usage
- AI confidence
- Knowledge gaps
- Top questions
- Academy completion
- Audit activity
- User activity

Exact ce vinzi.

---

# 4. AI

Aș adăuga:

> The AI should proactively demonstrate the platform.

Exemplu.

Întreb:

> How do I unload a trailer?

AI:

răspunde

- &nbsp;

Sources

- &nbsp;

Related SOPs

- &nbsp;

Related FAQ

- &nbsp;

Related Academy Lesson

- &nbsp;

Safety policy

- &nbsp;

Audit implication

Asta impresionează.

---

# 5. Search Everywhere

Aș verifica să funcționeze.

Pentru că este unul dintre cele mai bune selling points.

---

# 6. Academy

Nu doar să vadă.

Să poată intra.

Să citească.

Să navigheze.

Doar progresul să fie blocat.

---

# 7. Audit

Foarte important.

Nu doar 200 de loguri.

Fă-le credibile.

Exemplu:

```
Marco Rossi

Updated SOP-INB-14

2 days ago


```

```
Anna Weber

Approved Forklift Safety Policy


```

```
Knowledge Base

18 documents updated


```

```
AI

Confidence increased from 92% to 97%


```

---

# 8. Countdown

Eu l-aș face discret.

Nu gigantic.

Gen.

```
Demo Session

13:24 remaining


```

sus.

---

# 9. Expirare

Nu aș închide instant aplicația.

Mai bine.

Overlay.

Background blur.

"You can still look around, but AI and interactions are disabled."

Este mai elegant.

---

# 10. Cel mai important

Asta lipsește complet.

## Guided Tour

Prima dată când intră.

Sus.

```
Welcome.

Suggested exploration

1️⃣ Ask the AI a warehouse question.

2️⃣ Explore the Knowledge Base.

3️⃣ Open Analytics.

4️⃣ Review Audit.

5️⃣ Browse Academy.

Estimated time

12 minutes.


```

Nu tutorial.

Doar un checklist.

Este enorm pentru conversie.

---

# 11. Un lucru pe care l-aș schimba

În loc de

```
OPSQAI Demo

```

Aș crea ceva mult mai realist.

Exemplu

```
Nordic Distribution Group

```

sau

```
Atlas Logistics GmbH

```

sau

```
Nova Supply Chain

```

Pentru că atunci omul uită că este într-un demo.

Pare un client real.

Poți păstra "OPSQAI Demo" doar intern, dar în UI afișează un nume de companie fictiv, credibil.

---

