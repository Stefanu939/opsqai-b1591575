# OPSQAI Enterprise Redesign — Plan

Pure UI/UX modernization. No routes, APIs, DB, auth, or business logic touched. All existing files keep their exports, props, and data flow.

## Scope guardrails

- No changes to: routes (`src/routes/**` paths), server functions (`src/lib/**.functions.ts`, `**.server.ts`), Supabase integration, RLS, RBAC, i18n keys, navigation entries, query keys.
- Allowed: design tokens, Tailwind classes, JSX structure inside components, new presentational components, new marketing sections, new shared UI primitives (Card variants, KPI cards, etc.).

## 1. Design system refresh (`src/styles.css`)

- Tune semantic tokens for an "enterprise deep navy + teal/cyan" palette (already close — refine contrast, add elevation tiers).
- Add tokens: `--surface-1/2/3`, `--border-subtle`, `--border-strong`, `--accent-glow`, `--gradient-hero`, `--gradient-cta`, `--shadow-card`, `--shadow-elevated`, `--shadow-glow`.
- Typography scale: tighten heading tracking, comfortable line-heights, display sizes for hero.
- Utility classes: `.card-enterprise`, `.glow-ring`, `.hover-lift`, `.grid-noise` (subtle SVG/CSS noise bg).

## 2. Marketing site redesign (`src/routes/_marketing/*`, `src/components/marketing/*`)

Sections rebuilt visually only (copy preserved or lightly polished):

- **Layout/Nav**: glass top nav, refined dropdown menus, sign-in + book demo CTAs visible on desktop & mobile (already fixed — restyle only).
- **Hero**: large display headline w/ teal accent on keyword, subtitle, CTA pair, KPI badge row (Source-grounded, Reduce onboarding, Enterprise Security, Multilingual). Right side: animated dashboard mockup (pure JSX/CSS — KPI tiles, sparkline SVG, donut SVG, recent questions list) with glow ring.
- **Trust bar**: logo strip restyled (Dachser, DB Schenker, Raben, FM Logistic, cargo-partner).
- **Features grid**: 9 premium feature blocks (Knowledge Mgmt, Operational Intelligence, Compliance, Analytics, AI Workspace, Knowledge Gaps, Enterprise Search, Notifications, Version Control) — icon + title + desc + hover lift/glow.
- **Platform showcase**: tabbed/stacked realistic UI previews built in JSX (Dashboard, AI Chat, Knowledge Base, Analytics, AI Workspace, Knowledge Gaps, Internal Requests).
- **Stats strip**: 95% faster retrieval, 70% reduced onboarding, 24/7 multilingual, Enterprise-ready.
- **Testimonial**: redesigned quote card.
- **CTA**: dark gradient block with animated lines (CSS), Book Demo + Explore Platform.
- **Footer**: enterprise multi-column (Product, Solutions, Industries, Resources, Security, Compliance, Legal, Company, social).

## 3. App shell + dashboard restyle

- `src/components/app-shell.tsx` / sidebar: refined spacing, grouped sections (Workspace / Knowledge / Admin), active indicator pill, hover state, polished collapse, refined topbar (search, notifications bell, workspace switcher, user menu).
- `src/routes/_authenticated/app.index.tsx` (Dashboard): larger KPI cards w/ trend deltas, sections for Recent Activity, AI Confidence, Knowledge Health, Open Requests, Knowledge Gaps, Latest SOP updates, Usage. Data sources unchanged.

## 4. Feature page restyle (visual only)

- Knowledge Base: cards/table polish, version badges, hover actions.
- Chat: cleaner bubbles, sources panel, confidence badges, feedback row, suggested follow-ups, refined composer (keep AI Elements primitives).
- Analytics: enterprise chart cards, trend chips.
- AI Workspace session view: three-column polish (files / chat / artifacts), retention countdown chip, artifact preview cards.

## 5. Micro-interactions & a11y

- Subtle hover lifts, skeleton loaders, button transitions (already in tokens).
- Focus-visible rings, AA contrast, 44px tap targets, `aria-label` audit on icon buttons touched.

## 6. Mobile

- Verify each redesigned surface at 360–414px. Drawer nav, stacked KPIs, scrollable tabs for platform showcase.

## What I will NOT do

- Add/remove routes, change i18n keys, alter server fn signatures, touch RLS/migrations, change query keys or props of existing exported hooks.

## Technical notes

- All charts are inline SVG (no new chart libs) to keep bundle lean and avoid functional risk.
- Generated dashboard/preview mockups are pure JSX — no new dependencies.
- All colors via tokens; no hardcoded hex in components.

## Delivery

I'll ship in this order, verifying typecheck after each:
1. Tokens + utilities
2. Marketing nav/hero/trust
3. Features + platform showcase + stats + CTA + footer
4. App shell + dashboard
5. Knowledge / Chat / Analytics / Workspace polish

Given the scope (~25–35 files), this is a long single-turn task. Approve and I'll execute end-to-end.
