// Navigation model derived from the effective product configuration.
//
// One source of truth for the Self-Hosted sidebar structure:
//
//   CORE PLATFORM      always present (RBAC / license gated per item)
//   PRODUCT WORKSPACES one group per enabled OPSQAI Product
//
// Product groups are derived from `PRODUCT_WORKSPACES` in
// `product-architecture.ts`. Only workspaces marked `implemented` — which by
// definition carry a real route — become navigation entries, so a declared
// but unbuilt workspace can never render as a dead link. Products whose
// workspaces are all still planned contribute no group at all.

import {
  resolveProductWorkspaces,
  type EffectiveConfigInput,
  type ProductKey,
  type ProductWorkspace,
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

export interface BuildNavigationInput extends EffectiveConfigInput {
  /** Core platform items, in display order. */
  coreItems: NavEntry[];
  /** Returns true when the signed-in user may see the entry. */
  gate?: (item: NavEntry) => boolean;
  /** Label for the Core group (already localised by the caller). */
  coreLabel?: string;
  /** Resolves a workspace icon name to the caller's icon component. */
  resolveIcon?: (iconName: string) => unknown;
}

function workspaceToEntry(
  w: ProductWorkspace,
  resolveIcon?: (n: string) => unknown,
): NavEntry {
  return {
    to: w.route!,
    label: w.label,
    icon: resolveIcon ? resolveIcon(w.icon) : w.icon,
    module: null,
    capability: w.capabilities[0] ?? null,
  };
}

/**
 * Build the sidebar groups for a given effective configuration. Core is never
 * removed by product configuration — only by the caller's `gate`.
 */
export function buildAppNavigation(input: BuildNavigationInput): NavGroup[] {
  const gate = input.gate ?? (() => true);
  const visible = (items: NavEntry[]) =>
    items.filter((i) => (i.show ?? true) && gate(i));

  const groups: NavGroup[] = [
    { id: "core", label: input.coreLabel ?? "Workspace", items: visible(input.coreItems) },
  ];

  for (const resolved of resolveProductWorkspaces(input)) {
    const items = visible(
      resolved.implemented.map((w) => workspaceToEntry(w, input.resolveIcon)),
    );
    if (items.length === 0) continue;
    groups.push({ id: resolved.product.key, label: resolved.product.label, items });
  }

  return groups.filter((g) => g.items.length > 0);
}

/**
 * Product keys that currently contribute navigation. Useful for tests and for
 * surfaces that want to explain "licensed but not yet shipped".
 */
export function productsWithNavigation(input: EffectiveConfigInput = {}): ProductKey[] {
  return resolveProductWorkspaces(input)
    .filter((r) => r.implemented.length > 0)
    .map((r) => r.product.key);
}
