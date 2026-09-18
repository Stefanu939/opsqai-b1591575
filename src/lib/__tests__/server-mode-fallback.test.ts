// Regression: an on-premise install must never be treated as cloud.
//
// Older Windows services only set OPSQAI_PLATFORM_MODE / OPSQAI_DEPLOYMENT_TYPE.
// When the server ignored those, self-host-only server functions refused to run
// and the app rendered without its permissions — the "missing pages" report.
import { describe, expect, it, afterEach } from "vitest";

import { currentServerMode } from "@/lib/deployment-mode.server";

const keys = ["OPSQAI_MODE", "OPSQAI_PLATFORM_MODE", "OPSQAI_DEPLOYMENT_TYPE"] as const;

afterEach(() => {
  for (const k of keys) delete process.env[k];
});

describe("currentServerMode", () => {
  it("prefers the explicit OPSQAI_MODE", () => {
    process.env.OPSQAI_MODE = "selfhost";
    expect(currentServerMode()).toBe("selfhost");
  });

  it("falls back to the legacy platform-mode variable", () => {
    process.env.OPSQAI_PLATFORM_MODE = "selfhost";
    expect(currentServerMode()).toBe("selfhost");
  });

  it("falls back to the legacy deployment-type variable", () => {
    process.env.OPSQAI_DEPLOYMENT_TYPE = "SelfHosted";
    expect(currentServerMode()).toBe("selfhost");
  });

  it("defaults to cloud when nothing is set", () => {
    expect(currentServerMode()).toBe("mc");
  });
});
