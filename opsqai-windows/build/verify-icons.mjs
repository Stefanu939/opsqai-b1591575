#!/usr/bin/env node
/**
 * verify-icons.mjs — fail the Self-Hosted build when a stale or placeholder
 * OPSQAI icon would be shipped.
 *
 * Checks, in order:
 *   1. the source .ico parses and contains every required size
 *   2. its SHA-256 matches the pin in build/icon-pin.json (fail-closed: a
 *      regenerated icon must update the pin deliberately)
 *   3. every mirrored copy (wizard/assets, desktop-shell/assets, staged
 *      payload\assets) is byte-identical to the source
 *   4. every produced executable embeds at least one icon image whose bytes
 *      come from the source .ico
 *
 * Usage:
 *   node verify-icons.mjs --source <ico> [--copy <ico>]... [--exe <exe>]...
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REQUIRED_SIZES = [16, 24, 32, 48, 64, 128, 256];

export function parseIco(buf) {
  if (buf.length < 6) throw new Error("icon file is truncated");
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    throw new Error("not a Windows .ico file");
  }
  const count = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const off = 6 + i * 16;
    const width = buf[off] === 0 ? 256 : buf[off];
    const height = buf[off + 1] === 0 ? 256 : buf[off + 1];
    const bytes = buf.readUInt32LE(off + 8);
    const start = buf.readUInt32LE(off + 12);
    entries.push({ width, height, image: buf.subarray(start, start + bytes) });
  }
  return entries;
}

export function assertSizes(entries, required = REQUIRED_SIZES) {
  const have = new Set(entries.map((e) => e.width));
  const missing = required.filter((s) => !have.has(s));
  if (missing.length) {
    throw new Error(
      `icon is missing required sizes: ${missing.join(", ")} (has ${[...have].sort((a, b) => a - b).join(", ")})`,
    );
  }
}

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/** True when `exe` contains the raw bytes of any icon image from `entries`. */
export function exeEmbedsIcon(exeBuf, entries) {
  const ordered = [...entries].sort((a, b) => b.width - a.width);
  for (const entry of ordered) {
    if (entry.image.length > 64 && exeBuf.includes(entry.image)) {
      return entry.width;
    }
  }
  return 0;
}

function parseArgs(argv) {
  const out = { source: "", copies: [], exes: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--source") { out.source = value; i += 1; }
    else if (flag === "--copy") { out.copies.push(value); i += 1; }
    else if (flag === "--exe") { out.exes.push(value); i += 1; }
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.source) throw new Error("--source <opsqai.ico> is required");

  const here = path.dirname(fileURLToPath(import.meta.url));
  const pinPath = path.join(here, "icon-pin.json");

  const source = readFileSync(args.source);
  const entries = parseIco(source);
  assertSizes(entries);
  const hash = sha256(source);

  const pin = JSON.parse(readFileSync(pinPath, "utf8"));
  if (pin.opsqaiIcoSha256 !== hash) {
    throw new Error(
      `icon SHA-256 mismatch for ${args.source}\n  expected ${pin.opsqaiIcoSha256} (build/icon-pin.json)\n  actual   ${hash}\n` +
        "If the icon was regenerated from public/brand/sovereign-mark.svg, update icon-pin.json.",
    );
  }

  for (const copy of args.copies) {
    if (!existsSync(copy)) throw new Error(`icon copy missing: ${copy}`);
    const got = sha256(readFileSync(copy));
    if (got !== hash) {
      throw new Error(`icon copy is not byte-identical to the source: ${copy} (${got})`);
    }
    console.log(`[icons] ok copy ${copy}`);
  }

  for (const exe of args.exes) {
    if (!existsSync(exe)) throw new Error(`executable missing: ${exe}`);
    const size = exeEmbedsIcon(readFileSync(exe), entries);
    if (!size) {
      throw new Error(
        `${exe} does not embed the approved OPSQAI icon — it was packaged with a stale or different icon`,
      );
    }
    console.log(`[icons] ok embedded ${size}x${size} in ${path.basename(exe)}`);
  }

  console.log(`[icons] source ${args.source} sha256=${hash} sizes=${entries.map((e) => e.width).join(",")}`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`[icons] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
