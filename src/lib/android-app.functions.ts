// Android app (TWA) download for any signed-in user — staff (MC) and
// customers (Portal). Returns a short-lived signed link to the latest APK.
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";

export type AndroidAppInfo = {
  available: boolean;
  version: string | null;
  sha256: string | null;
  uploaded_at: string | null;
  url: string | null;
};

export const getAndroidAppDownload = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async (): Promise<AndroidAppInfo> => {
    const empty: AndroidAppInfo = { available: false, version: null, sha256: null, uploaded_at: null, url: null };
    if (process.env["OPSQAI_MODE"] === "selfhost") return empty;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("releases");
    const { data: metaBlob } = await bucket.download("android/latest.json");
    if (!metaBlob) return empty;
    let meta: { version?: string; sha256?: string; uploaded_at?: string } = {};
    try {
      meta = JSON.parse(await metaBlob.text());
    } catch {
      return empty;
    }
    const { data } = await bucket.createSignedUrl("android/opsqai.apk", 60 * 30, {
      download: `OPSQAI-${meta.version ?? "android"}.apk`,
    });
    if (!data?.signedUrl) return empty;
    return {
      available: true,
      version: meta.version ?? null,
      sha256: meta.sha256 ?? null,
      uploaded_at: meta.uploaded_at ?? null,
      url: data.signedUrl,
    };
  });
