// Build-time provenance for the bootstrap entrypoint.
//
// A source-level fix is worthless if the packaged installer ships an older
// copy of services/bootstrap/init.js. This module:
//
//   1. asserts the staged init.js contains the embedded-password resolution
//      (and NOT the regressed empty-password form),
//   2. records its SHA-256 next to it as build-provenance.json so the
//      installed layout, the runtime log line and the build output can all be
//      compared byte-for-byte.
//
// Invoked by build\build.ps1; the pure functions are unit-tested.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/** Marker proving the embedded branch reads the canonical config password. */
export const REQUIRED_MARKER = "config.database.embedded?.password";
/** The regressed form that produced `fe_sendauth: no password supplied`. */
export const FORBIDDEN_PATTERN = /const\s+pw\s*=\s*embedded\s*\?\s*""/;

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256File(file) {
  return sha256(readFileSync(file));
}

/**
 * Throws when `source` (contents of init.js) would ship the psql-credential
 * regression. Returns the source unchanged so callers can chain.
 */
export function assertBootstrapPsqlFix(source, label = "services/bootstrap/init.js") {
  if (FORBIDDEN_PATTERN.test(source)) {
    throw new Error(
      `bootstrap-provenance: ${label} still hardcodes an empty embedded password ` +
        `(psql would fail with "fe_sendauth: no password supplied"). Refusing to build.`,
    );
  }
  if (!source.includes(REQUIRED_MARKER)) {
    throw new Error(
      `bootstrap-provenance: ${label} does not resolve the embedded password from ` +
        `${REQUIRED_MARKER}. Refusing to build a stale bootstrap.`,
    );
  }
  return source;
}

/** File name written next to init.js inside the payload and the install dir. */
export const PROVENANCE_FILE = "build-provenance.json";

/**
 * Verify + record provenance for a staged init.js. Returns the record.
 */
export function recordBootstrapProvenance({ initPath, version = "0.0.0-dev", commit = null }) {
  const bytes = readFileSync(initPath);
  assertBootstrapPsqlFix(bytes.toString("utf8"), initPath);
  const record = {
    file: "init.js",
    sha256: sha256(bytes),
    bytes: bytes.length,
    version,
    commit,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(join(dirname(initPath), PROVENANCE_FILE), JSON.stringify(record, null, 2) + "\n");
  return record;
}

function argOf(name, dflt = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const initPath = argOf("init");
    if (!initPath) throw new Error("bootstrap-provenance: --init <path to staged init.js> is required");
    const record = recordBootstrapProvenance({
      initPath,
      version: argOf("version", "0.0.0-dev"),
      commit: argOf("commit", null) ?? null,
    });
    console.log(`[build] bootstrap init.js sha256=${record.sha256} bytes=${record.bytes}`);
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
