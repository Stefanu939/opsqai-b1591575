// Supabase-backed IStorageProvider for OPSQAI Cloud. Cloud-only.

import type {
  IStorageProvider,
  StorageObject,
  StoragePutInput,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function createSupabaseStorageProvider(): IStorageProvider {
  return {
    capability: Capability.Storage,
    name: "opsqai.cloud.supabase-storage",

    async put(input: StoragePutInput): Promise<StorageObject> {
      const client = await admin();
      const body =
        input.body instanceof Uint8Array
          ? Buffer.from(input.body)
          : (input.body as unknown as ReadableStream);
      const { error } = await client.storage
        .from(input.bucket)
        .upload(input.key, body as Blob, {
          upsert: true,
          contentType: input.contentType,
        });
      if (error) throw error;
      const head = await this.head(input.bucket, input.key);
      if (!head) throw new Error("Storage upload succeeded but head returned null");
      return head;
    },

    async get(bucket, key) {
      const client = await admin();
      const { data, error } = await client.storage.from(bucket).download(key);
      if (error || !data) throw error ?? new Error("Not found");
      const buf = new Uint8Array(await data.arrayBuffer());
      return buf;
    },

    async delete(bucket, key) {
      const client = await admin();
      const { error } = await client.storage.from(bucket).remove([key]);
      if (error) throw error;
    },

    async head(bucket, key) {
      const client = await admin();
      const dir = key.includes("/") ? key.slice(0, key.lastIndexOf("/")) : "";
      const name = key.slice(key.lastIndexOf("/") + 1);
      const { data, error } = await client.storage.from(bucket).list(dir);
      if (error) throw error;
      const match = data?.find((f) => f.name === name);
      if (!match) return null;
      return {
        bucket,
        key,
        size: (match.metadata?.size as number) ?? 0,
        contentType: (match.metadata?.mimetype as string) ?? null,
        updatedAt: match.updated_at ?? new Date().toISOString(),
      };
    },

    async probe() {
      try {
        const client = await admin();
        const { error } = await client.storage.listBuckets();
        return error ? { ok: false, detail: error.message } : { ok: true };
      } catch (err) {
        return { ok: false, detail: (err as Error).message };
      }
    },
  };
}
