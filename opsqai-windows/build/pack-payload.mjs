#!/usr/bin/env node
/**
 * Payload packer for the OPSQAI Windows installer.
 *
 * Why this exists
 * ---------------
 * makensis.exe is a 32-bit process. With `SetCompressor /SOLID lzma` it keeps
 * the entire compressed data block in ONE growable memory-mapped region, and
 * once the Self-Hosted payload (app + Node + PostgreSQL + pgvector + Caddy +
 * WinSW + Electron wizard + Electron desktop shell + OllamaSetup.exe) got large
 * enough, growing that mapping fails:
 *
 *     Internal compiler error #12345: error mmapping datablock to 33556560
 *
 * So compression moves OUT of makensis: each heavy component is pre-compressed
 * here into its own .7z part, and NSIS merely STORES those opaque blobs
 * (`SetCompress off`). No solid datablock, no giant mapping, same single
 * user-facing installer. The installer extracts the parts with the bundled
 * 7zr.exe into exactly the same $INSTDIR layout as before.
 *
 * Usage:
 *   node pack-payload.mjs --payload <payloadDir> --parts <partsDir>
 *                         --nsh <parts.generated.nsh> [--archiver <7zr.exe>]
 *                         [--skip-postgres] [--skip-ollama] [--json]
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** NSIS cannot map a datablock this large; refuse long before makensis dies. */
export const MAX_PART_BYTES = 1_500 * 1024 * 1024; // 1.5 GB per part
export const MAX_TOTAL_STORED_BYTES = 1_800 * 1024 * 1024; // 1.8 GB stored total

/**
 * Heavy payload directories that get pre-compressed. Everything NOT listed
 * here (services, tools incl. 7zr.exe, winsw-configs, updater key, assets)
 * stays as plain `File /r` so the installer can extract the parts.
 */
export const PACK_COMPONENTS = [
  { name: "app", dir: "app", label: "OPSQAI application" },
  { name: "runtime", dir: "runtime", label: "Node.js runtime" },
  { name: "winsw", dir: "winsw", label: "Windows service wrappers" },
  { name: "caddy", dir: "caddy", label: "Caddy web server" },
  { name: "wizard", dir: "wizard", label: "OPSQAI Setup Wizard" },
  { name: "desktop-shell", dir: "desktop-shell", label: "OPSQAI Desktop Shell" },
  { name: "pgsql", dir: "pgsql", label: "PostgreSQL + pgvector", optional: "skipPostgres" },
  { name: "vendor", dir: "vendor", label: "local AI engine (Ollama)", optional: "skipOllama" },
];

/** Components that must be present unless their skip flag was passed. */
export function planParts({ payloadDir, exists = existsSync, flags = {} }) {
  const planned = [];
  for (const component of PACK_COMPONENTS) {
    const source = join(payloadDir, component.dir);
    if (!exists(source)) {
      if (component.optional && flags[component.optional]) continue;
      throw new Error(
        `pack-payload: required payload component "${component.dir}" is missing at ${source}`,
      );
    }
    planned.push({ ...component, source });
  }
  return planned;
}

/** Fails the build with an actionable message instead of an NSIS internal error. */
export function assertPartSizes(parts) {
  const total = parts.reduce((sum, p) => sum + p.bytes, 0);
  const oversized = parts.filter((p) => p.bytes > MAX_PART_BYTES);
  if (oversized.length > 0) {
    const list = oversized
      .map((p) => `${p.file} (${(p.bytes / 1024 / 1024).toFixed(1)} MB)`)
      .join(", ");
    throw new Error(
      `pack-payload: part exceeds the ${(MAX_PART_BYTES / 1024 / 1024).toFixed(0)} MB NSIS-safe limit: ${list}. ` +
        `Split the component into smaller parts — see docs/engineering/windows-installer-packaging.md.`,
    );
  }
  if (total > MAX_TOTAL_STORED_BYTES) {
    throw new Error(
      `pack-payload: stored payload is ${(total / 1024 / 1024).toFixed(1)} MB, over the ` +
        `${(MAX_TOTAL_STORED_BYTES / 1024 / 1024).toFixed(0)} MB NSIS-safe total. ` +
        `makensis would fail with "error mmapping datablock". ` +
        `See docs/engineering/windows-installer-packaging.md.`,
    );
  }
  return total;
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Builds one .7z part with 7zr/7z. `-mx=5` keeps CI time sane at ~same ratio.
 *
 * CRITICAL: the archive is created from the payload PARENT with the component
 * directory itself as the argument (`app`, not `*` inside `payload\app`), so
 * the archive root is `app/…`. NSIS extracts every part straight into
 * $INSTDIR; archiving the component's CONTENTS produced
 * `C:\Program Files\OPSQAI\server` / `…\node` / `…\bin` instead of
 * `app\server` / `runtime\node` / `pgsql\bin`, which every service launcher
 * and migrate.mjs expects.
 */
export function archiveComponent({ archiver, payloadDir, dir, target, run = spawnSync }) {
  const result = run(
    archiver,
    ["a", "-t7z", "-mx=5", "-mmt=on", "-y", "-r", target, dir],
    { cwd: payloadDir, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `pack-payload: ${archiver} failed with ${result.status} for ${join(payloadDir, dir)}`,
    );
  }
  return target;
}

/**
 * Reads the archive listing back and fails the build unless EVERY entry lives
 * under `<dir>/`. Without this, a packaging regression yields an installer that
 * compiles and installs but lays the payload out flat in $INSTDIR.
 */
export function verifyArchiveRoot({ archiver, target, dir, run = spawnSync }) {
  const result = run(archiver, ["l", "-ba", "-slt", target], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `pack-payload: could not list ${target} for structure validation (exit ${result.status})`,
    );
  }
  const paths = String(result.stdout || "")
    .split(/\r?\n/)
    .filter((l) => l.startsWith("Path = "))
    .map((l) => l.slice("Path = ".length).trim())
    .filter(Boolean);
  if (paths.length === 0) {
    throw new Error(`pack-payload: ${target} contains no entries — refusing to ship it`);
  }
  const prefix = `${dir}/`;
  const stray = paths.filter((p) => {
    const norm = p.replace(/\\/g, "/");
    return norm !== dir && !norm.startsWith(prefix);
  });
  if (stray.length > 0) {
    throw new Error(
      `pack-payload: ${target} must contain exactly one top-level directory "${dir}/" but also has ` +
        `${stray.slice(0, 5).join(", ")}${stray.length > 5 ? ", …" : ""}. ` +
        `NSIS extracts parts into $INSTDIR, so the archive root defines the installed layout.`,
    );
  }
  return paths.length;
}


/**
 * NSIS include emitted next to the .nsi. Stores each part uncompressed,
 * verifies its SHA-256 with certutil, then extracts it with bundled 7zr.
 */
export function renderPartsNsh(manifest) {
  const lines = [
    "; GENERATED by opsqai-windows/build/pack-payload.mjs — do not edit.",
    "; Heavy payload components are pre-compressed .7z parts, STORED (not",
    "; re-compressed) inside the installer so makensis never has to memory-map",
    "; one huge solid datablock.",
    "!define OPSQAI_PARTS_GENERATED",
    "",
    "!macro OPSQAI_STORE_PARTS",
    "  SetOutPath \"$INSTDIR\\parts\"",
    "  SetCompress off",
  ];
  for (const part of manifest.parts) {
    lines.push(`  File "${manifest.partsDir}\\${part.file}"`);
  }
  lines.push("  SetCompress auto", "!macroend", "", "!macro OPSQAI_EXTRACT_PARTS");
  for (const part of manifest.parts) {
    lines.push(
      `  !insertmacro OPSQAI_EXTRACT_PART "${part.file}" "${part.sha256}" "${part.label}"`,
    );
  }
  lines.push(
    "  ; The stored archives are no longer needed once extracted.",
    '  RMDir /r "$INSTDIR\\parts"',
    "!macroend",
    "",
  );
  return lines.join("\n");
}

export function packPayload({
  payloadDir,
  partsDir,
  nshPath,
  archiver,
  stashDir,
  flags = {},
  deps = {},
}) {
  const {
    exists = existsSync,
    mkdir = (p) => mkdirSync(p, { recursive: true }),
    rm = (p) => rmSync(p, { recursive: true, force: true }),
    move = renameSync,
    size = (p) => statSync(p).size,
    hash = sha256File,
    write = writeFileSync,
    archive = archiveComponent,
    verify = verifyArchiveRoot,
    run = spawnSync,

  } = deps;

  const stash = stashDir ?? join(partsDir, "..", "staged");
  // A previous run moved the packed components into the stash. Restore them so
  // repeated builds (for example `-SkipApp -SkipOllama`) do not re-download
  // gigabytes of runtimes.
  mkdir(stash);
  for (const component of PACK_COMPONENTS) {
    const source = join(payloadDir, component.dir);
    const stashed = join(stash, component.dir);
    if (!exists(source) && exists(stashed)) move(stashed, source);
  }

  const planned = planParts({ payloadDir, exists, flags });
  rm(partsDir);
  mkdir(partsDir);

  const parts = [];
  for (const component of planned) {
    const file = `${component.name}.7z`;
    const target = join(partsDir, file);
    archive({ archiver, payloadDir, dir: component.dir, source: component.source, target, run });
    if (!exists(target)) {
      throw new Error(`pack-payload: ${archiver} produced no archive at ${target}`);
    }
    verify({ archiver, target, dir: component.dir, run });
    const bytes = size(target);
    const sha256 = hash(target);
    write(`${target}.sha256`, `${sha256}\n`);

    parts.push({ name: component.name, file, label: component.label, bytes, sha256 });
    // Moved out of the NSIS-visible payload root: `File /r payload\*.*` must
    // not also ship the uncompressed tree. Kept in the stash so the next build
    // can reuse it instead of re-downloading.
    const stashed = join(stash, component.dir);
    rm(stashed);
    move(component.source, stashed);
  }

  const total = assertPartSizes(parts);
  const manifest = {
    generated_at: new Date().toISOString(),
    partsDir,
    total_bytes: total,
    parts,
  };
  write(join(partsDir, "parts.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  write(nshPath, renderPartsNsh(manifest));
  return manifest;
}

function parseArgs(argv) {
  const out = { flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--payload") out.payloadDir = argv[++i];
    else if (arg === "--parts") out.partsDir = argv[++i];
    else if (arg === "--nsh") out.nshPath = argv[++i];
    else if (arg === "--archiver") out.archiver = argv[++i];
    else if (arg === "--skip-postgres") out.flags.skipPostgres = true;
    else if (arg === "--skip-ollama") out.flags.skipOllama = true;
    else if (arg === "--json") out.json = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const required of ["payloadDir", "partsDir", "nshPath", "archiver"]) {
    if (!args[required]) {
      console.error(`pack-payload: missing --${required.replace("Dir", "").replace("Path", "")}`);
      process.exit(2);
    }
  }
  console.log("Packing payload parts...");
  const manifest = packPayload(args);
  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log("Payload parts (stored uncompressed inside the installer):");
    for (const part of manifest.parts) {
      console.log(`  ${part.file.padEnd(20)} ${(part.bytes / 1024 / 1024).toFixed(1).padStart(9)} MB  ${part.sha256.slice(0, 16)}…`);
    }
    const packed = new Set(manifest.parts.map((p) => p.name));
    for (const component of PACK_COMPONENTS) {
      if (!packed.has(component.name)) console.log(`  skipped: ${component.name} (${component.label})`);
    }
    console.log(`  total${" ".repeat(16)}${(manifest.total_bytes / 1024 / 1024).toFixed(1).padStart(9)} MB`);
  }

}

// NOTE: compare against pathToFileURL(...) — on Windows process.argv[1] is a
// drive path (D:\a\...) while import.meta.url is file:///D:/a/..., so a
// hand-built `file://${argv[1]}` string never matches and the CLI silently
// exits 0 without packing anything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
