# Product Polish — Phase E (Final polish pass) — COMPLETE

Scope: cross-cutting quality wins on top of A–D. No new features.

## Changes

### 1. Design tokens

- Registered `--color-gold-soft` and `--color-gold-line` in the `@theme`
  block of `src/styles.css`. This turns `bg-gold-soft`, `border-gold-line`
  (already used across the dashboard, first-run wizard, and enterprise
  shells) into first-class Tailwind utilities instead of relying on
  arbitrary-value fallbacks.

### 2. Reduced motion

Both the web app (`src/styles.css`) and the Windows installer wizard
(`opsqai-windows/installer/wizard/renderer/styles.css`) now honour
`prefers-reduced-motion: reduce`:

- Animations collapsed to `0.001ms`, iteration count `1`
- Transitions collapsed to `0.001ms`
- `scroll-behavior: auto` in the app

This matters most on the installer progress screen (7+ stages, several
minutes) and the shimmer/glow effects on the MC shell.

### 3. Dashboard fixes

`src/routes/_authenticated/app.index.tsx`:

- Replaced invalid `h-4.5 w-4.5` icon sizing with valid `h-4 w-4`.
- `head()` sets a real title (`Dashboard — OPSQAI`) and `noindex,nofollow`
  so authenticated shells never leak into search.

## Verification

- `bunx tsgo --noEmit` — clean.
- Manual: gold tokens now resolve via Tailwind's generated CSS, not via
  raw CSS variables in class names.

## Product Polish track — status

| Phase | Scope                                                | Status |
| ----- | ---------------------------------------------------- | ------ |
| A     | Installer shell restyle & 9-step navigation          | ✅     |
| B     | Real IPC probes + deterministic `STAGE` markers      | ✅     |
| C     | First-run wizard enterprise restyle                  | ✅     |
| D     | Dashboard empty state (`/app/`)                      | ✅     |
| E     | Tokens, reduced motion, dashboard fixes              | ✅     |

Product Polish track closed.
