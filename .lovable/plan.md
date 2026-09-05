# Plan: OPSQAI public website — Graphite Precision

## Goal
Rebuild the public OPSQAI website around the approved **Light Enterprise** direction: a bright, editorial system with Graphite Precision colors, Instrument Serif headings, Work Sans body copy, strong product clarity, and restrained enterprise visuals.

The public site should feel credible to DACH enterprise buyers: calm, precise, factual, easy to scan, and clearly centered on **OPSQAI Windows Self-Hosted** as the customer product.

## What the audit found
- The homepage already has the correct product story and a two-column opening section, but it spans 15 sections and reads as a long feature inventory rather than a guided enterprise narrative.
- Public pages are visually fragmented: Product, Pricing, Security, Self-Hosted, Company, and Contact use the OIX presentation system, while Support, Documentation, Blog, and Windows-only still use a more generic application-style presentation.
- Shared public foundations already exist (`OixLayout`, navigation, footer, headline, section, CTA, and enterprise-system visual), so the redesign can remain centralized rather than becoming route-specific styling.
- EN/DE/RO dictionaries exist for the main commercial pages. The Windows-only page is still binary EN/DE and needs RO parity.
- Several public routes still contain dark-only colors or old gold/violet values, especially Platform, so changing only global tokens would leave inconsistent light-mode sections.
- Every audited content route already has page metadata; the redesign will preserve and tighten this rather than replacing the SEO structure.
- The full navigation and all its destinations exist and must remain visible and interactive.

## 1. Replace only the public visual system
- Change only the `.oix-shell` public-site scope; do not alter Self-Hosted, Management Center, Customer Portal, licensing, RBAC, or product architecture.
- Implement the approved palette through public semantic tokens:
  - graphite ink `#101315`
  - secondary graphite `#252B2D`
  - mineral white `#F1F3EF`
  - operational green `#26A67A`
  - technical teal `#247D91`
- Light mode becomes the primary enterprise expression; dark mode remains complete and high-contrast rather than being removed.
- Replace the public type system with Instrument Serif for editorial headings and Work Sans for body/interface text.
- Remove Aurora glows, violet/blue ambience, oversized uppercase display treatment, decorative brackets, and cinematic empty space from the public scope.
- Use thin rules, compact radius, deliberate whitespace, subtle elevation, tabular details, and editorial asymmetry. Keep letter spacing at zero except small utilitarian labels where necessary.

## 2. Rebuild the shared public shell
- Keep the complete header: logo, Product, Overview, Platform, Self-Hosted, Security, Pricing, Company, EN/DE/RO, theme, Sign in, and proposal/contact action.
- Convert the header into a crisp light enterprise bar with a visible active state, strong keyboard focus, and a usable mobile navigation rather than hiding the main navigation without a replacement.
- Standardize public page width, section rhythm, dividers, cards, data rows, labels, CTAs, and final conversion bands through shared OIX primitives.
- Redesign the footer as a compact, high-trust enterprise index with the existing destinations and legal links.
- Keep non-blog pages calm and static; preserve blog hover interactions and all header interactions.

## 3. Make the homepage a decision journey
Recompose the existing localized content into a shorter, clearer sequence:

1. **Opening:** Windows Self-Hosted badge, decisive product statement, supporting copy, primary demo/contact action, secondary product action, and a restrained operational-system visual.
2. **Proof strip:** factual product properties only—Windows deployment, customer-owned data, governed knowledge, signed entitlements—without invented metrics or certifications.
3. **Operational problem:** why governed company knowledge needs a controlled platform.
4. **Platform model:** Core Platform → licensed Products → optional Add-ons, with the six real product domains.
5. **Inside the product:** AI Chat, Knowledge Base, Academy, Audit, compliance, collaboration, and product workspaces presented as a coherent working system rather than a wall of cards.
6. **Deployment and trust:** what stays local, what limited metadata reaches support services, and how Management Center / Customer Portal support the product.
7. **Adoption path and maturity:** concise implementation steps and verified shipping capabilities.
8. **Company credibility:** founders and company context in an editorial section.
9. **Final action:** one primary path to a qualified conversation and one secondary path to the detailed overview.

Reduce duplication between audience, differentiation, comparison, maturity, and FAQ sections. Preserve useful content but move deep detail to Product, Platform, Security, Self-Hosted, and Documentation.

## 4. Give every public page a clear job
- **Product:** concise product model and buying/activation journey; clearly distinguish the product from support services.
- **Product Overview:** detailed capabilities, working model, downloadable PDF, and existing demo video in a professional media frame.
- **Platform:** Core, six licensed Products, workspace availability, and Add-ons. Replace all remaining hardcoded dark/gold styling with the new public tokens.
- **Self-Hosted:** deployment boundary, local components, data flow, requirements, and ownership story.
- **Security:** governance, signing, identity/access, auditability, and a clear local-versus-support-service boundary.
- **Pricing:** retain the four whole-card actions, but give the pricing model stronger hierarchy, clearer inclusions, and a legible enterprise comparison/FAQ rhythm.
- **Company:** mission, founders/team, market approach, and partnership path without unsupported market claims.
- **Contact:** reduce visual friction, improve form hierarchy and trust cues, preserve routing and submission behavior.
- **Support and Documentation:** bring both into the same editorial shell; make them task-oriented rather than generic card grids.
- **Blog:** preserve its interactive reading/list behavior, but align typography, spacing, header, and footer with the new public system.
- **Windows-only:** add Romanian copy and apply the same product-boundary presentation.
- **Brand board:** keep it no-index and separate from the customer journey; update it only where old visual claims would contradict the newly implemented public identity.

## 5. Enterprise visual language
- Restyle the static `EnterpriseIntelligence` graphic into a legible system map: dominant Windows Self-Hosted product, Core/Products/Add-ons relationship, governed knowledge flow, and smaller support-service indicators.
- Use diagrams only where they explain architecture, ownership, security, or activation. No decorative 3D, aurora haze, stock imagery, unsupported dashboard mockups, or invented statistics.
- Use existing founder imagery where people and company credibility matter.
- Preserve reduced-motion support; use only short entrance/reveal motion where it helps hierarchy.

## 6. Content, language, and trust cleanup
- Preserve the canonical product truth:
  - customer product: OPSQAI Windows Self-Hosted
  - permanent Core Platform capabilities
  - licensed Products: Operations, Quality & Compliance, Logistics, HR, Finance, Inventory
  - optional Add-ons
  - Management Center: OPSQAI staff support service
  - Customer Portal: customer-contact support service
- Maintain full EN/DE/RO parity across all redesigned pages and navigation.
- Correct the stale “Bilingual UI (EN/DE)” statement to reflect EN/DE/RO.
- Review absolute wording such as “always,” “instant,” “no downtime,” comparative chatbot claims, timelines, and market figures; retain only what the codebase or product documentation supports.
- Do not add logos, customer counts, uptime figures, certifications, ROI, or performance statistics unless evidence already exists.
- Preserve one H1 per page, route-specific metadata, canonical links, structured data, accessible labels, and meaningful focus states.

## 7. Implementation structure
- Update public tokens and utilities in `src/styles.css`, and load Instrument Serif + Work Sans in the root document head.
- Refine shared public primitives first: layout, navigation, footer, buttons, headline, sections, cards/data rows, and enterprise visual.
- Then migrate routes to those primitives, avoiding page-specific raw colors and duplicate layout rules.
- Keep existing route URLs, form/API behavior, PDF download, video, language persistence, theme toggle, and legal pages intact.
- Rewrite `docs/design/current-design.md` so Graphite Precision describes only the public website while authenticated products retain their current documented design.

## Verification
- Compare the final homepage directly with the approved Light Enterprise composition at desktop and mobile sizes.
- Review Home, Product, Product Overview, Platform, Self-Hosted, Security, Pricing, Company, Contact, Support, Documentation, Blog, and Windows-only in light and dark modes.
- Check EN, DE, and RO for clipped text, missing translations, stale English, layout shifts, and product-model contradictions.
- Verify the full header, mobile navigation, language switcher, theme toggle, pricing-card destinations, contact form states, PDF download, video playback, documentation links, blog hover behavior, and keyboard focus.
- Confirm no public page has unreadable contrast, overlap, horizontal overflow, blank diagrams, or hardcoded legacy palette remnants.
- Run focused tests, TypeScript validation, production build, source-import safeguards, and browser console/runtime checks.

## Scope guardrails
- Public website only.
- No redesign or behavior change inside Management Center, Customer Portal, or Self-Hosted.
- No changes to licensing, entitlements, product/workspace definitions, authentication, or backend data.
- No invented features, integrations, metrics, certifications, customers, or performance claims.
