# OPSQAI Enterprise SEO Sprint — Phased Plan

## Current baseline (verified)

Marketing surface today: `/`, `/product`, `/features`, `/solutions`, `/industries`, `/pricing`, `/contact`, `/demo`, `/trust` + 11 sub-pages, `/legal/*`. Sitemap + robots.txt exist. Root `head()` has OG, Twitter, Organization + WebSite JSON-LD, fonts preconnected.

Gaps to close: no blog/resources/guides/case-studies/docs; no commercial landing pages beyond the 4 core; per-page `head()` needs audit (many likely inherit generic root meta); no BreadcrumbList, FAQPage, SoftwareApplication, Article, HowTo schema anywhere; no hreflang despite EN/DE/RO app; no IndexNow; heading hierarchy and internal-link graph unverified.

## Non-goals

- No visual redesign.
- No fabricated capabilities — every claim maps to a real OPSQAI feature already in the codebase.
- No mass-generated article dump. 12–15 seed articles, hand-crafted, all educational.

## Phase 1 — Technical SEO Audit & Fixes (foundation)

**Audit pass.** For each existing public route, verify title, description, canonical, og:*, twitter:*, H1 uniqueness, alt text, semantic landmarks. Output an internal audit table (not shipped) so fixes are traceable.

**Fixes shipped.**
- Add per-route `head()` where missing: unique title, description, og:title, og:description, og:url, canonical (leaf-only), og:type, twitter:card.
- Move any `og:image` off `__root.tsx` (currently there — overrides every child) into leaf routes; keep root for `og:type`/`og:site_name` only.
- Add JSON-LD per route type: `SoftwareApplication` on `/product` and `/features`; `FAQPage` on `/pricing` FAQ block; `BreadcrumbList` on every non-home page; keep `Organization` + `WebSite` + `SearchAction` on root.
- Fix any duplicate H1s, promote H2s where needed, add missing alt text on marketing images, add skip-to-content link.
- Extend `robots.txt` with an explicit `Sitemap:` (already there), add `Disallow: /auth`, `Disallow: /verify/`, `Disallow: /demo/app/`.
- Extend `sitemap.xml` server route to list all Phase 2/3 new URLs and to pull blog/case-study slugs from a filesystem manifest (see Phase 4).

**Performance.**
- Convert font `<link rel="stylesheet">` to `<link rel="preconnect">` (already) + non-blocking font load via `media="print" onload` swap.
- Add `fetchpriority="high"` + `preload` for the home LCP image.
- Confirm images are `.webp/.avif` where possible; lazy-load below-fold via `loading="lazy" decoding="async"`.
- Split the fonts weight axis (drop unused weights) to shrink CSS.

## Phase 2 — Content Architecture (empty shells, ready to fill)

Create the section scaffolding with the existing enterprise design language. Each section is a real route with head(), a listing page, and a detail template. No placeholder content — Phase 4 fills the seed entries; unfilled sections show a curated empty state ("Coming Q1").

New routes:
```text
/resources                → hub linking to blog, guides, case-studies, docs
/blog                     → index (list of articles)
/blog/$slug               → article detail (Article + BreadcrumbList JSON-LD)
/guides                   → index (long-form playbooks)
/guides/$slug             → HowTo / Article schema
/case-studies             → index
/case-studies/$slug       → CreativeWork + Article schema
/docs                     → documentation home (link to product docs)
/help                     → help-center hub (FAQPage schema)
```

Content storage: MDX-like TS modules under `src/content/{blog,guides,case-studies}/`. Each file exports `{ meta, body }`. Route loaders read from a generated manifest so the sitemap + listing pages stay in sync automatically (future-proof deliverable).

## Phase 3 — Commercial Landing Pages (10 pages)

Following the enterprise design of `/product` and `/features`. Each explains: problem → solution → OPSQAI capabilities → benefits → CTA. All map to real features.

```text
/solutions/enterprise-ai-for-logistics
/solutions/warehouse-ai-assistant
/solutions/ai-knowledge-management
/solutions/operational-knowledge-platform
/solutions/warehouse-sop-software
/solutions/warehouse-documentation-software
/solutions/ai-for-warehouse-operations
/solutions/ai-for-distribution-centers
/solutions/operational-ai-platform
/solutions/enterprise-knowledge-base
```

Each: unique `<title>`, description, H1, 3 body sections tied to real OPSQAI modules (Chat, SOP Generator, Knowledge Base, Academy, Audit, Compliance), `SoftwareApplication` + `BreadcrumbList` schema, related-links block into blog/guides/case-studies. Existing `/solutions` becomes a hub index.

Keyword mapping is grounded — I'll run Semrush `keyword_compare` / `serp_analysis` for the 10 target phrases before writing copy so headers and body reflect real search intent, not guesses.

## Phase 4 — Seed Content (12–15 articles, hand-crafted)

Roadmap file `src/content/roadmap.md` lists 40+ topics grouped by pillar (Enterprise AI, Knowledge Management, Warehouse AI, SOP Management, Compliance, Governance). Ship the first 12–15 across the pillars:

**Blog (educational, 800–1200 words):**
- What Is Enterprise Knowledge Management in 2026
- Operational Knowledge: Turning SOPs Into Live Systems
- Semantic Search vs Keyword Search in Warehouse Operations
- AI Governance for Multi-Tenant SaaS
- Source-Backed AI: Why Grounded Answers Matter
- Building an Audit-Ready Knowledge Base

**Guides (HowTo schema, 1500–2500 words):**
- How to Digitize Warehouse SOPs
- How to Roll Out AI Assistants Across a Distribution Network
- How to Prepare for ISO-Aligned Operational Audits
- Onboarding Playbook: 30 Days to First Value with OPSQAI

**Case-study templates (2 placeholders framed as illustrative anonymized narratives, clearly labelled — will be swapped for real customers when available):**
- Multi-Warehouse Rollout: Cutting Onboarding Time
- SOP Digitization for a 3PL Distribution Center

Every article: unique metadata, Article/HowTo JSON-LD with author + datePublished, BreadcrumbList, internal links into 3–5 landing pages and 2 sibling articles, canonical + og:*.

## Phase 5 — International SEO, EEAT, Search Console

**hreflang.** Each public route emits `<link rel="alternate" hreflang="en|de|ro|x-default">`. Since the current site content is English-only in code, the alternates initially all point to the English URL — but the plumbing ships now so translated pages plug in without refactor. Add `?lang=` search param support and a language-switcher meta helper.

**EEAT.** Add an `/about` route with company origin, an authors module (`src/content/authors/`), and author bylines on every article. Extend `/trust` hub with a visible summary block on the home page ("Enterprise-grade, GDPR, source-backed AI, role-based access, multi-tenant isolation") linking into existing trust sub-pages — surfaces existing capabilities, no new claims.

**Search Console readiness.**
- Provision GSC verification via the Google Search Console connector (META token flow) — will trigger the connector flow when the user is ready.
- Add Bing Webmaster verification meta tag.
- IndexNow: `public/<key>.txt` + a lightweight server route `/api/public/indexnow-ping` that pings IndexNow when a new blog/guide slug is added. Optional and behind a feature flag until domain is verified.
- Extend sitemap into a sitemap index once article count grows past ~50 (future-proofing hook already in the loader).

## Phase 6 — Deliverable report

At the end I produce `SEO_SPRINT_REPORT.md` at repo root with:
- Every technical fix (before/after)
- Structured data added per route
- Performance deltas (bundle size, LCP hints)
- Metadata inventory table
- New URLs shipped
- Content roadmap remaining
- Recommendations for the next sprint

## Sequencing & checkpoints

```text
Phase 1 (technical audit + head/schema/perf)     → ship, review
Phase 2 (empty content architecture routes)      → ship, review
Phase 3 (10 landing pages)                       → ship, review
Phase 4 (12–15 seed articles)                    → ship, review
Phase 5 (hreflang, EEAT, GSC, Bing, IndexNow)    → ship, review
Phase 6 (final report)                           → deliver
```

Each phase is independently shippable and reviewable. I'll pause between phases for feedback so you can steer copy tone and priority.

## What I need from you before I start

1. **Confirm phased delivery** (approve this plan) or ask me to collapse/reorder phases.
2. **Article tone**: strict technical/educational (Deloitte-style whitepapers) or approachable-professional (Notion/Linear blog tone)?
3. **Case studies**: do you have real customer stories I can anonymize, or should Phase 4 ship illustrative narratives clearly labelled as such?
4. **Search Console**: when you're ready, I'll trigger the Google connector to verify `opsqai.de` — say the word and I'll run it in Phase 5.
