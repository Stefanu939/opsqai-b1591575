# Investor LinkedIn posts + an /invest page + contact email cleanup

## 1. New investor page: /invest

A new public page built on the current Aurora Noir look, in English, German and Romanian, using only material from the uploaded investor documents:

- Thesis: industrial and logistics companies will not put operational knowledge into a public AI cloud; OPSQAI is the platform they own and install themselves.
- Stage: functional, pre-pilot, founder with 10 years of logistics experience, initial validation with students in Romania.
- Commercial model: EUR 12,000 one-time implementation, EUR 2,000-6,000 per module, maintenance from EUR 500/month.
- Plan: 10 customers / EUR 260,000 in 2027, 20 / EUR 580,000 in 2028, 30 / EUR 960,000 in 2029.
- Round: EUR 100,000 sought, with the use-of-funds split from the financial model.
- Why sovereign: Windows self-hosted, single-tenant, offline capable, role-based access, grounded AI with citations.
- Single call to action: email baristefan@opsqai.de (mailto link, subject prefilled).

Every number is labelled as a founder target or indicative figure, not a promise. The page is linked from the site navigation footer area and added to the sitemap, with its own title/description/social preview text.

## 2. Contact email

`baristefan@opsqai.de` becomes the primary contact address everywhere on the public site (contact page general channel, pilot and discovery calls to action, product overview, footer, email templates' contact field, llms.txt). Functional addresses that must stay separate (support, security, privacy) are kept, but the general/investor/sales contact is always baristefan@opsqai.de.

## 3. Page check

Walk the public pages (home, discovery, product, product-overview, modules, solutions, pricing, pilot, company, compare, security, support, contact, resources, documentation, blog) and fix what is actually wrong: stale contact addresses, dead or wrong links, missing or duplicated page titles/descriptions, and any text that contradicts the current problem-first positioning. Findings that are large enough to be their own project are reported instead of silently rewritten.

## 4. Three scheduled LinkedIn posts

Investor-facing, alternating language, all pointing to opsqai.de/invest and baristefan@opsqai.de, scheduled at 08:00 Romania/Germany time on three consecutive days starting tomorrow:

1. Day 1 - English, "The knowledge will not leave the building": the sovereignty thesis, what is already built, EUR 100,000 round, invitation to investors and design partners.
2. Day 2 - German, "Warum wir nicht in der Cloud bauen": same thesis for the DACH audience, self-hosted on Windows, pricing model and revenue plan, round.
3. Day 3 - English, "The numbers behind a pre-pilot company": 2027-2029 targets, unit economics per customer, use of the EUR 100,000, honest pre-pilot status.

Each post is a short hook, single-thought lines, the figures, one link, one call to action, and 3-5 hashtags, plus a first comment with the direct email. They go into the existing scheduled-posts queue that already publishes to LinkedIn automatically; you will see the exact texts here before the first one goes out.

## Technical notes

- New route `src/routes/invest.tsx` with localized copy in `src/i18n/pages/invest.ts`, added to nav and `sitemap[.]xml.ts`.
- Email change touches `src/routes/contact.tsx`, marketing/i18n copy, `src/lib/email-templates/_brand.ts` contact field, `public/llms.txt`.
- Posts inserted into `social_scheduled_posts` (status `scheduled`, network `linkedin`, with `first_comment`), published by the existing `/api/public/v1/social/publish-due` cron route. Automatic publishing requires the current site to be published so the route and cron token match.

## Not included

- No changes to Management Center, Self-Hosted or licensing behaviour.
- No new PDFs; the uploaded investor documents are used as source material only.
