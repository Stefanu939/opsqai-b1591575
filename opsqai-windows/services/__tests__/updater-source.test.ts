import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);

function tempConfig(): string {
  const dir = mkdtempSync(join(tmpdir(), "opsqai-cfg-"));
  const file = join(dir, "config.json");
  writeFileSync(file, JSON.stringify({ version: "1.3.0" }), "utf8");
  return file;
}

describe("updater update source", () => {
  it("defaults to the Management Center with the CDN manifest as fallback", () => {
    const { loadConfig } = require("../common/config.js") as {
      loadConfig: (p?: string) => {
        updates: { source: string; manifestUrl: string; automatic: boolean };
      };
    };
    const cfg = loadConfig(tempConfig());
    expect(cfg.updates.source).toBe("management-center");
    expect(cfg.updates.manifestUrl).toContain("manifest.json");
    expect(cfg.updates.automatic).toBe(true);
  });
});
