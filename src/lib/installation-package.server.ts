// Server-only: assemble the Windows-only installation package (ZIP) for a
// self-hosted customer. Contents:
//   - INSTALLER.txt           Download URL + SHA-256 for OPSQAI-Setup.exe
//   - activation-bundle.jwt   Ed25519-signed license bundle (compact JWS/JWT)
//   - README.md               Windows install guide (renderReadmeMarkdown)
//   - CHECKSUMS.sha256        SHA-256 of every file above
//
// The Windows installer .exe (~329 MB) is NOT embedded here. It lives on the
// Lovable CDN and is downloaded separately by the customer. Repackaging the
// binary through a Cloudflare Worker would exceed the 128 MB memory limit
// ("Memory limit would be exceeded before EOF"), so the ZIP now carries only
// the license bundle plus a pointer to the installer download URL.
//
// AD-009 compliance: MC ships ONLY OPSQAI_INSTALL_ID and the signed bundle.
// The Windows installer generates local secrets during the Setup Wizard and
// stores them on the customer-owned data volume.

import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
import type { ActivationBundle } from "@/lib/license-activation.functions";
import installExeAsset from "@/assets/install-exe.asset.json";
import { renderReadmeMarkdown } from "@/lib/installation-readme.server";
import { signBundleAsJwt } from "@/lib/license-activation-core.server";

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

function absoluteInstallerUrl(url: string, origin: string | null): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (origin) return `${origin}${url}`;
  return `https://opsqai.de${url}`;
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
  installer_url: string;
}

/** Deterministic assembly of the Windows installation ZIP (license bundle only, no .exe). */
export async function assembleInstallationPackage(input: BuildPackageInput): Promise<BuiltPackage> {
  const generatedAt = new Date().toISOString();
  const origin = await resolveOrigin();
  const installerUrl = absoluteInstallerUrl(installerSourceUrl(), origin);
  const installerSize = installExeAsset.size ?? 0;
  const activationBundleJwt = await signBundleAsJwt(input.bundle);

  const installerTxt =
    `# OPSQAI Windows installer\n` +
    `# Download the installer binary from the URL below and place it next to this file\n` +
    `# before running Setup.\n` +
    `\n` +
    `download_url = ${installerUrl}\n` +
    `filename     = OPSQAI-Setup.exe\n` +
    `size_bytes   = ${installerSize}\n` +
    `installer_version = ${input.installer_version}\n` +
    `install_id   = ${input.install_id}\n` +
    `\n` +
    `# The installer's SHA-256 is published on https://opsqai.de/releases and validated\n` +
    `# automatically by the OPSQAI Updater service after installation.\n`;

  const files: Record<string, Uint8Array> = {
    "INSTALLER.txt": strToU8(installerTxt),
    "activation-bundle.jwt": strToU8(activationBundleJwt),
    "README.md": strToU8(
      renderReadmeMarkdown({
        install_id: input.install_id,
        installer_version: input.installer_version,
        generated_at: generatedAt,
        company_name: input.company_name,
        installer_url: installerUrl,
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
  return { bytes, checksum_sha256, file_name, installer_url: installerUrl };
}
