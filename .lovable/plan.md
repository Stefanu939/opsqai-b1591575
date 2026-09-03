# Fix the flicker in OPSQAI_Demo.mp4

Shortening the video would not help — the flicker is not a length problem. It comes from how the screenshots and background move.

## What causes it

1. **Every screenshot is continuously zoomed and panned** (`ScreenCard` animates `scale` 1.02 → 1.10 and a vertical pan on each frame). The captures are 2880x1800 and 2200x1520, squeezed into ~880-960px wide frames. Screenshots of UI are full of 1px lines and small text; when the scale changes by a fraction of a pixel each frame, those lines jump between pixel rows — classic shimmer/flicker.
2. **The background grid scrolls** (72px grid translated over 1700 frames) — 1px lines moving sub-pixel flicker the same way.
3. **Three drifting radial gradients** on a near-black background produce colour banding that crawls frame to frame.
4. **Output bitrate is low for this content** (~3.8 Mbps at CRF 18); fine text plus moving gradients push the encoder into visible noise on flat dark areas.

## The fix

**Screenshots (main cause)**
- Pre-downscale each capture once to the exact pixel size it is displayed at (Lanczos, written to `remotion/public/images/`), so the browser no longer resamples a 2880px image every frame.
- Remove the continuous zoom/pan entirely: each screenshot is fully static for the whole shot. Only the card entrance stays animated (fade + slide in, then it settles and does not move).
- Keep the window-frame card, with rotation removed (a rotated bitmap also resamples each frame).


**Background**
- Freeze the grid (no translate) and lower its opacity slightly.
- Reduce the aurora drift amplitude and slow it down so gradient banding does not crawl; keep the same Aurora Noir colours.
- Add a very light static noise/dither layer to break banding on the dark background.

**Encoding**
- Re-render with a higher quality target (CRF ~14 and `x264` tuning suited to flat gradients) so the encoder stops introducing its own shimmer.

## Verification

- Render a still pair a few frames apart in the middle of a screenshot shot and diff them — the screen content should be pixel-identical (or move by whole pixels only).
- Re-render the full MP4 to `/mnt/documents/OPSQAI_Demo_v2.mp4` and check size/bitrate plus 4-5 spot frames.

## Out of scope

- No changes to app code, styling, licensing, or the database. Length, scene order, captions and Aurora Noir look stay as they are.
