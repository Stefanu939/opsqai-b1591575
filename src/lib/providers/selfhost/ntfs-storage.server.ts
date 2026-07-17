// NTFS-backed IStorageProvider for OPSQAI Self-Hosted.
//
// All bytes live under a base directory chosen by the installer (default:
// %ProgramData%\OPSQAI\storage\). Buckets map to sub-directories; keys
// map to file paths. Windows ACLs restrict the base directory to
// LocalSystem + Administrators + the OPSQAI service account.
//
// No cloud dependency. No S3. Bytes never leave the machine.

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import type {
  IStorageProvider,
  StorageObject,
  StoragePutInput,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

export interface NtfsStorageDeps {
  /** Absolute Windows path, e.g. `C:\\ProgramData\\OPSQAI\\storage`. */
  baseDir: string;
}

// Reject path traversal: keys must be plain forward-slash paths with no
// `..` segments and no drive letters. Absolute paths and traversal are
// the two ways an attacker could escape the base directory.
function assertSafeKey(key: string): void {
  if (!key || key.length > 512) throw new Error("Invalid storage key length");
  if (/[\x00-\x1f]/.test(key)) throw new Error("Invalid storage key characters");
  if (/^[A-Za-z]:/.test(key)) throw new Error("Storage key may not contain a drive letter");
  if (key.startsWith("/") || key.startsWith("\\")) {
    throw new Error("Storage key must be relative");
  }
  const parts = key.replace(/\\/g, "/").split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) {
    throw new Error("Storage key contains a forbidden segment");
  }
}

function assertSafeBucket(bucket: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(bucket)) {
    throw new Error(`Invalid bucket name: ${bucket}`);
  }
}

async function streamToBuffer(
  body: Uint8Array | ReadableStream<Uint8Array>,
): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export function createNtfsStorageProvider(deps: NtfsStorageDeps): IStorageProvider {
  const baseDir = path.resolve(deps.baseDir);

  function resolvePath(bucket: string, key: string): string {
    assertSafeBucket(bucket);
    assertSafeKey(key);
    const resolved = path.resolve(baseDir, bucket, key);
    // Belt and braces — refuse anything that resolves outside baseDir.
    const rel = path.relative(baseDir, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("Resolved storage path escapes base directory");
    }
    return resolved;
  }

  async function statObject(bucket: string, key: string, filePath: string): Promise<StorageObject> {
    const st = await fs.stat(filePath);
    return {
      bucket,
      key,
      size: st.size,
      contentType: null,
      updatedAt: st.mtime.toISOString(),
    };
  }

  return {
    capability: Capability.Storage,
    name: "opsqai.selfhost.ntfs-storage",

    async put(input: StoragePutInput): Promise<StorageObject> {
      const target = resolvePath(input.bucket, input.key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const buf = await streamToBuffer(input.body);
      // Atomic-ish write: temp file + rename. NTFS rename is atomic when
      // source and target live in the same directory.
      const tmp = `${target}.tmp-${createHash("sha256")
        .update(String(Date.now()))
        .digest("hex")
        .slice(0, 8)}`;
      await fs.writeFile(tmp, buf, { mode: 0o600 });
      await fs.rename(tmp, target);
      return statObject(input.bucket, input.key, target);
    },

    async get(bucket, key) {
      const target = resolvePath(bucket, key);
      const buf = await fs.readFile(target);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    },

    async delete(bucket, key) {
      const target = resolvePath(bucket, key);
      await fs.rm(target, { force: true });
    },

    async head(bucket, key) {
      const target = resolvePath(bucket, key);
      try {
        return await statObject(bucket, key, target);
      } catch {
        return null;
      }
    },

    async probe() {
      const probeName = `.opsqai-probe-${Date.now()}`;
      const probePath = path.resolve(baseDir, probeName);
      try {
        await fs.mkdir(baseDir, { recursive: true });
        await fs.writeFile(probePath, "ok", { mode: 0o600 });
        const roundtrip = await fs.readFile(probePath, "utf8");
        await fs.rm(probePath, { force: true });
        return { ok: roundtrip === "ok" };
      } catch (err) {
        return { ok: false, detail: (err as Error).message };
      }
    },
  };
}
