# Current design — Aurora Noir

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

## Shared visual language (all scopes)

- **Graphic style** — "Aurora Noir": near-black navy foundations, atmospheric violet/blue
  auras, premium floating surfaces with hairline borders, abstract data-inspired line art
  and deterministic starfields, generous whitespace.
- **Color direction** — dark (default): background `#0a0b14`, surfaces
  `#111320` / `#171a2b` / `#1f2338`, violet primary `#8b6bff` (`#5b3df5` solid), blue
  secondary signal `#5b8cf7`, ember accent `#e2793f`, text `#eef0fa`.
  Light: background `#f7f8fc`, surfaces `#e9ecf6` / `#f2f4fa`, primary `#5b3df5`,
  blue `#2f6bd8`, ink `#0f1222`.
- **Typography** — display `Space Grotesk`, authenticated-product body `Inter`, public-site
  body `DM Sans`, mono `JetBrains Mono`.
- **Radius** — `--radius: 0.875rem` (14px cards), `--radius-panel: 1.25rem` (20px panels).
- **Elevation** — glow + soft shadow tokens (`--shadow-soft`, `--shadow-lift`,
  `--shadow-glow`); depth comes from hairlines and ambient glow, not heavy drop shadows.
- **Motion** — authenticated-product transitions explain state. Public marketing pages are
  deliberately static with no visual hover effects; blog cards and links remain interactive.
- **Iconography** — `lucide-react`, thin strokes, currentColor only.

Shared primitives:

- `src/components/visual/ambient-glow.tsx` — violet/blue/ember token-based auras.
- `src/components/visual/line-art.tsx` — deterministic SVG wave/fan line fields.
- `src/components/visual/starfield.tsx` — deterministic luminous point fields.
- `src/components/ui/button.tsx` — `violet`, `glass`, `subtle` variants.
- `.n` / `n-card` / `n-lift` utilities in `src/styles.css`.

## Self-Hosted — `/app/*`

Global `:root` / `.dark` tokens; module shell `src/components/app/module-page.tsx`
(glass header + ambient aura + bento content areas). Comfortable-dense: `max-w-7xl`,
`space-y-4`, `px-4 py-6` / `md:px-6 md:py-8`, sticky secondary toolbar.

## Management Center — `/management/*` and Customer Portal — `/portal/*`

Shell `src/components/mc/mc-shell.tsx` and `src/routes/_authenticated/portal.tsx` use the
`.oq-soft` scope, which now inherits the Aurora Noir tokens: floating `oq-soft-card`
regions (sidebar, header, main) separated by `gap-4`, 248px sidebar, 14/16px header bar,
soft shadow + hover lift.

## Public website — marketing routes

Wrapper `.oix-shell` (`src/components/oix/oix-layout.tsx`). Enterprise Live Intelligence:
left-aligned editorial product message paired with restrained, static operational diagrams
made from governed data lines, status panels, concentric system rings and a central Windows
Self-Hosted core. No cubes, perpetual rotation, drifting particles or decorative hover motion.
Marketing tokens retain the legacy `--oix-*` names mapped to Aurora Noir values.

---

## Notes

- Components read semantic tokens (`bg-background`, `text-foreground`, `border-border`, …).
  This is a technical convention that keeps light/dark and per-scope theming working — it
  is independent of which palette is currently active.
- Languages: EN / DE / RO. Common app UI, marketing copy and every per-page
  dictionary in `src/i18n/pages/*` have full RO translations.
