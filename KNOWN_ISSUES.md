# Known Issues

_As of OPSQAI 1.0 (2026-06-25). Issues are listed in rough priority order._

## Functional

- **No redirects from legacy `/` app paths to `/app`.** Bookmarks to the old
  authenticated routes (e.g. `/chat`, `/admin/users`) will 404. Workaround:
  update bookmarks. Planned: add a small redirect table in `__root.tsx` or at
  the edge.
- **Already-installed PWAs may keep the old `start_url`.** Browsers cache the
  manifest aggressively; users who installed OPSQAI before 1.0 may still land
  on `/`. Workaround: remove and reinstall the PWA.
- **Service worker behind corporate proxies.** Some enterprise proxies strip
  the SW response. The app still works — it just loses offline shell caching.
- **iOS PWA file picker.** Uploading a PDF from the installed iOS PWA can
  occasionally fail to surface the document picker on first tap. Retry works.
  Tracking upstream.

## AI / RAG

- **Source-grounded refusal is sometimes too strict.** When a SOP uses a
  synonym the user did not, retrieval may miss and the model refuses. Mitigated
  by hybrid keyword + vector search; tuning continues.
- **Multilingual chunk overlap.** When a single SOP mixes EN and DE on the
  same page, chunk boundaries can split a clause across languages. Answers are
  still correct but excerpts may look odd.
- **Demo KB is intentionally small.** Visitors asking real operational
  questions will frequently see the refusal string. This is by design but can
  feel underwhelming on first contact.

## Admin & tenancy

- **Workspace switcher does not persist across browser restarts.** Platform
  admins must re-pick a tenant after closing the browser.
- **Invite emails depend on Supabase SMTP settings.** If a tenant has not
  configured a custom SMTP, deliverability may suffer. Documented in the admin
  guide.

## UI

- **Long source excerpts overflow on very narrow screens (< 320px).**
  Horizontal scroll is the current behavior.
- **Light/dark theme parity** is good but a few marketing illustrations are
  PNGs and look heavier in dark mode.

## Documentation

- **Legal pages are marked draft.** Privacy, Cookies, Terms, DPA, Responsible
  AI and Impressum reflect the intended posture but must be reviewed by
  counsel before being used in regulated procurement.
- **Status page** referenced in the Availability and ISO 27001 Roadmap pages
  is planned, not yet shipped.

## Build & tooling

- **`vite-plugin-pwa` warning about `globPatterns`** during build is benign
  and tracked upstream.
- **Sitemap is generated per request.** Acceptable at current traffic; will
  move to build-time for the next release.
