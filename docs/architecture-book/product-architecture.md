# OPSQAI Product Architecture

Canonical model: `src/lib/product-architecture.ts`. Everything else
(`license-modules.ts`, `feature-catalog.ts`, `subscription-plans.ts`) is a
compatibility / commercial-packaging layer derived from it.

## Layers

| Layer | Meaning | Commercial |
| --- | --- | --- |
| OPSQAI Core | Permanent platform capabilities (AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Knowledge Gaps, RBAC, Compliance Center, Export, SOP versioning, Internal Requests, Reports, Support Center, Multi-Language, Workspace Health, Internal Chat, Notifications, PWA…) | Never sold, never toggled. Restricted only by roles/permissions. |
| OPSQAI Products | Vertical solutions (Logistics available; Transport, HR, Finance, Inventory planned) | Explicit entitlements |
| Add-ons | Optional capabilities (analytics, executive dashboard, brand center, AI SOP generator, AI workspace audit) | Explicit entitlements |

## Flow

```text
Company Profile (business type)
  -> recommends / allows OPSQAI Products
Management Center
  -> explicitly enables Products per company (company_products)
License issuance
  -> install license carries `profile` + `products` claims;
     product/add-on entitlements are also issued as signed module-kind tokens
Self-Hosted
  -> verifies offline, unions install `products` with module tokens,
     resolves visible workspaces and capabilities
```

A company profile never activates a product on its own.

## Enforcement

`src/lib/license-enforcement.server.ts` allows a Core capability whenever the
installation license is valid; products and add-ons require a matching,
non-revoked, non-suspended, unexpired entitlement row.

## Surfaces

- Management Center → company detail → **Products** tab: profile selector,
  product toggles, read-only Core list, add-on list.
- Self-Hosted → **License & Entitlements** (`/app/modules`): license status,
  included platform capabilities, enabled products, optional add-ons,
  local activation/import. No prices, no catalogue to buy from.
- Customer Portal → Subscription: read-only license + entitlement list.

## Migrations

- Cloud: `companies.business_type`, `companies.enabled_products`,
  `licenses.product_key`, `company_products`.
- Self-Hosted: `migrations/selfhost/0027_products_entitlements.sql`
  (`licenses.product_key`, `licenses.profile`, `licenses.products`).

Both are additive; older signed tokens and older installations keep working.

## User-facing terminology (final)

| Surface | Wording |
| --- | --- |
| Website `/modules` | **Platform** — Core platform / OPSQAI Products / Optional add-ons. No prices, no "Basic vs Premium". |
| Website `/pricing` | Core platform (one-time) · Products (per domain) · Optional add-ons · Annual Maintenance. |
| Self-Hosted | **License & Entitlements** (`/app/modules`). |
| Customer Portal | Subscription page: license status, read-only Core list, enabled Products, active add-ons. Localised EN/DE/RO. |

Legacy "module" vocabulary survives only in wire formats (`licenses.module_key`,
signed `kind: "module"` tokens) and in `license-modules.ts`, which is a derived
compatibility layer.

## Product Workspaces

A Product is not a renamed module. Each OPSQAI Product contributes one or more
**Product Workspaces** — logical areas of work inside its domain:

```text
PRODUCT  ->  WORKSPACE  ->  capabilities  ->  route (only when implemented)
```

Workspaces are declared in `PRODUCT_WORKSPACES` (`src/lib/product-architecture.ts`)
with a status:

- `implemented` — the workspace points at a route that exists in the app.
- `planned` — declared architecture only. It has no route and is never rendered.

A test enforces that invariant, so a planned workspace can never leak into the
UI as a dead link.

### Navigation rules

`src/lib/app-navigation.ts` derives the Self-Hosted sidebar:

1. The Core group is always built from the caller's Core items, filtered only by
   RBAC / license gates.
2. One group per **explicitly enabled** product. A company profile alone never
   produces a group — it only recommends products.
3. Only `implemented` workspaces become entries.
4. Empty groups are dropped, so a licensed product whose workspaces are still in
   preparation adds nothing to the sidebar.

### Real workspace routes

Every workspace is served by one real route family:

```text
/app/products/<product-slug>/<workspace-slug>
```

implemented by `src/routes/_authenticated/app.products.$product.$workspace.tsx`.
The page resolves the workspace from the canonical catalogue, verifies the
product is explicitly enabled by the installation license, then renders the
workspace context plus the Core capabilities relevant to that domain. Core
capabilities are only *presented* in context — they are never re-classified,
never become product features, and stay RBAC-gated.

Six products exist: Operations (cross-industry) and Logistics are `available`;
Transport, HR, Finance and Inventory are `planned` at product level but already
declare their workspace structure. A workspace never renders unless its
product is enabled — a company profile alone only recommends.

### Terminology and compatibility

Customer-facing surfaces use only **Core platform**, **Products** and
**Add-ons**. The legacy vocabulary in `license-modules.ts`,
`feature-catalog.ts` and `subscription-plans.ts` (`BASIC_MODULES`, `inBasic`,
`category: "Basic"`) survives purely as a compatibility layer for already-signed
licenses and existing `licenses.module_key` rows. It must not appear in UI copy;
use `moduleClassification()` / `classify()` instead.
