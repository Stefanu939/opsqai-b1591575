// Vite config helper that redirects Cloud-only module IDs to a
// throwing stub during Self-Hosted builds.
//
// Activation: `process.env.VITE_OPSQAI_MODE === "selfhost"`.
// Returns `resolve.alias` entries — aliases run before any plugin
// resolveId hook, guaranteeing precedence over tsconfig-paths.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AliasOptions } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..", "..");
const STUB = resolve(repoRoot, "src/lib/providers/stubs/cloud-stub.ts");

/**
 * Returns Vite alias entries for Self-Hosted builds. Returns `null` in
 * every other mode so the Cloud build is unaffected.
 *
 * Allowed pass-through (still resolved normally on Self-Hosted):
 *   - `@/integrations/supabase/types` — type-only, stripped at build.
 */
export function opsqaiSelfhostAliases(): AliasOptions | null {
  const mode = process.env.VITE_OPSQAI_MODE;
  if (mode !== "selfhost") return null;

  return [
    // Type-only pass-through must come FIRST — Vite matches in order.
    { find: /^@\/integrations\/supabase\/types$/, replacement: "@/integrations/supabase/types" },
    // Cloud SDK integration module tree.
    { find: /^@\/integrations\/supabase(\/.*)?$/, replacement: STUB },
    // Cloud provider implementations.
    { find: /^@\/lib\/providers\/cloud(\/.*)?$/, replacement: STUB },
    // Belt-and-suspenders: any reachable @supabase/* bare import.
    { find: /^@supabase\/.*/, replacement: STUB },
  ];
}
