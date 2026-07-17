import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearMyAvatarPath,
  getMyAvatarPath,
  setMyAvatarPath,
} from "@/lib/profile.functions";

const SIGNED_TTL_SECONDS = 60 * 60; // 1h — refreshed on mount

/**
 * Resolve a `profiles.avatar_url` value (a storage path inside the `avatars`
 * bucket, e.g. `{userId}/avatar-1234.jpg`) to a viewable signed URL. Returns
 * `null` for missing / not-yet-resolved paths.
 */
export function useAvatarUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    // Legacy: allow full https URLs to pass through unchanged.
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, SIGNED_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        setUrl(error || !data?.signedUrl ? null : data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}

/** Fetch initials from a full name, email, or fallback. */
export function initialsOf(input: {
  fullName?: string | null;
  email?: string | null;
}): string {
  const name = (input.fullName || "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || first.toUpperCase() || "??";
  }
  const email = (input.email || "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "OP";
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export interface UploadAvatarResult {
  path: string;
}

/**
 * Upload an avatar for the current user to `avatars/{userId}/avatar-{ts}.{ext}`
 * and update `profiles.avatar_url` with the storage path.
 */
export async function uploadMyAvatar(
  file: File,
  userId: string,
): Promise<UploadAvatarResult> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 2MB.");
  }
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (upErr) throw upErr;

  const { error: profErr } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", userId);
  if (profErr) throw profErr;

  return { path };
}

/** Clear the current user's avatar (removes the DB pointer; file left for history). */
export async function clearMyAvatar(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);
  if (error) throw error;
}

/** Read `profiles.avatar_url` for the given user id. */
export async function readAvatarPath(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return (data?.avatar_url as string | null) ?? null;
}
