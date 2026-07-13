// Server-only: resolve the latest Windows installer EXE by polling the
// public GitHub Releases API for the OPSQAI repo. The workflow attaches
// OPSQAI-Setup-<version>.zip to each `V.*` release; we fetch that ZIP,
// extract the single OPSQAI-Setup.exe entry, and hand back its bytes.
//
// No webhook or CI-side push is required — each build appearing on GitHub
// automatically becomes the source of truth on the next uncached lookup.
// A DB audit row is upserted per observed release for traceability.

import { unzipSync } from "fflate";

const DEFAULT_REPO = "Stefanu939/opsqai-b1591575";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes per Worker instance
const MIN_EXE_BYTES = 50 * 1024 * 1024;

interface GithubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

interface GithubRelease {
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: GithubReleaseAsset[];
}

export interface ResolvedInstaller {
  version: string;
  tag_name: string;
  zip_url: string;
  exe_bytes: Uint8Array;
  exe_size: number;
  source: "github" | "cache";
}

interface CacheEntry {
  fetchedAt: number;
  installer: ResolvedInstaller;
}

const cache = new Map<string, CacheEntry>();

function repoSlug(): string {
  return (process.env.OPSQAI_GITHUB_REPO?.trim() || DEFAULT_REPO).replace(/^\/+|\/+$/g, "");
}

function versionFromTag(tag: string): string {
  return tag.replace(/^v\.?/i, "");
}

function pickInstallerAsset(release: GithubRelease): GithubReleaseAsset | null {
  // Prefer an OPSQAI-Setup-*.zip asset; fall back to any .zip attached.
  const named = release.assets.find(
    (a) => /^OPSQAI-Setup.*\.zip$/i.test(a.name) && a.size > MIN_EXE_BYTES / 2,
  );
  if (named) return named;
  return release.assets.find((a) => a.name.toLowerCase().endsWith(".zip")) ?? null;
}

async function fetchLatestReleaseMeta(repo: string): Promise<GithubRelease | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "opsqai-lovable-installer-sync",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`github_releases_api_failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as GithubRelease;
}

async function fetchZipBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "User-Agent": "opsqai-lovable-installer-sync" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`installer_zip_download_failed: ${res.status} ${url}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

function extractSetupExe(zipBytes: Uint8Array): Uint8Array {
  const files = unzipSync(zipBytes, {
    filter: (f) => /OPSQAI-Setup.*\.exe$/i.test(f.name),
  });
  const entries = Object.entries(files);
  if (entries.length === 0) {
    throw new Error("installer_zip_missing_exe: no OPSQAI-Setup*.exe inside archive");
  }
  // Pick the largest matching entry (most likely the real installer).
  entries.sort((a, b) => b[1].byteLength - a[1].byteLength);
  const [, bytes] = entries[0];
  if (bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
    throw new Error("installer_zip_invalid_exe: extracted file is not a PE executable");
  }
  return bytes;
}

async function upsertAuditRow(release: GithubRelease, asset: GithubReleaseAsset, exeSize: number) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const version = versionFromTag(release.tag_name);
    await supabaseAdmin
      .from("installer_releases")
      .upsert(
        {
          version,
          tag_name: release.tag_name,
          zip_url: asset.browser_download_url,
          zip_size_bytes: asset.size,
          exe_size_bytes: exeSize,
          published_at: release.published_at,
          is_active: true,
        },
        { onConflict: "version" },
      );
    // Deactivate older releases so `is_active` reflects only the newest observed.
    await supabaseAdmin
      .from("installer_releases")
      .update({ is_active: false })
      .neq("version", version);
  } catch (err) {
    // Audit failures must never block package generation.
    console.warn("installer_release_audit_upsert_failed", (err as Error).message);
  }
}

/**
 * Resolve the newest OPSQAI-Setup.exe from GitHub Releases. Returns null when
 * no eligible release exists (caller should fall back to bundled asset).
 * Cached per Worker instance for CACHE_TTL_MS.
 */
export async function resolveLatestInstaller(): Promise<ResolvedInstaller | null> {
  const repo = repoSlug();
  const cached = cache.get(repo);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached.installer, source: "cache" };
  }

  const release = await fetchLatestReleaseMeta(repo);
  if (!release || release.draft) return null;

  const asset = pickInstallerAsset(release);
  if (!asset) return null;

  const zipBytes = await fetchZipBytes(asset.browser_download_url);
  const exeBytes = extractSetupExe(zipBytes);

  if (exeBytes.byteLength < MIN_EXE_BYTES) {
    throw new Error(
      `installer_zip_too_small: extracted EXE is ${exeBytes.byteLength} bytes (< ${MIN_EXE_BYTES})`,
    );
  }

  const installer: ResolvedInstaller = {
    version: versionFromTag(release.tag_name),
    tag_name: release.tag_name,
    zip_url: asset.browser_download_url,
    exe_bytes: exeBytes,
    exe_size: exeBytes.byteLength,
    source: "github",
  };

  cache.set(repo, { fetchedAt: Date.now(), installer });
  // Fire-and-forget audit; do not await.
  void upsertAuditRow(release, asset, exeBytes.byteLength);

  return installer;
}

export function clearInstallerCache() {
  cache.clear();
}
