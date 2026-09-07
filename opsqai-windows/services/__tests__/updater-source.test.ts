import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("updater update source", () => {
  it("defaults to the Management Center with the CDN manifest as fallback", () => {
    const { loadConfig } = require("../common/config.js") as {
      loadConfig: (p?: string) => {
        updates: { source: string; manifestUrl: string; automatic: boolean };
      };
    };
    const cfg = loadConfig("/nonexistent/opsqai-config.json");
    expect(cfg.updates.source).toBe("management-center");
    expect(cfg.updates.manifestUrl).toContain("manifest.json");
    expect(cfg.updates.automatic).toBe(true);
  });

  it("exposes the Management Center descriptor and command readers", () => {
    const mod = require("../updater/index.js") as {
      _internal: Record<string, unknown>;
    };
    expect(typeof mod._internal["readAvailable"]).toBe("function");
    expect(typeof mod._internal["takeCommand"]).toBe("function");
    // A missing descriptor must not throw — it simply means "nothing offered".
    expect((mod._internal["readAvailable"] as () => unknown)()).toBeNull();
    expect((mod._internal["takeCommand"] as () => unknown)()).toBeNull();
  });
});
