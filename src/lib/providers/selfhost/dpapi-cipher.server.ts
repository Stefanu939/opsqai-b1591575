// Windows DPAPI-backed ISecretsCipher for OPSQAI Self-Hosted.
//
// Wraps `System.Security.Cryptography.ProtectedData` (LocalMachine scope)
// via `PowerShell` so encryption keys never leave Windows credential
// storage. The ciphertext is machine-bound — a stolen database file on
// its own cannot be decrypted on a different Windows host.
//
// For pure-AES-GCM fallback (e.g. for portable dev machines or unit
// tests) use `createAesGcmCipher` — it takes a 32-byte key that the
// installer generates and stores under Credential Manager.

import { spawn } from "node:child_process";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { ISecretsCipher } from "@/lib/providers/interfaces";

// --------------------------------------------------------------------
// Portable AES-256-GCM cipher (used as a fallback and for tests).
// --------------------------------------------------------------------

const GCM_IV_LEN = 12;
const GCM_TAG_LEN = 16;
const CANARY_PLAINTEXT = "opsqai-canary-v1";

export interface AesGcmCipherDeps {
  /** 32-byte master key (installer generates and stores in Credential Manager). */
  key: Uint8Array;
  /**
   * Encrypted canary blob written at install time. Used by `verifyCanary`
   * to detect key drift (e.g. wrong Credential Manager entry restored).
   */
  canary?: Uint8Array;
}

export function createAesGcmCipher(deps: AesGcmCipherDeps): ISecretsCipher {
  if (deps.key.byteLength !== 32) {
    throw new Error("AES-GCM cipher requires a 32-byte key");
  }
  const key = Buffer.from(deps.key);

  async function encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    const iv = randomBytes(GCM_IV_LEN);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
    const tag = cipher.getAuthTag();
    return new Uint8Array(Buffer.concat([iv, tag, enc]));
  }

  async function decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    const buf = Buffer.from(ciphertext);
    if (buf.length < GCM_IV_LEN + GCM_TAG_LEN) throw new Error("Ciphertext too short");
    const iv = buf.subarray(0, GCM_IV_LEN);
    const tag = buf.subarray(GCM_IV_LEN, GCM_IV_LEN + GCM_TAG_LEN);
    const enc = buf.subarray(GCM_IV_LEN + GCM_TAG_LEN);
    const dec = createDecipheriv("aes-256-gcm", key, iv);
    dec.setAuthTag(tag);
    return new Uint8Array(Buffer.concat([dec.update(enc), dec.final()]));
  }

  return {
    encrypt,
    decrypt,
    async verifyCanary(): Promise<boolean> {
      if (!deps.canary) return true; // No canary provisioned yet.
      try {
        const plain = Buffer.from(await decrypt(deps.canary));
        const expected = Buffer.from(CANARY_PLAINTEXT, "utf8");
        return plain.length === expected.length && timingSafeEqual(plain, expected);
      } catch {
        return false;
      }
    },
  };
}

/** Convenience for installer: mint the canary blob for a new cipher. */
export async function mintCanary(cipher: ISecretsCipher): Promise<Uint8Array> {
  return cipher.encrypt(Buffer.from(CANARY_PLAINTEXT, "utf8"));
}

// --------------------------------------------------------------------
// Windows DPAPI cipher (production Self-Hosted default).
// --------------------------------------------------------------------

function runPowerShell(script: string, stdin?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true },
    );
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.stderr.on("data", (c: Buffer) => errChunks.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`powershell exit ${code}: ${Buffer.concat(errChunks).toString()}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    if (stdin) {
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
}

export interface DpapiCipherDeps {
  /**
   * Additional entropy mixed into every ProtectData call. Not a secret —
   * a domain separator so accidental cross-application decryption fails.
   */
  entropy: Uint8Array;
  canary?: Uint8Array;
}

export function createDpapiCipher(deps: DpapiCipherDeps): ISecretsCipher {
  if (process.platform !== "win32") {
    throw new Error("DPAPI cipher is only available on Windows");
  }
  const entropyB64 = Buffer.from(deps.entropy).toString("base64");

  async function encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    const inputB64 = Buffer.from(plaintext).toString("base64");
    // LocalMachine scope: any process on the machine running as an
    // allowed account can decrypt. That is exactly what we want for the
    // OPSQAI Windows service.
    const script = `
      $bytes = [Convert]::FromBase64String("${inputB64}");
      $entropy = [Convert]::FromBase64String("${entropyB64}");
      $enc = [System.Security.Cryptography.ProtectedData]::Protect(
        $bytes, $entropy, [System.Security.Cryptography.DataProtectionScope]::LocalMachine);
      [Convert]::ToBase64String($enc)
    `;
    const out = await runPowerShell(script);
    return new Uint8Array(Buffer.from(out.toString("utf8").trim(), "base64"));
  }

  async function decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    const inputB64 = Buffer.from(ciphertext).toString("base64");
    const script = `
      $bytes = [Convert]::FromBase64String("${inputB64}");
      $entropy = [Convert]::FromBase64String("${entropyB64}");
      $dec = [System.Security.Cryptography.ProtectedData]::Unprotect(
        $bytes, $entropy, [System.Security.Cryptography.DataProtectionScope]::LocalMachine);
      [Convert]::ToBase64String($dec)
    `;
    const out = await runPowerShell(script);
    return new Uint8Array(Buffer.from(out.toString("utf8").trim(), "base64"));
  }

  return {
    encrypt,
    decrypt,
    async verifyCanary(): Promise<boolean> {
      if (!deps.canary) return true;
      try {
        const plain = Buffer.from(await decrypt(deps.canary));
        const expected = Buffer.from(CANARY_PLAINTEXT, "utf8");
        return plain.length === expected.length && timingSafeEqual(plain, expected);
      } catch {
        return false;
      }
    },
  };
}
