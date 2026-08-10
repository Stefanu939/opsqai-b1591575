// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { opsqaiSelfhostAliases } from "./opsqai-windows/build/vite-selfhost-stub-plugin";

const selfhostAliases = opsqaiSelfhostAliases();

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    // The Windows service tests are plain `node:test` files run by Node, not
    // Vitest — including them makes the suite fail with "no test suite found".
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.cjs"],
    },
    ...(selfhostAliases ? { resolve: { alias: selfhostAliases } } : {}),
  },
});
