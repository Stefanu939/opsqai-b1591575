// Vite plugin that redirects Cloud-only module IDs to a throwing stub
// during Self-Hosted builds.
//
// Activation: `process.env.VITE_OPSQAI_MODE === "selfhost"` (set by
// `bun run build:selfhosted`). For any other mode this plugin is a
// no-op, preserving the default Cloud build.
//
// The plugin uses `enforce: 'pre'` and hooks `resolveId` so the stub
// wins over the `@` tsconfig-paths alias contributed by
// `@lovable.dev/vite-tanstack-config`. Import specifiers matched:
//   - `@/integrations/supabase/*`      (all Cloud SDK integrations)
//   - `@/lib/providers/cloud/*`        (all Cloud provider impls)
//   - bare `@supabase/*` packages      (belt-and-suspenders — no
//                                       reachable code should import
//                                       these directly in selfhost)
//
// Exceptions (still allowed on Self-Hosted so the type system + the
// registry index barrels compile):
//   - `@/integrations/supabase/types` (type-only, stripped at build)

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..", "..");
const STUB = resolve(repoRoot, "src/lib/providers/stubs/cloud-stub.ts");

const ALLOW = new Set<string>([
  "@/integrations/supabase/types",
]);

function isCloudModule(id: string): boolean {
  if (ALLOW.has(id)) return false;
  if (id.startsWith("@/integrations/supabase/")) return true;
  if (id === "@/integrations/supabase") return true;
  if (id.startsWith("@/lib/providers/cloud/")) return true;
  if (id === "@/lib/providers/cloud") return true;
  if (id === "@supabase/supabase-js") return true;
  if (id.startsWith("@supabase/")) return true;
  return false;
}

export function opsqaiSelfhostStubPlugin(): Plugin | null {
  const mode = process.env.VITE_OPSQAI_MODE;
  if (mode !== "selfhost") return null;

  return {
    name: "opsqai:selfhost-cloud-stub",
    enforce: "pre",
    resolveId(source) {
      if (isCloudModule(source)) {
        return STUB;
      }
      return null;
    },
  };
}
