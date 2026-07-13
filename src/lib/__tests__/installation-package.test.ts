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

describe("assembleInstallationPackage", () => {
  const input = {
    install_id: "acme-prod",
    installer_version: "1.0.0",
    company_name: "Acme GmbH",
    bundle: fakeBundle("acme-prod"),
    license_server_url: "https://opsqai.de",
  };

  it("produces a ZIP that contains every required file", () => {
    const { bytes, file_name, checksum_sha256 } = assembleInstallationPackage(input);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(file_name).toBe("opsqai-1.0.0-acme-prod.zip");
    expect(checksum_sha256).toMatch(/^[0-9a-f]{64}$/);

    const files = unzipSync(bytes);
    const names = Object.keys(files).sort();
    expect(names).toEqual(
      [
        ".env.template",
        "CHECKSUMS.sha256",
        "README.md",
        "activation-bundle.json",
        "docker-compose.yml",
        "entrypoint.sh",
      ].sort(),
    );

    // Install ID and installer version are baked into compose + env
    expect(strFromU8(files["docker-compose.yml"])).toContain("acme-prod");
    expect(strFromU8(files["docker-compose.yml"])).toContain("1.0.0");
    expect(strFromU8(files[".env.template"])).toContain("OPSQAI_INSTALL_ID=acme-prod");
    expect(strFromU8(files[".env.template"])).toContain("POSTGRES_PASSWORD=__CHANGE_ME__");
    expect(strFromU8(files[".env.template"])).toContain("MINIO_ROOT_PASSWORD=__CHANGE_ME__");

    // Activation bundle is embedded verbatim
    const parsedBundle = JSON.parse(strFromU8(files["activation-bundle.json"])) as ActivationBundle;
    expect(parsedBundle.install_id).toBe("acme-prod");
    expect(parsedBundle.module_tokens).toHaveLength(1);

    // CHECKSUMS.sha256 lines follow "<hex>  <name>"
    const checksums = strFromU8(files["CHECKSUMS.sha256"]).trim().split("\n");
    expect(checksums).toHaveLength(5); // every file except CHECKSUMS.sha256 itself
    for (const line of checksums) {
      expect(line).toMatch(/^[0-9a-f]{64} {2}\S+/);
    }
  });

  it("regeneration for the same install_id keeps install_id + file name stable", () => {
    const a = assembleInstallationPackage(input);
    const b = assembleInstallationPackage(input);
    expect(a.file_name).toBe(b.file_name);
    // Content changes only via GENERATED_AT timestamp, so checksum may differ,
    // but the identity anchor (install_id) is stable.
    const filesA = unzipSync(a.bytes);
    const filesB = unzipSync(b.bytes);
    const bundleA = JSON.parse(strFromU8(filesA["activation-bundle.json"])) as ActivationBundle;
    const bundleB = JSON.parse(strFromU8(filesB["activation-bundle.json"])) as ActivationBundle;
    expect(bundleA.install_id).toBe(bundleB.install_id);
    expect(bundleA.install_id).toBe("acme-prod");
  });

  it("README announces the correct install_id and installer version", () => {
    const { bytes } = assembleInstallationPackage(input);
    const files = unzipSync(bytes);
    const readme = strFromU8(files["README.md"]);
    expect(readme).toContain("Install ID: **acme-prod**");
    expect(readme).toContain("Installer version: 1.0.0");
    expect(readme).toContain("Acme GmbH");
  });

  it("entrypoint.sh generates infra secrets on first boot", () => {
    const { bytes } = assembleInstallationPackage(input);
    const files = unzipSync(bytes);
    const sh = strFromU8(files["entrypoint.sh"]);
    expect(sh).toContain("POSTGRES_PASSWORD");
    expect(sh).toContain("MINIO_ROOT_PASSWORD");
    expect(sh).toContain("__CHANGE_ME__");
    expect(sh).toContain("/dev/urandom");
  });
});
