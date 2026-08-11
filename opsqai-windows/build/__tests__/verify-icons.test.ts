// verify-icons.mjs behaviour.
//
// Guards the "one approved branding source" rule: the shipped .ico must carry
// every Windows size, match the recorded pin, be mirrored byte-identically and
// actually be embedded in the produced executables.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseIco, assertSizes, sha256, exeEmbedsIcon } from "../verify-icons.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const ICON = join(ROOT, "opsqai-windows", "installer", "nsis", "assets", "opsqai.ico");
const PIN = JSON.parse(readFileSync(join(ROOT, "opsqai-windows", "build", "icon-pin.json"), "utf8"));

describe("verify-icons", () => {
  it("the shipped icon carries every required Windows size", () => {
    const entries = parseIco(readFileSync(ICON));
    expect(entries.map((e) => e.width).sort((a, b) => a - b)).toEqual([16, 24, 32, 48, 64, 128, 256]);
    expect(() => assertSizes(entries)).not.toThrow();
  });

  it("the shipped icon matches the recorded pin", () => {
    expect(sha256(readFileSync(ICON))).toBe(PIN.opsqaiIcoSha256);
  });

  it("every mirrored copy is byte-identical", () => {
    const expected = sha256(readFileSync(ICON));
    for (const copy of [
      join(ROOT, "opsqai-windows", "installer", "wizard", "assets", "opsqai.ico"),
      join(ROOT, "opsqai-windows", "desktop-shell", "assets", "opsqai.ico"),
    ]) {
      expect(sha256(readFileSync(copy))).toBe(expected);
    }
  });

  it("rejects an icon missing required sizes", () => {
    expect(() => assertSizes([{ width: 16, height: 16, image: Buffer.alloc(0) }])).toThrow(/missing required sizes/);
  });

  it("rejects a non-ico file", () => {
    expect(() => parseIco(Buffer.from("not an icon at all"))).toThrow(/not a Windows/);
  });

  it("detects an embedded icon image inside an executable-like buffer", () => {
    const entries = parseIco(readFileSync(ICON));
    const largest = [...entries].sort((a, b) => b.width - a.width)[0];
    const fakeExe = Buffer.concat([Buffer.alloc(1024, 7), largest.image, Buffer.alloc(1024, 9)]);
    expect(exeEmbedsIcon(fakeExe, entries)).toBe(largest.width);
  });

  it("reports no embedded icon when the executable carries a different icon", () => {
    const entries = parseIco(readFileSync(ICON));
    expect(exeEmbedsIcon(Buffer.alloc(4096, 3), entries)).toBe(0);
  });
});
