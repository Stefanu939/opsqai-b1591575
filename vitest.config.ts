import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// The Windows service tests are plain `node:test` files executed by Node, not
// Vitest — including them would fail the suite with "no test suite found".
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.cjs"],
  },
});
