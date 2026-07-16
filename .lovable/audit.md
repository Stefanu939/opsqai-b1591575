# OPSQAI — Phase −1 UX Audit

Read-only inventory. No UI changes ship in this phase. Findings are grouped by
severity so Phase 0 can act on them in a single pass.

Scope covered:
- `src/routes/` — 101 files (public marketing, `_authenticated/app.*`,
  `_authenticated/management.*`, `_authenticated/portal.*`, API/misc).
- `src/components/` — 68 files across `ui/`, `app/`, `mc/`, `academy/`,
  `admin/`, `brand/`, `legal/`, `marketing/`, `support/`, `theme-toggle`.
- `src/styles.css` — 597 lines (tokens + MC Noir & Gold layer).

---

## Severity: High (blocks the "one visual system" goal)

### H1. Three shells, three visual identities, no shared primitive
- `src/components/app/app-shell.tsx` → self-hosted operator UI
- `src/components/mc/mc-shell.tsx` → Management Center (Noir & Gold, `.mc-shell` wrapper)
- Portal routes (`portal.*`) render inline, no dedicated shell component
- Marketing routes (`index`, `product`, `pricing`, `security`, `self-hosted`,
  `modules`, `documentation`, `company`, `contact`) each roll their own header/footer

Consolidation for Phase 0:
- **Keep** `mc-shell` (MC is the only product allowed Noir & Gold; scope stays).
- **Merge** self-hosted `app-shell` + portal chrome into one enterprise
  `PageShell` + 240px sidebar (Deep Navy / Soft White / Gold accent).
- **Merge** marketing header/footer into a single `MarketingShell`.

### H2. Two support chat surfaces
- `src/components/support/support-widget.tsx` (customer widget)
- `src/components/support/chat-glider.tsx` (drawer chat)
- Plus `management.support.tsx` full WhatsApp/Teams pane

All three re-implement bubbles, avatars, timestamps, and internal-note styling.
**Merge:** one `<ChatThread>` primitive + one `<MessageBubble>` primitive, three
callers.

### H3. Hardcoded color utilities bypass tokens
Found in `src/components/support/chat-glider.tsx` (13 hits): `bg-white/10`,
`text-primary-foreground hover:bg-white/10`, etc. Also `bg-red-500 text-white`
in `support-widget.tsx:389`. And `bg-black/40` overlays in `mc-shell.tsx:169`,
`dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `alert-dialog.tsx`.

Overlay usage in shadcn primitives (`bg-black/80`) is acceptable — that is the
Radix pattern — but the app-code hits must move to semantic tokens
(`bg-destructive text-destructive-foreground`, `bg-foreground/10`, etc.).

### H4. `#020617` hex in `__root.tsx` `theme-color` meta
Should reference the resolved `--background` token, not a literal navy hex, so
dark/light modes stay in sync.

---

## Severity: Medium (blocks "premium" polish)

### M1. Font stack is fragmented
- `--font-sans` (line 214), `--font-display` (222), `--font-mono` (234) tokens exist
- MC layer hardcodes `"Epilogue"` (456) and `"Urbanist"` (466, 472) directly
- No `<link rel="preconnect">` or `<link rel="stylesheet">` for Google Fonts in
  `__root.tsx` head — fonts either render as system fallback or are loaded
  ad-hoc

Phase 0 fix: load Space Grotesk + Inter (and Urbanist/Epilogue for MC) once in
`__root.tsx` `<head>`, map `--font-display`/`--font-sans` in `@theme`, and let
`.mc-shell` override to Urbanist/Epilogue.

### M2. Duplicate empty-state / stat-card / section-card patterns
`ui/empty-state.tsx`, `ui/stat-card.tsx`, `ui/section-card.tsx`, and
`ui/page-header.tsx` already exist as primitives — but many routes still hand-
roll their own `Card` + `CardHeader` + centered icon block instead of using
them. Symptom: inconsistent icon size, copy length, spacing, and button placement.

Consolidation: audit every `Card` usage in `management.*` and `portal.*` and
replace ad-hoc empty/stat blocks with the primitives.

### M3. Icon library is uniform (good) but sizing is not
All icons come from `lucide-react` (confirmed across 15+ files) — no mixed
libraries. Good. However icon sizes vary between `h-3 w-3`, `h-3.5 w-3.5`,
`h-4 w-4`, `h-5 w-5`, `h-6 w-6` inline with no rule. Phase 0 fix: define a
size scale (xs=14, sm=16, md=18, lg=20, xl=24) and enforce via a small
`<Icon>` wrapper or documented class set.

### M4. Route sprawl in `_authenticated/`
47 route files. Notable overlaps to review, not delete blindly:
- `app.chat.tsx` + `app.chat.index.tsx` + `app.chat.$threadId.tsx` — layout
  route pattern, correct, but `app.chat.tsx` must render `<Outlet />`.
- `management.portal.tsx` — after the Releases/Portal merge this route is a
  redirect target; verify it doesn't render orphan UI.
- `management.customers.tsx` vs `management.companies.tsx` — check whether one
  is legacy from before the companies-as-tenants refactor.
- `portal.admin.tsx` + `portal.admin.index.tsx` + `portal.admin.downloads.tsx`
  — layout pattern, keep, but confirm `portal.admin.tsx` renders `<Outlet />`.

Phase 0 deliverable: a keep/merge/delete decision for each of the above,
tracked in this file, executed in the phase that owns each surface (MC →
Phase 5, Portal → Phase 6, self-hosted app → Phase 2/3).

### M5. Spacing / radius / shadow — inconsistent across cards
Cards use a mix of `rounded-lg`, `rounded-xl`, `rounded-2xl` and shadow
utilities `shadow`, `shadow-sm`, `shadow-md`, `shadow-elegant`. Phase 0 locks:
- Card radius: `--radius-lg = 14px`
- Panel radius: `--radius-xl = 20px`
- Two shadow tokens only: `--shadow-1` (rest), `--shadow-2` (raised/hover)

---

## Severity: Low (polish, address inside owning phase)

### L1. Accessibility gaps
- Focus rings are inconsistent — some interactive `div`s (used as clickable
  cards in MC list views and `management.support.tsx` conversation list) lack
  visible `focus-visible:ring` treatment.
- Sidebar toggles work, but the mobile back-arrow in `management.support.tsx`
  is not keyboard-reachable in the desktop grid.
- No `aria-live` region on the chat panes for streaming/new-message announcements.

### L2. Layout shift hotspots
- Avatar area currently renders a text-initials fallback then swaps to the
  image once loaded (Phase 1 delivers real avatars — pre-reserve the box).
- Marketing hero images have no `width`/`height` on `<img>`.

### L3. Loading / empty / error / success state coverage is uneven
Most `management.*` routes have loading skeletons via `useSuspenseQuery`, but
`portal.*` and several `app.*` routes fall back to a bare "Loading…" string.
Phase 0's `EmptyState` + `Skeleton` primitives must be applied top-down in each
phase's DoD pass.

### L4. `text-color: #020617` on `<meta name="theme-color">`
Same root cause as H4, called out separately because it also affects the mobile
browser chrome. Bind to the resolved theme.

### L5. No `theme-color` update on dark mode toggle
Consequence of L4/H4. When we bind to a CSS var we also need a small effect in
`__root.tsx` (or theme toggle) that rewrites the meta tag on mode change.

---

## Keep / Merge / Delete list (initial)

Executed later in the phase that owns each surface. This list is *proposed*;
nothing is deleted in Phase −1.

| Item | Decision | Executed in |
|---|---|---|
| `components/ui/*` shadcn primitives | Keep, extend variants in Phase 0 | Phase 0 |
| `components/ui/empty-state.tsx`, `stat-card.tsx`, `section-card.tsx`, `page-header.tsx` | Keep, adopt everywhere | Phase 0 → all |
| `components/app/app-shell.tsx` | Rewrite as new 240px enterprise shell | Phase 0 |
| `components/mc/mc-shell.tsx` | Keep, refine in MC pass | Phase 5 |
| `components/support/support-widget.tsx` + `chat-glider.tsx` | Merge chat internals behind one primitive | Phase 2 |
| Marketing header/footer inline in each route | Extract to `MarketingShell` | Phase 7 |
| Hardcoded `bg-white/10`, `bg-red-500`, `bg-black/40` in app code | Replace with tokens | Phase 0 |
| `management.customers.tsx` vs `management.companies.tsx` | Verify legacy, merge or delete | Phase 5 |
| `management.portal.tsx` post-merge | Verify redirect only | Phase 5 |
| `#020617` in `__root.tsx` `theme-color` | Bind to CSS var + update on theme change | Phase 0 |
| Direct `"Urbanist"` / `"Epilogue"` in `styles.css` | Route through `@theme` + `.mc-shell` override | Phase 0 |

---

## What Phase 0 must produce (recap)

- Design tokens in `src/styles.css` (Deep Navy, Soft White, Gold `#C9A24C`,
  chart palette, radius 10/14/20, shadows, motion tokens).
- Google Fonts loaded via `<link>` in `__root.tsx` head:
  Space Grotesk (display) + Inter (body), plus Urbanist + Epilogue for `.mc-shell`.
- Primitives updated / documented: `Card`, `Button`, `Table`, `StatCard`,
  `EmptyState`, `SectionHeader`, `Breadcrumbs`, `PageShell`, chart wrappers.
- New enterprise app shell (240px sidebar, icon + label, gold left-bar active
  indicator, ⌘K search, notifications, avatar menu) — shared by self-hosted
  and portal.
- All H1–H4 findings closed. M1–M5 addressed as far as tokens/primitives
  reach (route-level consolidations happen in each surface's own phase).

Phase 0 ends when every checkbox in the shared Definition of Done passes
against the shell, tokens, and primitives — reviewed and approved before
Phase 1 (profile pictures) starts.
