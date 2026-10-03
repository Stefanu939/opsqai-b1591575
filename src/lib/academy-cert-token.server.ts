// Signed, self-contained certificate tokens for Self-Hosted diplomas.
// The QR code points to the public OPSQAI site, which verifies the Ed25519
// signature without needing access to the company's local database.
import { generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export interface CertTokenPayload {
  v: 1;
  id: string; // certificate code
  n: string; // recipient
  c: string; // course
  d?: string; // department
  o: string; // organisation
  s: number; // score
  t: string; // issued (YYYY-MM-DD)
  k: string; // public key (spki DER, base64url)
}

const b64u = (b: Buffer) => b.toString("base64url");
const KEY_FILE = () =>
  path.join(process.env["ProgramData"] || "C:\\ProgramData", "OPSQAI", "config", "certificate-signing.json");

async function loadKey(): Promise<{ privPem: string; pubDer: Buffer }> {
  try {
    const j = JSON.parse(await fs.readFile(KEY_FILE(), "utf8")) as { privatePem: string };
    const priv = createPrivateKey(j.privatePem);
    return { privPem: j.privatePem, pubDer: createPublicKey(priv).export({ type: "spki", format: "der" }) as Buffer };
  } catch {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    await fs.mkdir(path.dirname(KEY_FILE()), { recursive: true });
    await fs.writeFile(KEY_FILE(), JSON.stringify({ privatePem: privPem }), { mode: 0o600 });
    return { privPem, pubDer: publicKey.export({ type: "spki", format: "der" }) as Buffer };
  }
}

export async function signCertToken(p: Omit<CertTokenPayload, "v" | "k">): Promise<string> {
  const { privPem, pubDer } = await loadKey();
  const payload: CertTokenPayload = { v: 1, ...p, k: b64u(pubDer) };
  const body = Buffer.from(JSON.stringify(payload));
  const sig = sign(null, body, createPrivateKey(privPem));
  return `${b64u(body)}.${b64u(sig)}`;
}

export function verifyCertToken(token: string): (CertTokenPayload & { keyFingerprint: string }) | null {
  const [b, s] = token.split(".");
  if (!b || !s || token.length > 4000) return null;
  try {
    const body = Buffer.from(b, "base64url");
    const payload = JSON.parse(body.toString("utf8")) as CertTokenPayload;
    if (payload.v !== 1 || !payload.k) return null;
    const der = Buffer.from(payload.k, "base64url");
    const pub = createPublicKey({ key: der, format: "der", type: "spki" });
    if (!verify(null, body, pub, Buffer.from(s, "base64url"))) return null;
    const fp = createHash("sha256").update(der).digest("hex").slice(0, 16).toUpperCase();
    return { ...payload, keyFingerprint: fp.match(/.{4}/g)!.join("-") };
  } catch {
    return null;
  }
}
