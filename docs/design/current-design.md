# Current design

> This file describes the design that is **implemented in the codebase today**, as a
> consistency reference. It is not a permanent standard and it does not lock the product
> to any palette, typography or graphic style. When a visual change is explicitly
> requested, the implementation changes and this file is rewritten to match the new
> reality — the old description is deleted, not kept as an alternative. History lives in
> git only.
>
> There is exactly one current design per product scope at any given time.

Source of truth for values: `src/styles.css`. This document only summarises what is there.

---

## Self-Hosted — `/app/*`

Wrapper: none (global `:root` / `.dark` tokens). Module shell: `src/components/app/module-page.tsx`.

- **Graphic style** — "Command Deck": flat panels with hairline borders, a soft ambient
  radial aura (gold + primary) behind the page header, bento/panel content areas.
- **Color direction** — light: Parchment background `#f7f4ea`, emerald ink `#0f221c`,
  emerald primary `#064e3b`, muted gold accent `#96762a`. Dark: deep emerald `#04211a`
  background, cream `#f5f0e0` text, gold primary `#c9a84c`.
- **Typography** — display `Space Grotesk`, body `Karla`, mono `JetBrains Mono`.
- **Radius** — `--radius: 0.875rem` (14px cards), `--radius-panel: 1.25rem` (20px panels).
- **Elevation** — minimal: `shadow-xs` plus gold hairline edges (`oq-edge-gold`); depth
  comes from borders and the ambient aura, not heavy shadows.
- **Density** — comfortable-dense: `max-w-7xl` content, `space-y-4` sections,
  `px-4 py-6` / `md:px-6 md:py-8` page padding, sticky secondary toolbar.
- **Motion** — `oq-*` utilities; motion explains state changes (loading, success,
  count-up KPIs) rather than decorating.

## Management Center — `/management/*` and Customer Portal — `/portal/*`

Wrapper: `.oq-soft` (see `src/components/mc/mc-shell.tsx`, `src/routes/_authenticated/portal.tsx`).

- **Graphic style** — "Soft panels": every region (sidebar, header, main) is its own
  rounded floating card on a tinted page background, separated by `gap-4`.
- **Color direction** — light: warm off-white `#f6f4f0` page, white cards, navy ink
  `#17233a`, gold primary `#c9a24c`. Dark: navy `#0e1320` page, `#151b2b` cards,
  `#eef1f7` text, gold `#d8b563`.
- **Typography** — inherits the global stack (`Space Grotesk` display, `Karla` body).
- **Radius** — 20px cards (`oq-soft-card`), 18px for `rounded-lg`/`rounded-xl` inside the
  scope, 14px nav pills (`oq-pill`).
- **Elevation** — two soft shadow levels (`--oq-soft-shadow`, `--oq-soft-shadow-lift`),
  lift on hover via `oq-soft-lift`.
- **Density** — 248px sidebar with icon + label, 14/16px header bar, generous card padding.
- **Motion** — 160–200ms ease transitions on hover/lift and nav state.

## Public website — marketing routes

Wrapper: `.oix-shell` (`src/components/oix/oix-layout.tsx`).

- **Graphic style** — cinematic editorial: full-bleed gradient stages, a fixed film-grain
  noise overlay, gold shimmer accents, uppercase statement type.
- **Color direction** — dark: deep emerald `#04211a` → emerald `#0d7a5f` gradients with
  gold `#c9a84c` and cream `#f5f0e0`. Light: parchment `#f7f4ea` with muted gold `#96762a`,
  3D/grain layers dialled back for legibility.
- **Typography** — display `Space Grotesk` (uppercase, tight tracking), editorial serif
  `Instrument Serif`, body `Inter`.
- **Elevation** — glow-based (`--oix-shadow-emerald-glow`, `--oix-shadow-gold-glow`) plus
  gold hairlines, not box shadows.
- **Motion** — scroll-driven reveals and slow ambient movement.

---

## Notes

- Components read semantic tokens (`bg-background`, `text-foreground`, `border-border`,
  `--gold`, …). This is a technical convention that keeps light/dark and per-scope theming
  working — it is independent of which palette is currently active.
- `.mc-shell` (Violet Noir) is still defined in `src/styles.css` but no route uses it; it
  is legacy and not part of the current design.
