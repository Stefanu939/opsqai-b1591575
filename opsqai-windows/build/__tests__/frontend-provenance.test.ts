// frontend-provenance.mjs behaviour.
//
// Guards the Step-1 audit claim: the record proves WHICH frontend build was
// packaged, and refuses a stale/mismatching app directory.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  computeAppHashes,
  recordFrontendProvenance,
  verifyFrontendProvenance,
  assertEmbeddedIdentity,
  PROVENANCE_FILE,
} from "../frontend-provenance.mjs";

function stageApp(dir: string, { version = "1.2.3", commit = "a".repeat(40) } = {}) {
  mkdirSync(join(dir, "server"), { recursive: true });
  mkdirSync(join(dir, "public", "assets"), { recursive: true });
  writeFileSync(
    join(dir, "server", "index.mjs"),
    `export const BUILD_VERSION="${version}";export const BUILD_COMMIT="${commit}";\n`,
  );
  writeFileSync(join(dir, "public", "assets", "app.js"), "console.log('app')\n");
}

describe("frontend-provenance", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "opsqai-prov-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("computes a deterministic build hash", () => {
    stageApp(scratch);
    const a = computeAppHashes(scratch);
    const b = computeAppHashes(scratch);
    expect(a.buildHash).toBe(b.buildHash);
    expect(a.buildHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.files).toBe(2);
  });

  it("changes the hash when any public asset changes", () => {
    stageApp(scratch);
    const before = computeAppHashes(scratch).buildHash;
    writeFileSync(join(scratch, "public", "assets", "app.js"), "console.log('changed')\n");
    expect(computeAppHashes(scratch).buildHash).not.toBe(before);
  });

  it("throws when the server entry is missing", () => {
    mkdirSync(join(scratch, "server"), { recursive: true });
    expect(() => computeAppHashes(scratch)).toThrow(/missing server/);
  });

  it("records and re-verifies the shipped record", () => {
    stageApp(scratch);
    const rec = recordFrontendProvenance({
      appDir: scratch,
      version: "1.2.3",
      commit: "a".repeat(40),
    });
    expect(rec.version).toBe("1.2.3");
    const onDisk = JSON.parse(readFileSync(join(scratch, PROVENANCE_FILE), "utf8"));
    expect(onDisk.buildHash).toBe(rec.buildHash);
    expect(verifyFrontendProvenance(scratch).buildHash).toBe(rec.buildHash);
  });

  it("fails verification when an installed file was tampered with or is stale", () => {
    stageApp(scratch);
    recordFrontendProvenance({ appDir: scratch, version: "1.2.3", commit: "a".repeat(40) });
    writeFileSync(join(scratch, "public", "assets", "app.js"), "console.log('stale')\n");
    expect(() => verifyFrontendProvenance(scratch)).toThrow(/buildHash/);
  });

  it("refuses to stamp a bundle that does not embed the claimed version/commit", () => {
    stageApp(scratch, { version: "0.9.0", commit: "b".repeat(40) });
    expect(() =>
      assertEmbeddedIdentity(scratch, { version: "1.2.3", commit: "a".repeat(40) }),
    ).toThrow(/does not contain version/);
    expect(() =>
      assertEmbeddedIdentity(scratch, { version: "0.9.0", commit: "a".repeat(40) }),
    ).toThrow(/does not contain commit/);
    expect(assertEmbeddedIdentity(scratch, { version: "0.9.0", commit: "b".repeat(40) })).toBe(true);
  });
});
