# OPSQAI Product Architecture Refactor — Analysis & Migration Plan

Analysis only in this phase; no functional code is changed until this plan is approved.

## 1. Current architecture summary

- One flat module vocabulary: `src/lib/license-modules.ts` defines `ModuleKey` (23 keys), `LICENSE_MODULE_CATALOG` with `category` including a literal `"Basic"`, `defaultPriceCents`, `inBasic`, plus `BASIC_MODULES` (chat, kb, faq, academy, audit_log, notifications, bilingual_ui, pwa, knowledge_gaps).
- Enforcement is centralized and healthy: `src/lib/license-enforcement.server.ts` (`evaluateModuleAccess` / `requireModule` / `assertModule` / `assertModuleForCompany`), Cloud reading `public.licenses`, Self-Hosted reading the offline licensing provider.
- Role gating layered on top: `src/lib/module-access.ts` (`ROLE_MODULE_PRESETS` keyed off `BASIC_MODULES`), `module-access.server.ts`, `use-module-access.ts`, `module-access-picker.tsx`.
- A **second, conflicting** catalogue: `src/lib/feature-catalog.ts` (`FEATURE_CATALOG`, string keys, `FeatureState` incl. `enterprise`) persisted in `customer_features`, plus a **third**: `src/lib/subscription-plans.ts` (pilot/standard/business/enterprise with `modules: string[]`). Key spaces overlap but do not match (`kb` vs `knowledge_base`, `chat` vs `ai_assistant`, extra keys `ai_workspace`, `confidence_scoring`, `workspace_isolation`, `platform_admin`).
- Self-Hosted `app.modules.tsx` presents this as a catalogue with prices — the conceptually wrong "marketplace" page.

## 2. Current data model (relevant)

- `public.licenses` — `install_id`, `kind` ('install' | 'module'), `module_key`, `company_name`, `tier`, `seats`, `max_users`, `expires_at`, `maintenance_expires_at`, `revoked`, `suspended`, `owner_type`, handover fields. Unique per (install_id) for install, (install_id, module_key) for module.
- `public.companies` — includes `install_id` bridge, `subscription_plan`, `subscription_status`, `max_users`, `active`. **No business-type/company-profile column.**
- `public.customer_features` — per-customer feature-state rows keyed by `feature-catalog` keys.
- `public.selfhost_installations` — heartbeat telemetry, merged into the Installations module.
- Self-Hosted mirror: `migrations/selfhost/0011_license_mirror.sql` (+ signed install/module JWTs verified locally).
- No product/vertical entity exists anywhere today.

## 3. Terminology conflicts found

1. `category: "Basic"` + `inBasic` + `BASIC_MODULES` encode "standard platform functionality" as a commercial tier.
2. Core capabilities are currently sellable modules with prices: `rbac`, `compliance_center`, `enterprise_export`, `sop_versioning`, `internal_requests`, `reports`, `support_center`, `multi_language`, `workspace_health`, internal chat.
3. Three parallel definitions of "what a customer has" (license modules, customer_features, subscription plan modules) with no single source of truth.
4. `tier` on `licenses` overlaps `subscription_plan` on `companies`.

## 4. Proposed target architecture

New layer model, implemented as data + a resolver, not as a rewrite:

```text
CORE (always on)
  -> COMPANY PROFILE (business type: logistics, transport, hr, finance, inventory, retail, manufacturing, small_business)
  -> PRODUCTS (opsqai_logistics, opsqai_transport, opsqai_hr, opsqai_finance, opsqai_inventory)
  -> ENTITLEMENTS / ADD-ONS (licensed optional capabilities)
  -> VISIBLE WORKSPACES / NAVIGATION
```

New single source of truth in code: `src/lib/product-architecture.ts`
- `CORE_CAPABILITIES` — the ten Core items above plus chat/kb/faq/academy/audit_log/notifications/pwa-class platform features. Never priced, never activatable, never license-gated as modules; still RBAC-gated.
- `PRODUCT_CATALOG` — product key, label, domain, capabilities it contributes, availability per company profile.
- `ADDON_CATALOG` — genuinely optional commercial capabilities (e.g. `brand_center`, advanced analytics/AI add-ons) — the only priced entries.
- `COMPANY_PROFILES` — business types with their default/recommended products.
- `resolveEffectiveConfig({ profile, products, entitlements, role })` — the one function navigation, `use-module-access`, and enforcement consume.

`license-modules.ts` stays as a compatibility shim mapping legacy `ModuleKey` -> new capability/product/add-on so existing licenses, tokens and migrations keep verifying.

## 5. Database migration strategy (additive only)

Cloud:
1. `companies`: add `business_type text`, `enabled_products text[] default '{}'` (nullable, backfilled to `logistics` + `opsqai_logistics` for existing rows so nothing regresses).
2. New `public.company_products` (company_id, product_key, enabled, source, timestamps) with GRANTs + RLS for authenticated/service_role — the MC-managed truth for products.
3. `licenses`: add `kind` value `'product'` support via a new nullable `product_key text` column; existing `'install'`/`'module'` rows untouched.
4. `customer_features` stays; its rows are reinterpreted through the compatibility map, no destructive change.

Self-Hosted: new migration `0027_products_entitlements.sql` mirroring `business_type`, `enabled_products`, and product-license rows locally. Existing mirror tables and offline activation are untouched.

No table or column is dropped in this refactor.

## 6. Management Center changes

- Customer/company editor gains **Company Profile** (business type) and **Enabled Products** sections.
- Issue License form gains an optional `product` kind next to install/module; the searchable company dropdown and JWT (EdDSA) signing stay as-is.
- Feature Matrix becomes context-aware: Core section (read-only, "always included"), Products section, Optional Add-ons section — instead of one flat technical list.
- The distribution channel is unchanged: license tokens + activation bundle + heartbeat already carry the entitlement set; product keys are added to the same payload with a `license_version`-compatible additive field.

## 7. Customer Portal changes

- `portal.subscription.tsx` reframed as: OPSQAI Products included, Core included, Optional entitlements, license status/expiry/maintenance.
- Prices only ever shown for real add-ons; Core is labelled "included in OPSQAI".

## 8. Self-Hosted changes

- `app.modules.tsx` becomes **License & Entitlements**: active license, included products, included capabilities, import/paste activation bundle, refresh — existing `license-activation-panel.tsx` and offline Ed25519/JWS validation preserved verbatim.
- Sidebar/navigation generated from `resolveEffectiveConfig`: Core always visible per RBAC; product workspaces only when the product is enabled.
- Core capabilities stop being deniable by module licensing: `evaluateModuleAccess` treats Core as "install license valid -> allowed", and continues to require product/add-on entitlements for everything else. No change to install-license validity, revocation, suspension or expiry logic.

## 9. License / entitlement migration strategy

- Legacy module tokens keep verifying; the compat map routes each legacy key to Core / a product / an add-on.
- Installs with legacy licenses get `business_type=logistics` and `enabled_products=[opsqai_logistics]` by backfill, so their visible surface stays identical after the refactor.
- No customer needs a re-issued license to keep working; re-issue is only needed to *add* a new product.

## 10. Risk assessment

| Risk | Mitigation |
| --- | --- |
| Core reclassification accidentally unlocks paid surface | Core list is explicit and reviewed; add-ons remain enforced through the same `requireModule` path |
| Navigation regression on existing installs | Backfill defaults reproduce today's surface exactly; verify with the existing module-access tests |
| Migration guardrails (`verify-selfhost-migrations`, `verify-bundle`, `verify-source-imports`) failing | Self-Hosted migration references only local tables; new files import through existing stubs |
| Three catalogues drifting further | Phase 1 makes `product-architecture.ts` the only source and derives the others |
| Heartbeat/bundle payload change breaking older installs | Additive fields only, `license_version` unchanged, verifier ignores unknown fields |

## 11. Recommended implementation order

1. **Phase 1 (no behaviour change):** add `product-architecture.ts` + compatibility map + unit tests; derive `BASIC_MODULES` from `CORE_CAPABILITIES`; remove the `"Basic"` category label and prices from Core entries.
2. **Phase 2:** additive Cloud migration (business_type, enabled_products, company_products, product_key) with backfill.
3. **Phase 3:** MC UI — Company Profile, Enabled Products, context-aware Feature Matrix, product license issuance.
4. **Phase 4:** distribution — product keys in license payload, activation bundle, heartbeat; Self-Hosted mirror migration `0027`.
5. **Phase 5:** Self-Hosted — `resolveEffectiveConfig`-driven navigation, Modules page becomes License & Entitlements.
6. **Phase 6:** Customer Portal entitlement view.
7. **Phase 7:** documentation updates (product/architecture/admin books, terminology), plus RO/DE/EN strings for new UI.

Only Phase 1 is a code-only, zero-risk step; each later phase is gated on the previous one verifying green (`tsgo`, build, migration verifiers).
