# OPSQAI Enterprise SEO Sprint — Progress Report

Sprint plan: `.lovable/plan.md`. This file is updated at each phase checkpoint.

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Technical SEO audit & fixes | ✅ Shipped |
| 2 | Content architecture (empty shells) | ✅ Shipped |
| 3 | 10 commercial landing pages | ⏸ Awaiting go-ahead |
| 4 | 12–15 seed articles | ⏸ Awaiting go-ahead |
| 5 | hreflang, EEAT, GSC, Bing, IndexNow | ✅ hreflang shipped · GSC/Bing/IndexNow pending your trigger |
| 6 | Final report | 🟨 In progress (this file) |

---

## Phase 1 — Technical fixes shipped

### Reusable SEO layer (new)
- **`src/lib/seo.ts`** — one helper (`pageHead`) plus JSON-LD builders (`breadcrumbLd`, `articleLd`, `howToLd`, `faqLd`, `softwareApplicationLd`) and `hreflangLinks()`. Every route calling `pageHead()` gets: unique title, description, og:*, twitter:*, canonical, hreflang (`en`/`de`/`ro`/`x-default`), optional BreadcrumbList and page-specific JSON-LD.

### Root (`src/routes/__root.tsx`)
- Removed `og:image` and `twitter:image` from root — a root-level image was overriding every leaf's share preview.
- Extended Organization JSON-LD with `logo` and `sameAs`.
- Added `WebSite` `SearchAction` pointing at `/blog?q={search_term_string}` so Google can surface a sitelinks searchbox.
- Removed root-level `og:image` and `twitter:image` (leaf routes now own their share images).

### Per-route metadata upgraded
Converted to `pageHead()` (adds twitter:*, hreflang, BreadcrumbList, og:image, keywords):
- `/` (Home) — now emits `SoftwareApplication` JSON-LD too.
- `/product` — now emits `SoftwareApplication`.
- `/features` — BreadcrumbList.
- `/solutions` — BreadcrumbList.
- `/industries` — BreadcrumbList.
- `/pricing` — BreadcrumbList + `FAQPage` JSON-LD from 4 pricing FAQs.

### robots.txt
- Explicit disallows for `/auth`, `/verify/`, `/demo/app/`.
- Explicit `Googlebot` allow-all block.
- Explicit `GPTBot` block permitting marketing surface, disallowing `/app` and `/api/`.
- Sitemap directive retained.

### sitemap.xml (`src/routes/sitemap[.]xml.ts`)
- Now emits **~50 URLs** including all new content-architecture and landing-page URLs.
- Reads the content manifest (`BLOG_POSTS`, `GUIDES`, `CASE_STUDIES`) — new articles auto-appear when registered, no manual update required.

---

## Phase 2 — Content architecture shipped

All new routes use the enterprise design language (matching the existing OPSQAI marketing surface). Each has a real `head()`, breadcrumbs, hreflang, and the appropriate JSON-LD.

| Route | Purpose | JSON-LD |
|-------|---------|---------|
| `/resources` | Hub linking to all content sections | BreadcrumbList |
| `/blog` | Article index with empty-state roadmap | BreadcrumbList |
| `/blog/$slug` | Article detail template | Article + BreadcrumbList |
| `/guides` | Playbook index with empty-state roadmap | BreadcrumbList |
| `/guides/$slug` | Guide detail template | HowTo + Article |
| `/case-studies` | Case-study index with empty-state roadmap | BreadcrumbList |
| `/case-studies/$slug` | Case-study detail template | Article + BreadcrumbList |
| `/docs` | Documentation hub | BreadcrumbList |
| `/help` | FAQ page with 8 real answers | FAQPage + BreadcrumbList |
| `/about` | Company / EEAT page | BreadcrumbList |

### Content storage
```text
src/content/
  manifest.ts                 ← BLOG_POSTS, GUIDES, CASE_STUDIES + roadmap
  blog/_types.ts              ← BlogPost interface
  guides/_types.ts            ← Guide interface
  case-studies/_types.ts      ← CaseStudy interface
```

Adding a new article is: (1) write a `.ts` module exporting the typed content, (2) import into `manifest.ts`. Listing pages, sitemap, and JSON-LD update automatically.

### Marketing navigation updated
Footer now surfaces the full resource hub — no orphan pages. Trust Center split into its own footer column. New `/about` link.

---

## Phase 5 — International SEO shipped now

Every page that uses `pageHead()` emits:

```html
<link rel="alternate" hrefLang="en" href="…">
<link rel="alternate" hrefLang="de" href="…">
<link rel="alternate" hrefLang="ro" href="…">
<link rel="alternate" hrefLang="x-default" href="…">
```

Currently all four point to the English URL — the plumbing is live so translated pages plug in without a routing refactor.

---

## Structured data now on the site

| Schema | Where |
|--------|-------|
| Organization | Root (Head) |
| WebSite + SearchAction | Root (Head) |
| SoftwareApplication | `/` and `/product` |
| FAQPage | `/pricing`, `/help` |
| BreadcrumbList | Every non-home marketing page |
| Article | `/blog/$slug`, `/case-studies/$slug` |
| HowTo | `/guides/$slug` |

---

## Remaining work (awaiting your go-ahead)

### Phase 3 — 10 commercial landing pages
Ready to build under `/solutions/*` (see plan). Each 400–600 words, unique metadata, SoftwareApplication + BreadcrumbList, internal-link block. Grounded in real OPSQAI capabilities.

### Phase 4 — 12–15 seed articles
6 blog posts + 4 guides + 2 illustrative case studies, hand-crafted. Tone question outstanding: **executive/technical (Deloitte-style)** or **approachable-professional (Notion/Linear-style)**?

### Phase 5 (finish)
- Trigger Google Search Console site verification via the connector (say the word).
- Add Bing Webmaster verification tag (needs Bing Webmaster site-added first).
- Ship `/api/public/indexnow-ping` server route + `public/<key>.txt` once GSC is verified.

### Nice-to-haves
- Hero image conversion to AVIF/WebP (perf).
- LCP image `<link rel="preload">` on `/`.
- Skip-to-content link in root layout for accessibility.

---

## What crawlers will see immediately

- Fresh sitemap with 50+ URLs.
- Every page has unique title/description/og/twitter.
- BreadcrumbList across the marketing surface → richer SERP display.
- FAQPage on `/pricing` and `/help` → potential FAQ rich results.
- SoftwareApplication on `/` and `/product` → potential product card.
- Search Console readiness pending domain verification.

> Note: crawlers cache previously scraped pages. New titles and OG previews will roll in over the next 1–4 weeks unless forced via GSC "Request Indexing" or the Facebook/LinkedIn debuggers.
