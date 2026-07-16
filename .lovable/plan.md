
# OPSQAI Enterprise Design System v3 — Redesign Plan (revised)

Locked decisions from your feedback:
- **Fonts:** Space Grotesk (headings) + Inter (body)
- **Gold:** `#C9A24C`
- **Sidebar:** 240px compact, icon + label
- **Execution rule:** phases run strictly in order. No phase starts before the previous one is fully complete and approved against the Definition of Done.
- **Visual identity split:** Management Center is the *only* product allowed to use Noir & Gold. Customer Portal and Self-Hosted share the same enterprise design language (Deep Navy / Soft White / Gold accent), adapted for their audience.

---

## Design Principles (govern every phase)

- Enterprise-first
- Calm interface
- Information over decoration
- Premium but efficient
- Every page solves one business task
- Beauty never reduces productivity
- Charts must always answer a business question — never decoration
- Visual elements must provide context, not decoration — images reinforce the business purpose of the page
- Every animation must have a purpose — never animate for the sake of animation

---

## Phase −1 — UX Audit (no visual changes yet)

Before redesigning anything, inventory what exists and produce an audit report:
- Duplicate components (buttons, cards, dialogs, tables)
- Unused / obsolete pages and routes
- Inconsistencies (spacing, radius, shadow, colors)
- Typography inconsistencies (font sizes, weights, line-heights in the wild)
- Iconography inconsistencies (mixed icon libraries, sizes, weights)
- Accessibility gaps (focus states, contrast, aria labels, keyboard nav)
- Layout shift and overflow hotspots

**Deliverable:** `.lovable/audit.md` with findings grouped by severity, plus a consolidation list ("keep / merge / delete"). No UI changes ship in this phase.

---

## Phase 0 — Foundations

Rebuild the design tokens and primitives every later phase depends on.

**Tokens (`src/styles.css`)**
- Palette: Deep Navy primary `#0B1E3B`, Soft White `#FBFBFC`, Light Gray surfaces, OPSQAI Gold `#C9A24C`, Emerald success, Amber warning, Red danger. Muted chart palette (navy, slate, gold, emerald, clay).
- No purple. No neon. Gradients confined to marketing hero only.
- Typography: Space Grotesk (display) + Inter (body), tabular numerals, generous line-height, tight tracking on headings, large H1 (40–56px).
- Radius scale 10 / 14 / 20, layered soft shadows, 8px spacing grid with 4px sub-grid.
- Motion tokens: `--ease-out-expo`, 180 / 240 / 320ms.
- Dark mode: charcoal navy background, warm off-white foreground, same gold accent.

**Primitives**
- `Card`, `Button`, `Table` (sticky header, hover, status pills, bulk bar, pagination), `StatCard`, `EmptyState` (illustration + copy + action), `SectionHeader`, `Breadcrumbs`, `PageShell`, chart wrappers on top of Recharts.

**App shell (self-hosted + portal)**
- 240px sidebar, icon + label, grouped sections, thin gold left-bar active indicator.
- Top bar: ⌘K global search, notifications, profile menu with avatar.
- Page transitions via Framer Motion.

---

## Phase 1 — Profile pictures

Ships with Phase 0 so the new avatar in the top bar is real.
- Storage bucket `avatars` (public read, authenticated write to `{user_id}/…`).
- `profiles.avatar_url` (verify column exists; add if missing).
- `AvatarUploader`: click / drag, square crop, ≤2MB, jpg/png/webp, live preview.
- Wired into top-bar menu, `/settings/profile`, Team member cards (MC), Support chat, message bubbles.
- Fallback: initials on soft navy tile.

---

## Phase 2 — AI Chat (self-hosted hero surface)

Large centered composer, elegant bubbles (assistant on surface, user in navy pill), streaming indicator, markdown + code, inline citation chips opening a Sources drawer with document previews, confidence indicator, suggested follow-ups, left rail with history / pinned / bookmarks / search. AI Elements primitives per `chat-ui-composition`.

---

## Phase 3 — Knowledge Base

Document previews (real PDF/DOCX thumbnails), folder cards, upload progress, processing animation, Recent + Recently-used rails, ingestion donut, knowledge-growth line chart — each chart tied to a specific business question.

---

## Phase 4 — AI Audit

Vertical timeline, risk pills, filters, latency line, token usage area, provider donut, per-source bars — every chart answers a concrete audit question (cost, latency, provider mix, retrieval coverage).

---

## Phase 5 — Management Center (Noir & Gold, refined)

Only MC uses Noir & Gold. Companies / Installations / Licenses / Releases / Support / Team all upgraded to the new premium tables, StatCards, empty states, detail drawers. Dashboard becomes a real Control Center: fleet map, license usage donut, revenue line, active-installs sparkline, support inbox summary, recent releases. Support chat keeps the WhatsApp/Teams layout, polished bubbles + avatars.

---

## Phase 6 — Customer Portal (enterprise identity, not Noir & Gold)

Download cards, License card with progress ring, support timeline, docs cards, invoices table, release notes cards.

---

## Phase 7 — Marketing site polish

Home / Product / Pricing / Security / Self-hosted / Contact — hero imagery (warehouse, factory, distribution center, knowledge graph), architecture diagram, elegant pricing table.

---

## Phase 8 — Empty states, illustrations, imagery pass

Generated illustrations for every empty state (no docs, no conversations, no licenses, no team members). Warehouse / factory / knowledge-graph hero images generated once and reused.

---

## Definition of Done (every phase)

A phase is complete only when all of the following pass:

✓ Desktop looks polished
✓ Tablet works
✓ Mobile works where applicable
✓ Dark mode verified
✓ Keyboard navigation works
✓ Loading states implemented
✓ Empty states implemented
✓ Error states implemented
✓ Success states implemented
✓ Accessibility checked
✓ No layout shifts
✓ No overflowing text
✓ No placeholder icons
✓ No lorem ipsum
✓ Typecheck passes
✓ Build passes

---

## Execution order

Phase −1 → 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. No skipping. No mixing new elements with old inside a shipped phase. Each phase is presented for approval against the Definition of Done before the next begins.

On approval, I start with **Phase −1 (UX Audit)** — no visual changes, just the audit report.

---

## Technical notes

- All colors via semantic tokens in `src/styles.css`; components never hardcode hex.
- Tailwind v4 `@theme` + `@utility` conventions (already in place).
- Framer Motion for purposeful motion only.
- Recharts wrappers apply the muted palette; every chart carries a title stating the business question it answers.
- Avatar upload via Lovable Cloud storage; RLS on `storage.objects` scoped to `auth.uid()`.
- Every route gets proper `head()` title + description + og:image where a hero image exists.
- Zero regressions to Team, Support, Releases, Licenses activate-module, or self-hosted client — behavior preserved, chrome upgraded.
- MC visual identity (Noir & Gold) is scoped strictly under the `.mc-shell` wrapper; portal/self-hosted routes never load it.
