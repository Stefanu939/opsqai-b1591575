# OPSQAI Demo Video (~60s, English)

A downloadable 1080p MP4 walkthrough showing how a customer gets licensed and what each surface looks like: Management Center, Customer Portal, Self-Hosted app.

## What the video shows

```text
[0-6s]   Title: OPSQAI — Operational AI Platform
[6-18s]  Management Center: create customer, pick Company Profile, enable Products
[18-30s] Licensing: issue signed license (Ed25519 / JWT) + entitlement payload
[30-42s] Customer Portal: license status, Core capabilities, active Products
[42-54s] Self-Hosted app: dashboard, chat, product workspaces appear per entitlement
[54-60s] Closing card: Management Center decides -> License distributes -> Self-Hosted renders
```

Style stays on the active Aurora Noir direction (navy near-black, violet/blue aurora, Space Grotesk display, Inter body). No voiceover; on-screen English captions only, motion-graphics pacing with real UI screenshots composited into device frames with parallax and staggered reveals.

## How screens are captured

1. Mint a browser session for a non-privileged auth user, sign in and capture real screens at 1280x1800:
  - `/management/customers` (New Customer dialog with Company Profile + product switches)
  - `/management/licenses` (Customers & Entitlements panel, Issue License)
  - `/management/installations`
  - `/portal` license & entitlements view
  - `/app` dashboard, `/app/chat`, one `/app/products/<product>/<workspace>` workspace
2. Neutralize data: before screenshotting, replace real customer names/emails in the rendered DOM with neutral demo labels ("Nordwind Logistik GmbH", "[demo@example.com](mailto:demo@example.com)") via a page script, so no real customer data appears in the video. Screenshots only — no database writes.
3. Screenshots go to `remotion/public/images/`.

## Video build

- New `remotion/` project in the repo (version-controlled scenes), Remotion + Tailwind, 1920x1080 @ 30fps, 1800 frames.
- `src/scenes/` — one file per scene above; shared persistent aurora background + accent layers; `TransitionSeries` with 1-2 reused transitions.
- All motion frame-based (`useCurrentFrame`, `interpolate`, `spring`); no CSS animation.
- Rendered via `scripts/render-remotion.mjs` (chrome-for-testing, muted, concurrency 1) to `/mnt/documents/OPSQAI_Demo.mp4`, delivered as a downloadable artifact in chat.
- Frame spot-checks at each scene start before final render.
- Voice over the context 

## Out of scope

- No changes to app code, styling, licensing logic, or database.
- No Windows installer screen recording (installer runs outside the sandbox); the Self-Hosted section uses the app UI as served by the same codebase.