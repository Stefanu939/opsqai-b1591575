# Current design — Graphite Precision public site

This file describes the design implemented in the codebase today. It is a consistency reference, not an immutable design lock. An explicitly approved visual change replaces this description; history remains in version control.

Source of truth for values: `src/styles.css`.

## Public website

- **Scope:** `.oix-shell` only. The redesign does not alter Self-Hosted, Management Center, or Customer Portal.
- **Direction:** light-first European enterprise editorial design with quiet, structured surfaces and factual system diagrams.
- **Palette:** Graphite `#101315` / `#252B2D`, paper `#F1F3EF`, operational green `#26A67A`, and supporting teal `#247D91`. Dark mode uses the same palette with inverted foundations.
- **Typography:** Instrument Serif for editorial display headings and Work Sans for navigation, body copy, controls, and data labels.
- **Layout:** magazine-like hierarchy, restrained cards, clear section rules, generous whitespace, and compact factual labels.
- **Motion:** non-blog public pages remain calm and static. Blog links and cards retain interactive feedback. Focus indicators remain visible everywhere.
- **Navigation:** complete desktop navigation plus a mobile sheet with routes, EN/DE/RO language controls, theme control, contact, and sign-in actions.
- **Visuals:** static diagrams explain the Windows Self-Hosted product, Core, licensed Products, Add-ons, and cloud support boundaries. No decorative 3D or unsupported performance/compliance claims.

Primary public primitives:

- `src/components/oix/oix-layout.tsx`
- `src/components/oix/nav-shell.tsx`
- `src/components/oix/footer-oix.tsx`
- `src/components/oix/editorial-headline.tsx`
- `src/components/oix/section-shell.tsx`
- `src/components/oix/buttons.tsx`
- `src/components/oix/enterprise-intelligence.tsx`

## Authenticated products

Authenticated scopes retain their existing visual systems and behavior:

- Self-Hosted: `/app/*`
- Management Center: `/management/*`
- Customer Portal: `/portal/*`

Their licensing, entitlements, RBAC, product architecture, data access, and workflows are independent from the public-site visual scope.

## Product truth

- Windows Self-Hosted is the customer product.
- Core capabilities are permanent platform capabilities.
- Products are Operations, Quality & Compliance, Logistics, HR, Finance, and Inventory; availability is shown truthfully.
- Optional Add-ons are separately entitled.
- Management Center is an OPSQAI staff support service.
- Customer Portal is a support surface for designated customer contacts.
- Public content is maintained in EN, DE, and RO.