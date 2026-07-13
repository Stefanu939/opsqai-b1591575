// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    ssr: {
      // pdf-lib ships ESM that imports named helpers from tslib (`import { __extends } from "tslib"`).
      // In the Cloudflare Worker SSR build these can get wrapped with CJS interop and fail at runtime
      // with `Cannot destructure property '__extends' of '__toESM(...).default' as it is undefined`.
      // Forcing them to be bundled (noExternal) keeps the named ESM imports intact.
      noExternal: ["pdf-lib", "tslib"],
    },
  },
});
