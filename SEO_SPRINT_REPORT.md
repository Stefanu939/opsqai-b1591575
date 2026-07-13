# OPSQAI Enterprise SEO Sprint — Progress Report

Sprint plan: `.lovable/plan.md`. This file is updated at each phase checkpoint.

## Status

| Phase | Scope                                                    | Status                                                                     |
| ----- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1     | Technical SEO audit & fixes                              | ✅ Shipped                                                                 |
| 2     | Content architecture (empty shells)                      | ✅ Shipped                                                                 |
| 3     | 10 commercial landing pages                              | ✅ Shipped                                                                 |
| 4     | 12–15 seed articles (6 blog + 4 guides + 2 case studies) | ✅ Shipped                                                                 |
| 5     | hreflang, EEAT, GSC verification                         | 🟨 GSC verification meta live in code — awaiting publish, then verify call |
| 6     | Final report                                             | 🟨 Rolling update                                                          |

---

## Phase 3 — 10 commercial landing pages

Served via `/solutions/$slug` dynamic route from `src/content/solutions/data.ts`. Each page has:

- Unique `title`, `description`, `keywords`, canonical, hreflang, breadcrumbs
- `SoftwareApplication` + `BreadcrumbList` JSON-LD (+ `FAQPage` where FAQs exist)
- Executive/technical voice, real capabilities, related-links block, dual CTAs

URLs shipped:

- `/solutions/enterprise-ai-for-logistics`
- `/solutions/warehouse-ai-assistant`
- `/solutions/ai-knowledge-management`
- `/solutions/operational-knowledge-platform`
- `/solutions/warehouse-sop-software`
- `/solutions/warehouse-documentation-software`
- `/solutions/ai-for-warehouse-operations`
- `/solutions/ai-for-distribution-centers`
- `/solutions/operational-ai-platform`
- `/solutions/enterprise-knowledge-base`

`/solutions` hub now lists all ten as a browseable grid below the use-case cards.

---

## Phase 4 — Seed content

**Blog (6, approachable-professional tone)** in `src/content/blog/`:

1. What Is Enterprise Knowledge Management in 2026
2. Operational Knowledge: Turning SOPs Into Live Systems
3. Semantic Search vs Keyword Search in Warehouse Operations
4. AI Governance for Multi-Tenant SaaS
5. Source-Backed AI: Why Grounded Answers Matter
6. Building an Audit-Ready Knowledge Base

**Guides (4, HowTo schema)** in `src/content/guides/`:

1. How to Digitize Warehouse SOPs
2. How to Roll Out AI Assistants Across a Distribution Network
3. How to Prepare for ISO-Aligned Operational Audits
4. Onboarding Playbook: 30 Days to First Value with OPSQAI

**Case studies (2, clearly labelled illustrative)** in `src/content/case-studies/`:

1. Multi-Warehouse Rollout: Cutting Onboarding Time
2. SOP Digitization for a 3PL Distribution Center

Each entry auto-appears in listing pages, sitemap, and JSON-LD via `src/content/manifest.ts`.

---

## Phase 5 — Google Search Console verification

- Google Search Console connector linked (`std_01kwqkvnehffqsrfbeb5y6v083`).
- META verification token requested for `https://opsqai.de/`.
- `<meta name="google-site-verification" content="doSgT7AbYXFy4PqKvzuXoGvIlApYP44UMowQd5ChIp4" />` added to root `head()`.
- **Blocked until publish**: verification call must be made after the meta tag is live at opsqai.de. Publish the site, then I will call the verify + site-add endpoints in the next turn.

---

## Phase 1 — Technical fixes shipped

### Reusable SEO layer (new)

- **`src/lib/seo.ts`** — one helper (`pageHead`) plus JSON-LD builders (`breadcrumbLd`, `articleLd`, `howToLd`, `faqLd`, `softwareApplicationLd`) and `hreflangLinks()`. Every route calling `pageHead()` gets: unique title, description, og:_, twitter:_, canonical, hreflang (`en`/`de`/`ro`/`x-default`), optional BreadcrumbList and page-specific JSON-LD.

### Root (`src/routes/__root.tsx`)

- Removed `og:image` and `twitter:image` from root — a root-level image was overriding every leaf's share preview.
- Extended Organization JSON-LD with `logo` and `sameAs`.
- Added `WebSite` `SearchAction` pointing at `/blog?q={search_term_string}` so Google can surface a sitelinks searchbox.
- Removed root-level `og:image` and `twitter:image` (leaf routes now own their share images).

### Per-route metadata upgraded

Converted to `pageHead()` (adds twitter:\*, hreflang, BreadcrumbList, og:image, keywords):

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

| Route                 | Purpose                                   | JSON-LD                  |
| --------------------- | ----------------------------------------- | ------------------------ |
| `/resources`          | Hub linking to all content sections       | BreadcrumbList           |
| `/blog`               | Article index with empty-state roadmap    | BreadcrumbList           |
| `/blog/$slug`         | Article detail template                   | Article + BreadcrumbList |
| `/guides`             | Playbook index with empty-state roadmap   | BreadcrumbList           |
| `/guides/$slug`       | Guide detail template                     | HowTo + Article          |
| `/case-studies`       | Case-study index with empty-state roadmap | BreadcrumbList           |
| `/case-studies/$slug` | Case-study detail template                | Article + BreadcrumbList |
| `/docs`               | Documentation hub                         | BreadcrumbList           |
| `/help`               | FAQ page with 8 real answers              | FAQPage + BreadcrumbList |
| `/about`              | Company / EEAT page                       | BreadcrumbList           |

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
<link rel="alternate" hreflang="en" href="…" />
<link rel="alternate" hreflang="de" href="…" />
<link rel="alternate" hreflang="ro" href="…" />
<link rel="alternate" hreflang="x-default" href="…" />
```

Currently all four point to the English URL — the plumbing is live so translated pages plug in without a routing refactor.

---

## Structured data now on the site

| Schema                 | Where                                |
| ---------------------- | ------------------------------------ |
| Organization           | Root (Head)                          |
| WebSite + SearchAction | Root (Head)                          |
| SoftwareApplication    | `/` and `/product`                   |
| FAQPage                | `/pricing`, `/help`                  |
| BreadcrumbList         | Every non-home marketing page        |
| Article                | `/blog/$slug`, `/case-studies/$slug` |
| HowTo                  | `/guides/$slug`                      |

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
