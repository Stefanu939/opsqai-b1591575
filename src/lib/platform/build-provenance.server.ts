// Server-side reader for the post-build provenance record.
//
// build.ps1 writes payload\app\build-provenance.json (see
// opsqai-windows/build/frontend-provenance.mjs) and the installer copies the
// whole app directory verbatim, so the installed record is byte-identical to
// the build output. verify-install-layout.ps1 asserts that.
//
// This module is server-only (it touches node:fs). It is imported dynamically
// from the health route handler so it never enters the client graph.

import { BUILD_COMMIT, BUILD_VERSION, formatBuildLabel, type BuildProvenance } from "@/lib/build-info";

const FILE = "build-provenance.json";

let cached: BuildProvenance | null = null;
let logged = false;

function candidatePaths(cwd: string, sep: string): string[] {
  const join = (...parts: string[]) => parts.join(sep);
  const fromEnv = process.env["OPSQAI_APP_DIR"];
  const list = [
    join(cwd, FILE),
    join(cwd, "..", FILE),
    join(cwd, "app", FILE),
    join(cwd, "..", "..", FILE),
  ];
  if (fromEnv) list.unshift(join(fromEnv, FILE));
  return list;
}

/**
 * Read the provenance record shipped beside the built app. Falls back to the
 * embedded version/commit with a null hash when the record is absent (dev
 * server, Cloud deployment) — never throws.
 */
export async function readBuildProvenance(): Promise<BuildProvenance> {
  if (cached) return cached;
  let record: BuildProvenance = { version: BUILD_VERSION, commit: BUILD_COMMIT, buildHash: null };
  try {
    const [{ readFileSync, existsSync }, { sep }] = await Promise.all([
      import("node:fs"),
      import("node:path"),
    ]);
    for (const path of candidatePaths(process.cwd(), sep)) {
      if (!existsSync(path)) continue;
      const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw) as Partial<BuildProvenance>;
      record = {
        version: parsed.version || BUILD_VERSION,
        commit: parsed.commit || BUILD_COMMIT,
        buildHash: parsed.buildHash ?? null,
        serverEntrySha256: parsed.serverEntrySha256 ?? null,
        generatedAt: parsed.generatedAt ?? null,
      };
      break;
    }
  } catch {
    // keep the embedded fallback
  }
  cached = record;
  if (!logged) {
    logged = true;
    // Single startup line so the platform service log proves which frontend is
    // running, comparable against the CI build log.
    console.log(`[provenance] frontend ${formatBuildLabel(record)}`);
  }
  return record;
}

export function __resetBuildProvenanceCacheForTests(): void {
  cached = null;
  logged = false;
}
