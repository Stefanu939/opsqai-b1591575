# Plan: Website interaction, pricing, enterprise visuals, and product positioning

## Goal
Update only the public OPSQAI website so it presents one customer product — **OPSQAI Windows Self-Hosted** — while Management Center and Customer Portal are clearly supporting Cloud services. Preserve the existing Aurora Noir colors and keep blog interactions unchanged.

## 1. Remove hover effects outside the blog
- Add an explicit public-site interaction scope so all non-blog marketing pages are visually static on hover.
- Remove hover lift, color swaps, animated arrows, link transitions, card elevation, and decorative hover movement from navigation, footer, buttons, cards, and page-specific blocks.
- Keep focus-visible, keyboard navigation, cursor affordance, and click behavior intact for accessibility.
- Keep all existing hover behavior on `/blog` and blog articles.
- Do not change hover behavior in Management Center, Customer Portal, or Self-Hosted.

## 2. Make Pricing cards the action
- Convert each pricing card into one accessible clickable destination using its current action:
  - Core Platform → request pricing
  - OPSQAI Products → view products
  - Add-ons → talk to sales
  - Annual Maintenance → talk to sales
- Remove the separate action button at the bottom of each card.
- Preserve card content, featured state, keyboard activation, visible focus, and EN/DE/RO labels.
- Ensure the whole card has one semantic link and no nested interactive controls.

## 3. Replace moving 3D objects with Enterprise Live Intelligence
Use the selected direction consistently across marketing heroes:
- **Palette:** existing Balanced Aurora only (`#0A0B14`, `#171A2B`, violet, blue, ember via semantic tokens).
- **Typography:** Space Grotesk headings and DM Sans body copy for the public website.
- **Composition:** strong left-aligned message plus a restrained operational-intelligence system on the right.
- Replace cubes, rotating server monoliths, constellations, drifting fog, and high-motion particle scenes with reusable enterprise visuals built from:
  - governed data-flow lines and explicit system boundaries;
  - compact operational signal/status panels;
  - product/workspace relationships;
  - a dominant Self-Hosted node and smaller Management Center / Customer Portal support indicators;
  - static architectural geometry and data states rather than decorative 3D objects.
- Use only brief entrance/reveal motion that settles; no perpetual rotation, drifting backgrounds, or hover animation. Respect reduced-motion preferences.
- Preserve clear text space and strengthen overlays where needed for light and dark mode readability.
- Apply the system to public heroes currently using `ParticleGenesis`, `ServerMonolith`, `ModuleConstellation`, `GridFloor`, or `EmberFog`, including Home, Product, Platform, Pricing, Security, Self-Hosted, and Company where applicable.

## 4. Correct the website product model everywhere
Rewrite and align visible EN/DE/RO copy, metadata, structured data, and machine-readable summaries around this hierarchy:

```text
Customer product
└── OPSQAI Windows Self-Hosted
    ├── Core Platform
    ├── licensed OPSQAI Products
    └── optional Add-ons

OPSQAI Cloud support services — not the product
├── Management Center — OPSQAI staff control plane
└── Customer Portal — downloads, licenses, releases, support, and customer contacts
```

- Remove the misleading “one product, three surfaces” framing from Product and Home.
- Make Self-Hosted the unmistakable product in headlines, diagrams, cards, calls to action, FAQs, and product summaries.
- Describe Management Center and Customer Portal as supporting Cloud services only; never imply employees work in Cloud or that Cloud is a second delivery model.
- Preserve the multi-product domain model: Operations, Quality & Compliance, Logistics, HR, Finance, and Inventory are licensed products inside Self-Hosted — OPSQAI is not logistics-only.
- Correct SoftwareApplication structured data from a free Web application to a licensed Windows product without inventing a public price.
- Update `llms.txt` and related public summaries.

## 5. Correct public documentation contradictions
- Replace obsolete public Docker/container, multi-tenant SaaS, Redis/MinIO, and “signed container stack” descriptions with the current Windows Self-Hosted architecture.
- Align Architecture, Technical, Product, Security, Engineering, and documentation index pages with the current installer, local customer environment, local data ownership, licensing, and support-service boundaries.
- Do not alter internal deployment behavior or create new functionality; this is accuracy and presentation work only.

## 6. Keep the design source of truth current
- Update the current-design document to record:
  - no hover-driven visual effects on the public site except blog;
  - Enterprise Live Intelligence hero system;
  - website-only Space Grotesk + DM Sans typography;
  - unchanged Aurora Noir colors.
- Do not change the Self-Hosted, Management Center, or Customer Portal visual systems.

## Verification
- Review every public route in EN, DE, and RO for hover behavior and current product wording.
- Verify blog cards, links, and article interactions still retain hover behavior.
- Verify each Pricing card navigates correctly with mouse and keyboard and contains no separate CTA button.
- Check hero rendering on desktop and mobile in both light and dark mode; confirm no overlap, unreadable text, blank canvas, continuous motion, or layout shift.
- Search public-facing source for stale phrases: “three surfaces,” Cloud presented as the product, logistics-only positioning, Web/free SoftwareApplication metadata, Docker/container/multi-tenant product claims.
- Run focused tests, TypeScript validation, and production build; inspect browser console/runtime errors on key routes.

## Scope guardrails
- No color changes.
- No redesign of Management Center, Customer Portal, Self-Hosted, licensing, entitlements, or backend behavior.
- No invented product capabilities, integrations, metrics, or performance claims.
- Blog remains the sole public-site exception for hover effects.
