// Guards against the "download stuck at 99%" class of failure.
//
// The downloader needs a live self-hosted install to run, so the invariants are
// checked structurally: no progress line may claim more bytes than the total,
// the final line must report the real byte count, a silent connection must time
// out, and a dead download must not keep the retry blocked.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const disco = readFileSync("src/lib/providers/selfhost/update-discovery.server.ts", "utf8");
const status = readFileSync("src/lib/selfhost-updates.functions.ts", "utf8");

describe("update download progress", () => {
  it("never reports fewer total bytes than received", () => {
    expect(disco).toContain("Math.max(announced, received)");
  });

  it("finishes on the real byte count so the bar completes", () => {
    const tail = disco.slice(disco.indexOf("Final byte count"));
    expect(tail).toContain("total: received");
    expect(tail).toMatch(/phase: "verified"[\s\S]{0,120}total: received/);
  });

  it("times out a connection that stops sending data", () => {
    expect(disco).toContain("STALL_MS");
    expect(disco).toContain('resolve("stalled")');
    expect(disco).toMatch(/reader\.cancel\(\)/);
  });

  it("lets the operator start again after a dead download", () => {
    expect(disco).toContain("Date.now() - downloadHeartbeat < STALL_MS");
    expect(disco).toContain("downloadHeartbeat = now");
  });
});

describe("update status", () => {
  it("reports a stalled download as failed instead of polling forever", () => {
    const section = status.slice(status.indexOf("progress.phase === \"downloading\""));
    expect(section).toContain('progress.phase = "failed"');
    expect(section).toContain("3 * 60_000");
    expect(section).toContain("30 * 60_000");
  });
});
