// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { opsqaiSelfhostAliases } from "./opsqai-windows/build/vite-selfhost-stub-plugin";
import { resolve as resolvePath } from "node:path";

const selfhostAliases = opsqaiSelfhostAliases();

// pdf-lib imports helpers from tslib 1.x. In the server bundle its CommonJS
// build is wrapped so that `.default` is undefined ("Cannot destructure
// property '__extends'"). Point pdf-lib's tslib at the ES module build instead.
const pdfLibTslib = {
  name: "opsqai-pdf-lib-tslib-esm",
  enforce: "pre" as const,
  resolveId(id: string, importer?: string) {
    if (id === "tslib" && importer && /[\\/](pdf-lib|@pdf-lib)[\\/]/.test(importer)) {
      return resolvePath(process.cwd(), "node_modules/tslib/tslib.es6.js");
    }
    return null;
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [pdfLibTslib, mcpPlugin()],
    ...(selfhostAliases ? { resolve: { alias: selfhostAliases } } : {}),
  },
});
