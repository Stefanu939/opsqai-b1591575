// Navigation model derived from the effective product configuration.
//
// One source of truth for the Self-Hosted sidebar structure:
//
//   CORE PLATFORM      always present (RBAC / license gated per item)
//   PRODUCT WORKSPACES one group per enabled OPSQAI Product
//
// Product workspaces come from `PRODUCT_WORKSPACE_NAV` below, which is keyed
// by the canonical product keys in `product-architecture.ts`. Only workspaces
// whose route actually exists may be listed here — an entry without a route
// would render a dead link. Products that are still `planned` therefore
// contribute no navigation yet; adding their routes later is the only change
// required for them to appear.

import {
  getProduct,
  resolveEffectiveConfig,
  type EffectiveConfigInput,
  type ProductKey,
} from "@/lib/product-architecture";

export interface NavEntry {
  to: string;
  label: string;
  /** Lucide icon component (kept opaque so this module stays UI-agnostic). */
  icon: unknown;
  exact?: boolean;
  /** RBAC / contextual visibility decided by the caller. */
  show?: boolean;
  /** Legacy license module key gate, or null when not license-gated. */
  module?: string | null;
  /** Capability contributed by a product; gated by product entitlement. */
  capability?: string | null;
}

export interface NavGroup {
  /** Stable id — "core" or the product key. */
  id: string;
  label: string;
  items: NavEntry[];
}

/**
 * Workspaces contributed by each product. Empty arrays are intentional: the
 * product exists in the catalogue but ships no dedicated route yet.
 */
export const PRODUCT_WORKSPACE_NAV: Record<ProductKey, NavEntry[]> = {
  opsqai_logistics: [],
  opsqai_transport: [],
  opsqai_hr: [],
  opsqai_finance: [],
  opsqai_inventory: [],
};

export interface BuildNavigationInput extends EffectiveConfigInput {
  /** Core platform items, in display order. */
  coreItems: NavEntry[];
  /** Returns true when the signed-in user may see the entry. */
  gate?: (item: NavEntry) => boolean;
  /** Label for the Core group (already localised by the caller). */
  coreLabel?: string;
}

/**
 * Build the sidebar groups for a given effective configuration. Core is never
 * removed by product configuration — only by the caller's `gate`.
 */
export function buildAppNavigation(input: BuildNavigationInput): NavGroup[] {
  const cfg = resolveEffectiveConfig(input);
  const gate = input.gate ?? (() => true);
  const visible = (items: NavEntry[]) =>
    items.filter((i) => (i.show ?? true) && gate(i));

  const groups: NavGroup[] = [
    { id: "core", label: input.coreLabel ?? "Workspace", items: visible(input.coreItems) },
  ];

  for (const key of cfg.products) {
    const product = getProduct(key);
    const items = visible(PRODUCT_WORKSPACE_NAV[key] ?? []);
    if (!product || items.length === 0) continue;
    groups.push({ id: key, label: product.label, items });
  }

  return groups.filter((g) => g.items.length > 0);
}
