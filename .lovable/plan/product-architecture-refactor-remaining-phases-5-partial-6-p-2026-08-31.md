# Product Architecture Refactor — Remaining Phases (5 partial, 6 partial, 7, 8)

## Where things stand

Verified in the codebase:

- `src/lib/product-architecture.ts` exists as the canonical Core / Company Profile / Product / Add-on model, with `resolveEffectiveConfig` and legacy mapping, plus 16 tests. (Phase 1 done)
- Cloud migration with `companies.business_type`, `companies.enabled_products`, `company_products`, `licenses.product_key`, plus `migrations/selfhost/0027_products_entitlements.sql`. (Phase 2 done)
- Management Center company detail has a Products tab (profile, product toggles, read-only Core, add-ons). (Phase 3 largely done)
- License payload carries `profile` + `products` additively; Self-Hosted unions install products with signed module tokens; enforcement treats Core as included when the install license is valid. (Phase 4 done)
- Self-Hosted `/app/modules` is already License & Entitlements (no prices, no catalogue). (Phase 5 partly done)
- Customer Portal Subscription lists named entitlements. (Phase 6 partly done)

Remaining gaps:

- The Self-Hosted sidebar (`src/components/app/app-shell.tsx`) is a hardcoded list keyed on legacy `ModuleKey`; it is not generated from the effective configuration, and there is no product-workspace grouping.
- The Customer Portal subscription area is not yet structured as Your Platform / Core / Your Products / Optional Add-ons, and its new terminology is not in EN/DE/RO i18n.
- The public website still sells a "Basic Platform + premium modules" model: `src/i18n/pages/pricing.ts` (all three languages), `src/routes/modules.tsx` (uses `BASIC_MODULES`, "Basic modules ship with every install"), and related copy on `/pricing`, `/modules`, `/product-overview`.
- No terminology audit or consolidated architecture documentation pass yet.

## What will be built

### 1. Self-Hosted navigation from effective configuration (Phase 5)

- Add a nav-model helper in `src/lib/` that turns the effective configuration into nav groups: a Core group (always present, RBAC-filtered) and one group per enabled product with its workspaces, sourced from the product catalogue in `product-architecture.ts`.
- Refactor `app-shell.tsx` to render from that model instead of the inline array. Same routes, same icons, same visual direction — Core items keep appearing exactly as today for existing customers, so no capability disappears.
- Keep `useMyModuleAccess` gating as the RBAC filter; server-side license enforcement stays the security boundary. No route files added or removed.

### 2. Customer Portal subscription structure + i18n (Phase 6)

- Restructure `portal.subscription.tsx` into: Your OPSQAI Platform, Core Platform (included, read-only), Your Products (enabled only), Optional Add-ons (active only), License (status / expiry / maintenance / seats).
- No prices, no inactive purchasable items, no technical keys, no "Basic".
- Route all new strings through the existing i18n structure with EN, DE and RO copy.

### 3. Website alignment (Phase 7)

- Rewrite `src/i18n/pages/pricing.ts` (EN/DE/RO) around: OPSQAI Core Platform (included), Domain Products (per company profile), Optional Add-ons, Annual Maintenance. Keep the real commercial facts already stated (one-off purchase, self-hosted, maintenance) but drop "Basic Platform" and "premium modules" framing. No invented prices — where pricing is not decided, use "on request" style copy consistent across languages.
- Rework `src/routes/modules.tsx` to present the three conceptual sections (Core / Products / Add-ons) from the canonical architecture instead of `BASIC_MODULES`/`inBasic`.
- Add a products section listing only catalogue products that actually exist (Logistics available; Transport, HR, Finance, Inventory as planned), plus company profiles as solution contexts.
- Sweep `/product-overview`, `/self-hosted`, `/product`, home and documentation index copy for "Basic", marketplace and mis-labelled-as-optional Core claims; fix in all three languages. Aurora Noir visuals unchanged.

### 4. Cleanup, audit, documentation (Phase 8)

- Grep the codebase for `BASIC_MODULES`, `inBasic`, "Basic"/"Business"/"Enterprise", module catalogue and feature catalogue references; classify each as compatibility code, legitimate commercial concept, outdated terminology, or internal detail. Rename/remove only outdated terminology; leave compatibility adapters intact (tier presets stay as commercial packaging).
- Confirm no second catalogue controls access: `license-modules.ts`, `feature-catalog.ts`, `subscription-plans.ts` remain derived compatibility layers.
- Update `docs/architecture-book/product-architecture.md` and related docs to describe only the implemented architecture; remove stale module-marketplace guidance.
- Add tests for the nav-model helper (product enabled vs disabled, RBAC-hidden Core) and website-facing classification helpers.

## Verification

- `bunx tsgo --noEmit`, full vitest run, production build.
- `node opsqai-windows/build/verify-source-imports.mjs`, `verify-selfhost-migrations.mjs`, `verify-bundle.mjs` for Self-Hosted bundle hygiene.
- Walkthrough with a legacy customer shape: no products enabled -> Core navigation identical to today; Logistics enabled -> product workspaces appear; product disabled -> they disappear while Core stays.
- Screenshot check of `/pricing` and `/modules` in EN/DE/RO.

## Out of scope

No database migrations, no license payload changes, no reissue requirement, no new checkout workflow, no visual redesign.
