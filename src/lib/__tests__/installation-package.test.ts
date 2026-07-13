import { describe, it, expect } from "vitest";
import { assembleInstallationPackage } from "@/lib/installation-package.server";
import { unzipSync, strFromU8 } from "fflate";
import type { ActivationBundle } from "@/lib/license-activation.functions";

function fakeBundle(install_id: string): ActivationBundle {
  return {
    bundle_version: 1,
    install_id,
    public_key_pem: "-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----",
    key_id: "ed25519-fake",
    install_token: "opsqai.v1.fakepayload.fakesig",
    module_tokens: [{ module_key: "chat", signed_token: "opsqai.v1.mod.sig" }],
    crl_token: "opsqai-crl.v1.fake.crl",
    issued_at: 1_700_000_000,
  };
}

describe("assembleInstallationPackage (Windows-only)", () => {
  const input = {
    install_id: "acme-prod",
    installer_version: "1.0.0",
    company_name: "Acme GmbH",
    bundle: fakeBundle("acme-prod"),
    license_server_url: "https://opsqai.de",
  };

  it("produces a Windows-only ZIP with exactly the expected files", async () => {
    const { bytes, file_name, checksum_sha256 } = await assembleInstallationPackage(input);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(file_name).toBe("opsqai-1.0.0-acme-prod.zip");
    expect(checksum_sha256).toMatch(/^[0-9a-f]{64}$/);

    const files = unzipSync(bytes);
    const names = Object.keys(files).sort();
    expect(names).toEqual(
      ["CHECKSUMS.sha256", "OPSQAI-Setup.exe", "README.md", "activation-bundle.json"].sort(),
    );

    // No Docker / Linux / macOS artifacts must leak into the Windows package.
    for (const forbidden of [
      "docker-compose.yml",
      ".env.template",
      "entrypoint.sh",
      "install.sh",
      "install-windows.cmd",
      "install.exe",
      "install-macos",
      "install-linux",
      "README.pdf",
    ]) {
      expect(files[forbidden]).toBeUndefined();
    }

    // Activation bundle is embedded verbatim
    const parsedBundle = JSON.parse(strFromU8(files["activation-bundle.json"])) as ActivationBundle;
    expect(parsedBundle.install_id).toBe("acme-prod");
    expect(parsedBundle.module_tokens).toHaveLength(1);

    // The Windows installer binary is present.
    expect(files["OPSQAI-Setup.exe"].byteLength).toBeGreaterThan(0);

    // README is Markdown, Windows-focused.
    const readme = strFromU8(files["README.md"]);
    expect(readme).toContain("OPSQAI-Setup.exe");
    expect(readme).toContain("Windows");
    expect(readme).toContain("acme-prod");
    expect(readme).not.toContain("docker compose");

    // CHECKSUMS.sha256 lines follow "<hex>  <name>"
    const checksums = strFromU8(files["CHECKSUMS.sha256"]).trim().split("\n");
    expect(checksums).toHaveLength(3); // every file except CHECKSUMS.sha256 itself
    for (const line of checksums) {
      expect(line).toMatch(/^[0-9a-f]{64} {2}\S+/);
    }
  });

  it("regeneration for the same install_id keeps install_id + file name stable", async () => {
    const a = await assembleInstallationPackage(input);
    const b = await assembleInstallationPackage(input);
    expect(a.file_name).toBe(b.file_name);
    const filesA = unzipSync(a.bytes);
    const filesB = unzipSync(b.bytes);
    const bundleA = JSON.parse(strFromU8(filesA["activation-bundle.json"])) as ActivationBundle;
    const bundleB = JSON.parse(strFromU8(filesB["activation-bundle.json"])) as ActivationBundle;
    expect(bundleA.install_id).toBe(bundleB.install_id);
    expect(bundleA.install_id).toBe("acme-prod");
  });
});
