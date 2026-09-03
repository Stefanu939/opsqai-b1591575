# OPSQAI Demo Video v2 — no flicker, Self-Hosted screens, English narration, social formats

## 1. Fix the flicker (root cause)

Shortening the video would not help — the flicker comes from how the frames move, not from length.

Causes found in the current Remotion project:
- Every screenshot is continuously zoomed and panned (`ScreenCard` animates scale 1.02 → 1.10 plus a vertical pan). Captures are 2880x1800 / 2200x1520 squeezed into ~900px; sub-pixel resampling of 1px UI lines and small text each frame = shimmer.
- The background grid scrolls (1px lines moving sub-pixel).
- Three drifting radial gradients on near-black cause crawling colour banding.
- Output bitrate is low for this content (~3.8 Mbps).

Fix:
- Pre-downscale every capture once to the exact displayed pixel size (Lanczos) into `remotion/public/images/`.
- **Screenshots become fully static** — no zoom, no pan, no rotation. Only the card entrance animates (fade + slide), then it settles and does not move again. Motion comes from text, captions, accents and scene transitions.
- Freeze the background grid; slow and soften the aurora drift; add a light static dither to kill banding.
- Re-render at higher quality (CRF ~14).

## 2. More Self-Hosted content

Capture real Self-Hosted app screens (same codebase, `/app/*`) with a signed-in session for a non-privileged user, with customer names/emails replaced by neutral demo labels in the DOM before each shot:
- `/app` dashboard (KPIs, calendar, integrations, maintenance)
- `/app/chat` AI chat
- `/app/academy` (courses / lesson / certificates)
- one product workspace `/app/products/<product>/<workspace>`
- `/app/audit` or `/app/gaps` (AI audit + knowledge gaps)
- keep existing Management Center, Licensing, Installations, Portal and installer shots

New scene order (~75-85s):
```text
Title → Management Center (configure customer) → Licensing (signed entitlement)
→ Windows installer → Self-Hosted dashboard → AI chat → Academy
→ Product workspace → AI audit / knowledge gaps → Fleet + Portal
→ Flow diagram → Outro
```
Only real, existing functionality is shown — nothing invented.

## 3. English narration

- Script written per scene in English, ~140 words/min, matched to scene durations.
- Voiceover generated with Lovable AI text-to-speech (no external key needed), one file per scene, placed in `remotion/public/audio/`.
- Timing: narration lengths measured first, then scene durations set from them so voice and visuals stay in sync.
- Rendered video stays muted in Remotion; the narration is mixed in with ffmpeg (AAC) as a final step — plus large on-screen English captions so the video also works muted.

## 4. Social formats

Three exports to `/mnt/documents/`:
- `OPSQAI_Demo_v2_16x9.mp4` — 1920x1080 master (website, LinkedIn desktop)
- `OPSQAI_Demo_v2_1x1.mp4` — 1080x1080 (LinkedIn / Instagram feed)
- `OPSQAI_Demo_v2_9x16.mp4` — 1080x1920 (Reels / Stories)

The square and vertical versions are separate Remotion compositions with re-stacked layouts (screen on top, caption block below) and larger type — not a centre crop of the 16:9 master, so nothing important gets cut. Captions burned in for silent autoplay. Files kept under Instagram/LinkedIn limits.

## 5. Website — Product section

Add the 16:9 version to `public/` and embed it on `/product-overview` in a card near the hero: native `<video>` with poster frame, muted + `playsInline`, controls, `preload="metadata"`, lazy, Aurora Noir framing, localized EN/DE/RO caption line, plus `VideoObject` JSON-LD on that route. No layout redesign of the page.

## Verification

- Diff two stills a few frames apart inside a screenshot shot — must be pixel-identical.
- Spot-check 6-8 frames across all three aspect ratios.
- Check final durations, bitrates, file sizes and that audio is present and in sync.
- Load `/product-overview` and confirm the player renders and plays in EN/DE/RO without shifting the layout.

## Out of scope

- No changes to app logic, licensing, database, or the Aurora Noir palette.
- No screen recording of the real Windows installer running (it runs outside the sandbox) — installer UI shots are used.
