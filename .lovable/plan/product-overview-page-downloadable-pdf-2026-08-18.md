# Product Overview page + downloadable PDF

A new public page that explains OPSQAI as a connected Operational Intelligence Platform, plus a real, professionally designed A4 PDF version of the same presentation.

No redesign: the page is built entirely from the existing OIX marketing shell (`OixLayout`, `NavShell`, `FooterOix`, `SectionShell`, `EditorialHeadline`, `OixButton`, `MottoBand`) and the existing dark-green/gold tokens (`--oix-gold`, `--oix-cream`, `--oix-bg-deep`, hairlines, gold brackets).

## Where it lives

- New route `/product-overview` (public). The existing `/product` page — "One product. Three surfaces." — stays exactly as it is.
- Navigation: a new item **Overview** placed right after **Product** in the OIX nav (EN "Overview" / DE "Überblick"), plus a link in the footer Platform column. Nav labels go through `src/i18n/marketing.ts`, matching the existing bilingual pattern.

## Page sections (in order)

1. **Hero** — headline "One workspace for operational knowledge, AI and intelligence.", the supporting paragraph, primary CTA "Explore the platform" (scrolls to capabilities), secondary CTA "Download Product Overview ↓" (real file download). Calm scale — reuses the existing hero rhythm, no oversized 3D takeover.
2. **What is OPSQAI** — short positioning copy plus a simple premium hub visual: OPSQAI centre with six gold-hairline nodes (Knowledge, AI, Learning, Intelligence, Management, Deployment). CSS/SVG only, not a technical diagram.
3. **Six core capabilities** — 01 Knowledge, 02 AI, 03 Learning, 04 Operational Intelligence, 05 Management, 06 Cloud or Self-Hosted. Each: number, title, short explanation, capability list, key message. Rendered on the existing hairline grid pattern used on `/product`.
4. **How OPSQAI works** — four-stage vertical/stepped flow: Company knowledge → OPSQAI knowledge layer → AI + Learning + Analysis → Employees get answers / managers see insights / gaps become visible → a stronger operational knowledge system.
5. **Use cases** — five concise cards (find the right procedure, onboard faster, find what is missing, keep knowledge healthy, better management visibility), with the explicit note that recommendations are advisory and require human review.
6. **Self-Hosted** — the emphasised section: "Your knowledge. Your infrastructure. Your AI." with seven points (local deployment, local AI, local data, offline-capable, local knowledge search, backup & recovery, offline licensing) and a link to the existing `/self-hosted` page. Neutral tone, no cloud-bashing, no absolute security or compliance claims.
7. **Platform at a glance** — six compact token columns listing the capability names.
8. **Final CTA** — "See OPSQAI in action." → "Request a demo" (`/contact`) + "Download Product Overview PDF".

Responsive: single column on mobile, 2-up on tablet, 3-up on desktop, using the existing grid/spacing utilities. Both PDF buttons stay visible and tappable on mobile.

## The PDF

- Generated as a real 8-page A4 document and shipped as a static asset at `public/OPSQAI_Product_Overview.pdf`; both buttons are plain download links (`download` attribute) so the file arrives named `OPSQAI_Product_Overview.pdf`. No print-the-webpage, no fake button.
- Pages: cover · the challenge · what is OPSQAI · what OPSQAI can do (six areas) · how it works · use cases · Self-Hosted · closing with the site's existing contact details (opsqai.de).
- Design: deep-green pages, gold rules and eyebrows, the existing OPSQAI Sovereign Mark logo from `public/brand/`, real product wording only — no placeholder text, no invented features, no internal implementation detail.

## Technical notes

- `src/routes/product-overview.tsx` with its own `head()` via the existing `pageHead()` helper (unique title, description, og:title, og:description, canonical, breadcrumbs) and a route entry in the sitemap route.
- Copy lives in `src/i18n/pages/product-overview.ts` following the existing EN/DE page-copy pattern, so the language switcher translates the page.
- PDF built by a new `scripts/gen_product_overview_pdf.py` (ReportLab, same approach as the existing deck scripts), output committed to `public/`. It renders the DejaVu Unicode font so German text is correct.
- QA: every PDF page rasterised and visually inspected for clipped text, overlap and missing logo before delivery; page checked at mobile, tablet and desktop widths.
