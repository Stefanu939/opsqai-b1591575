// Build guardrail: the packaged installer must never ship a bootstrap
// entrypoint that hardcodes an empty embedded PostgreSQL password, and the
// build must record which init.js it shipped so an install log can be matched
// against it.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  PROVENANCE_FILE,
  REQUIRED_MARKER,
  assertBootstrapPsqlFix,
  recordBootstrapProvenance,
  sha256File,
} from "../../build/bootstrap-provenance.mjs";

const REAL_INIT = join(import.meta.dirname, "..", "bootstrap", "init.js");

const FIXED = `
function pgArgs() {
  const embedded = config.database.mode === "embedded";
  const pw = embedded
    ? ${REQUIRED_MARKER} || ""
    : config.database.external.password || "";
  return { pw };
}
`;

const REGRESSED = `
function pgArgs() {
  const embedded = config.database.mode === "embedded";
  const pw = embedded ? "" : config.database.external.password;
  return { pw };
}
`;

function stage(source: string) {
  const root = mkdtempSync(join(tmpdir(), "opsqai-prov-"));
  const dir = join(root, "services", "bootstrap");
  mkdirSync(dir, { recursive: true });
  const initPath = join(dir, "init.js");
  writeFileSync(initPath, source, "utf8");
  return { root, dir, initPath };
}

describe("bootstrap provenance guardrail", () => {
  it("rejects an init.js that hardcodes an empty embedded password", () => {
    expect(() => assertBootstrapPsqlFix(REGRESSED)).toThrow(/empty embedded password/i);
  });

  it("rejects an init.js that never reads the canonical embedded password", () => {
    expect(() => assertBootstrapPsqlFix("function pgArgs() { return {}; }")).toThrow(
      /does not resolve the embedded password/i,
    );
  });

  it("accepts the fixed form", () => {
    expect(() => assertBootstrapPsqlFix(FIXED)).not.toThrow();
  });

  it("accepts the init.js currently in the repo (this is what gets packaged)", () => {
    expect(() => assertBootstrapPsqlFix(readFileSync(REAL_INIT, "utf8"), REAL_INIT)).not.toThrow();
  });

  it("fails the build instead of writing provenance for a regressed file", () => {
    const { root, initPath } = stage(REGRESSED);
    expect(() => recordBootstrapProvenance({ initPath })).toThrow(/Refusing to build/i);
    rmSync(root, { recursive: true, force: true });
  });

  it("records a sha256 that matches the staged bytes", () => {
    const { root, dir, initPath } = stage(FIXED);
    const record = recordBootstrapProvenance({ initPath, version: "1.2.3" });
    expect(record.sha256).toBe(createHash("sha256").update(FIXED).digest("hex"));
    expect(record.sha256).toBe(sha256File(initPath));
    const written = JSON.parse(readFileSync(join(dir, PROVENANCE_FILE), "utf8"));
    expect(written.sha256).toBe(record.sha256);
    expect(written.version).toBe("1.2.3");
    rmSync(root, { recursive: true, force: true });
  });

  it("matches the hash the bootstrap logs at runtime for the same bytes", () => {
    // Runtime uses crypto.createHash("sha256") over its own file; identical
    // bytes must therefore produce the identical digest.
    const runtimeStyle = createHash("sha256").update(readFileSync(REAL_INIT)).digest("hex");
    expect(sha256File(REAL_INIT)).toBe(runtimeStyle);
  });
});
