// Envelope encryption for license signing private keys.
//
// The private_key_pem values in `license_signing_keys` are encrypted at rest
// with AES-256-GCM using a Key-Encryption-Key (KEK) held only in the runtime
// secret `LICENSE_SIGNING_KEK`. This provides separation of duties: a
// compromised platform_admin account with database read access cannot recover
// the raw Ed25519 signing key without also compromising the Worker runtime
// secrets store.
//
// Wire format (stored in the same `private_key_pem` TEXT column):
//   enc.v1.<ivB64>.<ciphertextB64>.<tagB64>
//
// Legacy plaintext PEMs (rows written before this change) are still accepted
// on read and transparently re-encrypted the next time the key is loaded.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc.v1.";

function getKek(): Buffer {
  const raw = process.env.LICENSE_SIGNING_KEK;
  if (!raw) {
    throw new Error(
      "LICENSE_SIGNING_KEK is not set — cannot encrypt/decrypt license signing keys.",
    );
  }
  // Derive a stable 32-byte key from the secret regardless of its textual form.
  return createHash("sha256").update(raw, "utf8").digest();
}

const b64 = (b: Buffer) => b.toString("base64");
const b64d = (s: string) => Buffer.from(s, "base64");

export function isEncryptedPem(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptPem(plaintextPem: string): string {
  const key = getKek();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintextPem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${b64(iv)}.${b64(ct)}.${b64(tag)}`;
}

export function decryptPem(stored: string): string {
  if (!isEncryptedPem(stored)) {
    // Legacy plaintext row — return as-is; caller may re-encrypt.
    return stored;
  }
  const rest = stored.slice(PREFIX.length);
  const parts = rest.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted PEM envelope");
  }
  const [ivB64, ctB64, tagB64] = parts;
  const key = getKek();
  const decipher = createDecipheriv("aes-256-gcm", key, b64d(ivB64));
  decipher.setAuthTag(b64d(tagB64));
  const pt = Buffer.concat([decipher.update(b64d(ctB64)), decipher.final()]);
  return pt.toString("utf8");
}
