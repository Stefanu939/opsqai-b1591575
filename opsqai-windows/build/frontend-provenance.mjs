// Build-time provenance for the built frontend/server app payload.
//
// Companion to bootstrap-provenance.mjs, which does the same job for
// services/bootstrap/init.js. This one answers: "which frontend build is the
// installed EXE actually running?"
//
// It hashes the built server entry plus a manifest of every public asset, and
// writes payload\app\build-provenance.json:
//
//   { version, commit, buildHash, serverEntrySha256, publicManifestSha256,
//     files, generatedAt }
//
// The record is copied verbatim into the install directory. At runtime the
// platform reads it (src/lib/platform/build-provenance.server.ts) and reports
// it through /api/public/health and the app shell. verify-install-layout.ps1
// recomputes the hash from the installed files and refuses a mismatch.
//
// Pure functions are unit-tested (see __tests__/frontend-provenance.test.ts).

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const PROVENANCE_FILE = "build-provenance.json";
export const SERVER_ENTRY = join("server", "index.mjs");
export const PUBLIC_DIR = "public";

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/** Deterministic, recursive, sorted list of files under `dir` (POSIX-style keys). */
export function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const abs = join(current, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else out.push(abs);
    }
  };
  walk(dir);
  return out
    .map((abs) => ({ path: relative(dir, abs).split(sep).join("/"), abs }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * Build the deterministic manifest text for a directory: one
 * "<sha256>  <relative/path>" line per file, sorted by path.
 */
export function manifestText(dir) {
  return listFiles(dir)
    .map((f) => `${sha256(readFileSync(f.abs))}  ${f.path}`)
    .join("\n");
}

/**
 * Compute the provenance hashes for a staged app directory containing
 * `server/index.mjs` and (optionally) `public/`.
 */
export function computeAppHashes(appDir) {
  const entry = join(appDir, SERVER_ENTRY);
  if (!existsSync(entry)) {
    throw new Error(`frontend-provenance: missing ${SERVER_ENTRY} under ${appDir}`);
  }
  const serverManifest = manifestText(join(appDir, "server"));
  const publicManifest = manifestText(join(appDir, PUBLIC_DIR));
  const serverEntrySha256 = sha256(readFileSync(entry));
  const publicManifestSha256 = sha256(Buffer.from(publicManifest, "utf8"));
  const serverManifestSha256 = sha256(Buffer.from(serverManifest, "utf8"));
  const buildHash = sha256(
    Buffer.from(
      [
        `server-entry:${serverEntrySha256}`,
        `server-manifest:${serverManifestSha256}`,
        `public-manifest:${publicManifestSha256}`,
      ].join("\n"),
      "utf8",
    ),
  );
  return {
    buildHash,
    serverEntrySha256,
    serverManifestSha256,
    publicManifestSha256,
    files: listFiles(join(appDir, "server")).length + listFiles(join(appDir, PUBLIC_DIR)).length,
  };
}

/**
 * Assert the built server bundle really embeds the version/commit we claim.
 * Catches the case where build.ps1 stamped env vars but the bundle was reused
 * from an earlier build (the exact "stale artifact" failure mode).
 */
export function assertEmbeddedIdentity(appDir, { version, commit }) {
  const bundle = manifestBundleText(appDir);
  if (version && !bundle.includes(version)) {
    throw new Error(
      `frontend-provenance: built server bundle does not contain version "${version}" — ` +
        `the staged app is not the build that was just stamped.`,
    );
  }
  if (commit && commit !== "unknown" && !bundle.includes(commit)) {
    throw new Error(
      `frontend-provenance: built server bundle does not contain commit "${commit}" — ` +
        `the staged app is stale.`,
    );
  }
  return true;
}

/** Concatenated text of the server bundle files (used for identity assertions). */
export function manifestBundleText(appDir) {
  return listFiles(join(appDir, "server"))
    .filter((f) => /\.(mjs|js|cjs|json|html)$/.test(f.path))
    .map((f) => readFileSync(f.abs, "utf8"))
    .join("\n");
}

export function recordFrontendProvenance({ appDir, version = "0.0.0-dev", commit = null, strict = true }) {
  const hashes = computeAppHashes(appDir);
  if (strict) assertEmbeddedIdentity(appDir, { version, commit });
  const record = {
    version,
    commit: commit ?? "unknown",
    ...hashes,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(appDir, PROVENANCE_FILE), JSON.stringify(record, null, 2) + "\n");
  return record;
}

/** Recompute and compare against the shipped record. Throws on mismatch. */
export function verifyFrontendProvenance(appDir) {
  const path = join(appDir, PROVENANCE_FILE);
  if (!existsSync(path)) throw new Error(`frontend-provenance: missing ${path}`);
  const record = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  const hashes = computeAppHashes(appDir);
  if (hashes.buildHash !== record.buildHash) {
    throw new Error(
      `frontend-provenance: installed app buildHash=${hashes.buildHash} but record says ${record.buildHash}`,
    );
  }
  return record;
}

function argOf(name, dflt = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const appDir = argOf("app");
    if (!appDir) throw new Error("frontend-provenance: --app <path to staged app dir> is required");
    if (process.argv.includes("--verify")) {
      const rec = verifyFrontendProvenance(appDir);
      console.log(`[verify] frontend buildHash=${rec.buildHash} version=${rec.version} commit=${rec.commit}`);
    } else {
      const rec = recordFrontendProvenance({
        appDir,
        version: argOf("version", "0.0.0-dev"),
        commit: argOf("commit", null) ?? null,
        strict: !process.argv.includes("--no-strict"),
      });
      console.log(
        `[build] frontend buildHash=${rec.buildHash} version=${rec.version} commit=${rec.commit} ` +
          `serverEntry=${rec.serverEntrySha256} files=${rec.files}`,
      );
    }
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
