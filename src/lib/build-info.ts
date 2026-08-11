// Frontend/server build provenance — embedded at build time.
//
// Step 1 of the forensic audit. Without this it is impossible to prove that an
// installed Self-Hosted EXE actually contains the source that was tested: a
// stale packed artifact looks identical to a fresh one.
//
// Version + commit are injected as VITE_* env vars by build.ps1 (and CI) and
// statically replaced by Vite, so they end up inside BOTH the client bundle and
// the server bundle. The content hash cannot be embedded (it is a hash *of* the
// build output), so it is recorded post-build into build-provenance.json next
// to the staged app and read at runtime by the server — see
// src/lib/platform/build-provenance.server.ts.
//
// Direct property access on import.meta.env is deliberate: reading the whole
// object would make Vite inline every VITE_* var into the bundle.

export interface EmbeddedBuildInfo {
  /** Semantic version of the installer/app build (e.g. "1.0.3"). */
  version: string;
  /** Full git commit SHA, or "unknown" outside CI. */
  commit: string;
}

export interface BuildProvenance extends EmbeddedBuildInfo {
  /** SHA-256 over the built server entry + the public asset manifest. */
  buildHash: string | null;
  /** SHA-256 of the built server entry alone. */
  serverEntrySha256?: string | null;
  /** ISO timestamp the provenance record was written. */
  generatedAt?: string | null;
}

export const BUILD_VERSION: string =
  (import.meta.env.VITE_OPSQAI_BUILD_VERSION as string | undefined) || "0.0.0-dev";

export const BUILD_COMMIT: string =
  (import.meta.env.VITE_OPSQAI_BUILD_COMMIT as string | undefined) || "unknown";

export function getEmbeddedBuildInfo(): EmbeddedBuildInfo {
  return { version: BUILD_VERSION, commit: BUILD_COMMIT };
}

export function shortCommit(commit: string | null | undefined): string {
  if (!commit || commit === "unknown") return "unknown";
  return commit.slice(0, 7);
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "unrecorded";
  return hash.slice(0, 12);
}

/** One-line human label, used in the app shell and in the startup log. */
export function formatBuildLabel(p: Partial<BuildProvenance>): string {
  const version = p.version || BUILD_VERSION;
  return `v${version} · ${shortCommit(p.commit ?? BUILD_COMMIT)} · ${shortHash(p.buildHash)}`;
}
