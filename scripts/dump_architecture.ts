// Dumps the real product architecture to JSON so the Romanian PDF generators
// can only describe features that actually exist in the code.
import {
  CORE_CAPABILITIES,
  PRODUCT_CATALOG,
  ADDON_CATALOG,
  PRODUCT_WORKSPACES,
  INCLUDED_CAPABILITY_PARENT,
  PRODUCT_ARCHITECTURE_VERSION,
} from "../src/lib/product-architecture";

const out = {
  version: PRODUCT_ARCHITECTURE_VERSION,
  core: CORE_CAPABILITIES.map((c) => ({ ...c })),
  products: PRODUCT_CATALOG.map((p) => ({ ...p, capabilities: [...p.capabilities] })),
  addons: ADDON_CATALOG.map((a) => ({ ...a })),
  includedParent: INCLUDED_CAPABILITY_PARENT,
  workspaces: PRODUCT_WORKSPACES.map((w) => ({
    key: w.key,
    product: w.product,
    label: w.label,
    description: w.description,
    route: w.route ?? null,
    status: w.status,
    capabilities: [...w.capabilities],
    coreCapabilities: [...(w.coreCapabilities ?? [])],
  })),
};

console.log(JSON.stringify(out, null, 2));
