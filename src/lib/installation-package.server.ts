// Server-only: assemble the Windows-only installation package (ZIP) for a
// self-hosted customer. Contents:
//   - OPSQAI-Setup.exe        Native Windows installer (NSIS + WinSW services)
//   - activation-bundle.json  Ed25519-signed license bundle
//   - README.md               Windows install guide (renderReadmeMarkdown)
//   - CHECKSUMS.sha256        SHA-256 of every file above
//
// AD-009 compliance: MC ships ONLY OPSQAI_INSTALL_ID and the signed bundle.
// The Windows installer generates local secrets during the Setup Wizard and
// stores them on the customer-owned data volume.

import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
import type { ActivationBundle } from "@/lib/license-activation.functions";
import installExeAsset from "@/assets/install-exe.asset.json";
import { renderReadmeMarkdown } from "@/lib/installation-readme.server";

// Installer binary lives in Lovable Assets (CDN) — too large for the repo.
// Fetched once per Worker instance and cached.
const binaryCache = new Map<string, Uint8Array>();

function minimumRealInstallerBytes(): number {
  return process.env.NODE_ENV === "test" ? 1 : 50 * 1024 * 1024;
}

function installerSourceUrl(): string {
  return process.env.OPSQAI_WINDOWS_INSTALLER_URL?.trim() || installExeAsset.url;
}

async function resolveOrigin(): Promise<string | null> {
  if (typeof process !== "undefined" && process.env?.OPSQAI_ASSET_ORIGIN) {
    return process.env.OPSQAI_ASSET_ORIGIN;
  }
  try {
    const mod = (await import("@tanstack/react-start/server")) as {
      getRequestUrl?: () => URL;
      getRequestHost?: () => string;
    };
    if (mod.getRequestUrl) return mod.getRequestUrl().origin;
    if (mod.getRequestHost) return `https://${mod.getRequestHost()}`;
    return null;
  } catch {
    return null;
  }
}

async function fetchAsset(url: string, localFallback: string): Promise<Uint8Array> {
  const cached = binaryCache.get(url);
  if (cached) return cached;

  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  const origin = isAbsolute ? null : await resolveOrigin();

  if (isAbsolute || origin) {
    const fullUrl = isAbsolute ? url : `${origin}${url}`;
    try {
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      binaryCache.set(url, bytes);
      return bytes;
    } catch (fetchErr) {
      try {
        const { readFileSync } = await import("node:fs");
        const bytes = new Uint8Array(readFileSync(localFallback));
        binaryCache.set(url, bytes);
        return bytes;
      } catch {
        throw new Error(`Failed to fetch installer asset ${fullUrl}: ${(fetchErr as Error).message}`);
      }
    }
  }

  try {
    const { readFileSync } = await import("node:fs");
    const bytes = new Uint8Array(readFileSync(localFallback));
    binaryCache.set(url, bytes);
    return bytes;
  } catch (err) {
    throw new Error(
      `Failed to load installer asset ${url}: no request origin and local fallback ${localFallback} unavailable (${(err as Error).message})`,
    );
  }
}

function assertRealWindowsInstaller(bytes: Uint8Array, source: string): void {
  const isPeExecutable = bytes[0] === 0x4d && bytes[1] === 0x5a;
  if (!isPeExecutable) {
    throw new Error(`windows_installer_not_ready: ${source} is not a Windows executable`);
  }
  if (bytes.byteLength < minimumRealInstallerBytes()) {
    throw new Error(
      `windows_installer_not_ready: OPSQAI-Setup.exe is only ${Math.round(bytes.byteLength / 1024 / 1024)} MB; upload the real Windows build artifact before generating packages`,
    );
  }
}

function sha256Hex(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return createHash("sha256").update(buf).digest("hex");
}

export interface BuildPackageInput {
  install_id: string;
  installer_version: string;
  company_name: string;
  bundle: ActivationBundle;
  license_server_url: string;
}

export interface BuiltPackage {
  bytes: Uint8Array;
  checksum_sha256: string;
  file_name: string;
}

/** Deterministic assembly of the Windows installation ZIP. */
export async function assembleInstallationPackage(input: BuildPackageInput): Promise<BuiltPackage> {
  const generatedAt = new Date().toISOString();

  // Native Windows installer lives in Lovable Assets (too large for the
  // repo). Fetched and cached per-Worker-instance.
  const sourceUrl = installerSourceUrl();
  const setupExe = await fetchAsset(sourceUrl, "opsqai-windows/build/artifacts/OPSQAI-Setup.exe");
  assertRealWindowsInstaller(setupExe, sourceUrl);

  const files: Record<string, Uint8Array> = {
    "OPSQAI-Setup.exe": setupExe,
    "activation-bundle.json": strToU8(JSON.stringify(input.bundle, null, 2)),
    "README.md": strToU8(
      renderReadmeMarkdown({
        install_id: input.install_id,
        installer_version: input.installer_version,
        generated_at: generatedAt,
        company_name: input.company_name,
      }),
    ),
  };

  // Deterministic CHECKSUMS.sha256 (files sorted by name)
  const names = Object.keys(files).sort();
  const checksums = names.map((n) => `${sha256Hex(files[n])}  ${n}`).join("\n") + "\n";
  files["CHECKSUMS.sha256"] = strToU8(checksums);

  const bytes = zipSync(files, { level: 6 });
  const checksum_sha256 = sha256Hex(bytes);
  const file_name = `opsqai-${input.installer_version}-${input.install_id}.zip`;
  return { bytes, checksum_sha256, file_name };
}


