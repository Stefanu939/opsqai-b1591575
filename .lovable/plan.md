## Problem

The installed desktop app should open directly on the Self-Hosted **login screen** and, after sign-in, land on the **modules dashboard** — like a real desktop program (SAP, etc.), never showing the marketing site.

Currently it *technically* does that, but through a client-side redirect in `src/routes/index.tsx` — so the marketing hero flashes for ~200-400ms before jumping to `/auth`. That's why it still feels "web-ish".

## Goal

Zero flash. When the user double-clicks OPSQAI on the desktop:
- splash → health-gate → **login screen** (Self-Hosted audience, pre-selected)
- after login → **`/app`** (the modules dashboard, gated by the installed license)

Marketing pages (`/`, `/self-hosted`, `/pricing`, etc.) must never render inside the desktop shell.

## Changes

### 1. Load the auth URL directly in the desktop shell
`opsqai-windows/desktop-shell/main.cjs`

- Change `APP_URL` from `https://localhost/` to `https://localhost/auth?audience=company`.
- Keep `HEALTH_URL` unchanged — health gate stays on `/health`.
- Result: the very first page painted inside the Electron window is the login screen. No marketing route ever mounts.

### 2. Belt-and-braces guard on the home route
`src/routes/index.tsx`

- Move the self-hosted check out of `useEffect` and into the top of `Home()`:
  - If `VITE_OPSQAI_MODE === "selfhost"` (or `window.__OPSQAI_MODE__`), render `null` (or a minimal splash div) and trigger the redirect synchronously — never render the marketing sections.
- This protects against a user manually typing `https://localhost/` in the address bar, or a stale bookmark: still lands on login, still no flash.

### 3. Confirm the post-login landing
`src/routes/auth.tsx` already redirects to `/app` on selfhost sign-in.
`src/routes/_authenticated/app.index.tsx` is the modules dashboard, gated via `use-platform-capabilities`.

No code change needed here — just verify after (1) + (2) that the flow ends on the modules screen with only the licensed modules visible.

### 4. Verification

After building the Self-Hosted bundle + desktop shell:
- Launch `OPSQAI.exe` cold → expect: splash → login screen (no marketing frame anywhere).
- Sign in with the admin seeded during install → expect: `/app` with modules from the installed license.
- Open Task Manager, close the app, relaunch → same clean boot.

## Out of scope

- Changing the `_authenticated` gate.
- Any change to `/auth` styling (it already looks correct in the screenshots).
- Marketing site behavior on the public web build (Cloud) — this only touches the selfhost path.
