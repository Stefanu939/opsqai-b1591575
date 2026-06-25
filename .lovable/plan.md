# Sprint 1 – Enterprise Launch Foundation

Five focused workstreams. All non-destructive; existing authenticated app keeps working.

## 1. Remove Google Authentication

- Strip "Continue with Google" button and divider from `src/routes/auth.tsx`.
- Remove `lovable` import there. (Leave `src/integrations/lovable/` directory untouched — it's auto-generated; nothing else imports it after this change.)
- Call `supabase--configure_social_auth` with `disable_providers: ["google"]`, keeping email enabled.
- Add **Forgot password** link on `/auth` → new `/forgot-password` page calling `supabase.auth.resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`.
- New public `/reset-password` page that handles `type=recovery` and calls `supabase.auth.updateUser({ password })`.

## 2. Route restructuring (marketing vs app)

Current `/` is the authenticated dashboard. To host public marketing on `opsqai.eu/` we move the dashboard:

```text
BEFORE                          AFTER
/                  (dashboard)  /                  (public marketing home)
/auth              (login)      /auth              (login, no Google)
                                /product, /features, /pricing,
                                /contact, /trust, /demo
                                /legal/impressum, /legal/privacy,
                                /legal/cookies, /legal/terms,
                                /legal/responsible-ai, /legal/dpa
                                /forgot-password, /reset-password
/_authenticated/* (app pages)   /app, /app/chat, /app/knowledge, … (all under _authenticated)
```

- Rename `src/routes/_authenticated/index.tsx` → `_authenticated/dashboard.tsx` (path `/dashboard`).
- Add new redirect file `src/routes/app.tsx` → `/dashboard` so `/app` is a stable app entry.
- Marketing `/` detects session and shows "Go to dashboard" instead of "Sign in" for logged-in users (no forced redirect — better UX for sharing).
- `/auth` post-login redirect changes from `/` to `/dashboard`.
- App shell logo/home links updated from `/` to `/dashboard`.

## 3. Marketing site (new public routes)

All under a shared `MarketingLayout` component (sticky header + footer, no auth chrome) reusing existing design tokens, shadcn components, and the OPSQAI logo. Each route gets its own `head()` with unique title/description/og.

Pages:
- `/` Home — hero, value props, logo wall placeholder, CTAs (Book a Demo / Try Demo / Sign in)
- `/product` — what OPSQAI is, screenshots placeholder, architecture overview
- `/features` — feature grid (SOP mgmt, RAG, multilingual, audit, RBAC, analytics roadmap)
- `/pricing` — Starter / Business / Enterprise tiers, all "Contact Sales" for now
- `/contact` — contact form (sends via existing email infra to a configurable inbox) + email/address
- `/trust` — Trust Center: encryption, RLS isolation, GDPR, audit logs, subprocessors list, infra, AI transparency
- `/demo` — public demo assistant (see §5)

## 4. Legal & compliance pages

`/legal/<slug>` routes with placeholder copy clearly marked "Draft – pending legal review":
- impressum, privacy, cookies, terms, responsible-ai, dpa

Footer links to all of them. Trust Center cross-links here.

## 5. Public Demo Assistant (`/demo`)

- Reuses the existing chat UI components (extracted minimal version — no thread sidebar).
- New server route `src/routes/api/demo-chat.ts` mirroring `/api/chat` but:
  - No auth required.
  - Uses a hard-coded `DEMO_COMPANY_ID` constant (a new dedicated company seeded via migration with sample SOPs/FAQs about generic logistics — created in Sprint 2 follow-up; for now the route runs without KB grounding and shows demo answers with a banner).
  - Rate limit: in-memory per-IP token bucket (10 msgs / 10 min), plus a 50-char max input check and 8-message conversation cap.
- Prominent banner: "Demo environment — does not access customer data."
- After 3 exchanges, an inline CTA card: Book a Demo / Start Free Trial / Contact Sales.

## 6. PWA (production-ready)

- `bun add -D vite-plugin-pwa` and wire it in `vite.config.ts` with `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions: { enabled: false }`.
- Generated SW at `/sw.js`. NetworkFirst for navigations, CacheFirst for hashed assets, exclude `/~oauth` and `/api/*`.
- New `src/lib/register-sw.ts` wrapper that refuses to register in dev, preview iframes, Lovable preview hostnames, or with `?sw=off`; also unregisters on those.
- Call the wrapper from `src/start.ts`.
- Manifest already present; verify `start_url: "/dashboard"` for installed-app launch into the app (root marketing is fine via Add-to-Home, but installed app should open into the workspace if signed in).
- Generated 192/512 icons + maskable variants if missing.
- Install prompt: small "Install app" button in the authenticated app shell when `beforeinstallprompt` fires.

## Technical notes

- **Backward compatibility**: the dashboard URL changes from `/` to `/dashboard`. The post-login redirect, app shell, and any in-app `<Link to="/">` are updated in the same edit. Bookmarks to `/` now land on marketing, which shows a "Go to dashboard" button for signed-in users.
- **No DB schema changes** this sprint — except an optional `demo` company row (deferred until demo KB content exists).
- **No edits** to `src/integrations/supabase/*` (auto-generated) or `src/routeTree.gen.ts`.
- **Existing AI features**, RAG pipeline, thread/messages tables, invite flow — untouched.
- **i18n**: marketing pages use English only for v1 (DE/RO added in Sprint 1.1 once copy is finalized).
- **`og:image`**: only on leaf routes; reuses the existing OPSQAI mark for now.
- Estimated diff: ~25 new files, ~8 edited files, 1 supabase tool call, 1 package added.

## Out of scope (deferred to later sprints)

- Tenant-specific branding/logos beyond what already exists.
- Notifications system, analytics dashboards, gap detection, SOP versioning, read-confirmations — all Sprints 2-4.
- Offline-capable cached SOPs/FAQs (PWA shell only this sprint).
- Real demo KB content (route works without it; Sprint 1.1 will seed sample SOPs).